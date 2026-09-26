import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../middleware/auth'

const include = { plano: { select: { nome_plano: true } }, horario: { select: { data_hora: true } }, admin: { select: { nome: true } } } as const
const live = ['Pendente', 'Confirmado'] as const

export function createAgendamentosRouter(db = prisma) {
  const router = Router()
  router.get('/meus', authenticate('cliente', db), async (_req, res) => {
    res.json(await db.agendamento.findMany({ where: { id_cliente: res.locals.auth.id }, include, orderBy: { criado_em: 'desc' } }))
  })
  router.post('/', authenticate('cliente', db), async (req, res) => {
    const parsed = z.object({ id_horario: z.number().int().positive(), observacao_cliente: z.string().trim().max(500).default('') }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Selecione um horário e use até 500 caracteres na observação.' }); return }
    try {
      // Serialização evita reservar simultaneamente um horário que está sendo desativado.
      const created = await db.$transaction(async tx => {
        const horario = await tx.horario.findFirst({ where: { id_horario: parsed.data.id_horario, ativo: true, data_hora: { gt: new Date() }, plano: { ativo: true } } })
        if (!horario) return null
        return tx.agendamento.create({ data: { ...parsed.data, id_cliente: res.locals.auth.id, id_plano: horario.id_plano }, include })
      }, { isolationLevel: 'Serializable' })
      if (!created) { res.status(409).json({ erro: 'Este horário não está mais disponível.' }); return }
      res.status(201).json(created)
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && ['P2002', 'P2034'].includes(String(error.code))) {
        res.status(409).json({ erro: 'A vaga acabou de ser reservada. Escolha outro horário.' }); return
      }
      throw error
    }
  })
  router.patch('/:id/cancelar', authenticate('cliente', db), async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ erro: 'Agendamento inválido.' }); return }
    const result = await db.agendamento.updateMany({
      where: { id_agendamento: String(req.params.id), id_cliente: res.locals.auth.id, status: { in: [...live] }, horario: { data_hora: { gt: new Date() } } },
      data: { status: 'Cancelado' },
    })
    if (!result.count) { res.status(409).json({ erro: 'Agendamento não encontrado ou não pode mais ser cancelado.' }); return }
    res.json({ ok: true })
  })
  router.get('/', authenticate('admin', db), async (_req, res) => {
    res.json(await db.agendamento.findMany({ include: { ...include, cliente: { select: { nome: true, email: true } } }, orderBy: { criado_em: 'desc' } }))
  })
  router.patch('/:id/resposta', authenticate('admin', db), async (req, res) => {
    const parsed = z.object({ status: z.enum(['Confirmado', 'Recusado', 'Cancelado']), resposta_admin: z.string().trim().min(1).max(1000) }).safeParse(req.body)
    if (!parsed.success || !z.string().uuid().safeParse(req.params.id).success) { res.status(400).json({ erro: 'Informe status e uma resposta de até 1000 caracteres.' }); return }
    const result = await db.agendamento.updateMany({
      where: { id_agendamento: String(req.params.id), status: parsed.data.status === 'Confirmado' || parsed.data.status === 'Recusado' ? 'Pendente' : { in: [...live] }, horario: { data_hora: { gt: new Date() } } },
      data: { ...parsed.data, id_admin: res.locals.auth.id, respondido_em: new Date() },
    })
    if (!result.count) { res.status(409).json({ erro: 'O agendamento já mudou de status ou o horário passou. Atualize a lista.' }); return }
    res.json({ ok: true })
  })
  return router
}
export default createAgendamentosRouter()
