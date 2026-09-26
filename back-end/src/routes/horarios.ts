import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../middleware/auth'

export function createHorariosRouter(db = prisma) {
  const router = Router()
  router.get('/', async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.query.plano)
    if (!id.success) { res.status(400).json({ erro: 'Plano inválido.' }); return }
    res.json(await db.horario.findMany({ where: { id_plano: id.data, ativo: true, plano: { ativo: true }, data_hora: { gt: new Date() }, agendamentos: { none: { status: { in: ['Pendente', 'Confirmado'] } } } }, orderBy: { data_hora: 'asc' } }))
  })
  router.get('/gestao', authenticate('admin', db), async (_req, res) => {
    res.json(await db.horario.findMany({ include: { plano: { select: { nome_plano: true } }, _count: { select: { agendamentos: { where: { status: { in: ['Pendente', 'Confirmado'] } } } } } }, orderBy: { data_hora: 'desc' } }))
  })
  router.post('/', authenticate('admin', db), async (req, res) => {
    const parsed = z.object({ id_plano: z.number().int().positive(), data_hora: z.string().datetime({ offset: true }).transform(x => new Date(x)).refine(x => x > new Date()) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Selecione um plano e uma data futura.' }); return }
    const plano = await db.plano.findFirst({ where: { id_plano: parsed.data.id_plano, ativo: true } })
    if (!plano) { res.status(400).json({ erro: 'Plano indisponível.' }); return }
    res.status(201).json(await db.horario.create({ data: parsed.data }))
  })
  router.patch('/:id', authenticate('admin', db), async (req, res) => {
    const id = z.coerce.number().int().positive().safeParse(req.params.id)
    const body = z.object({ ativo: z.boolean() }).safeParse(req.body)
    if (!id.success || !body.success) { res.status(400).json({ erro: 'Dados inválidos.' }); return }
    const result = await db.$transaction(async tx => tx.horario.updateMany({
      where: { id_horario: id.data, data_hora: { gt: new Date() }, agendamentos: { none: { status: { in: ['Pendente', 'Confirmado'] } } } }, data: body.data,
    }), { isolationLevel: 'Serializable' })
    if (!result.count) { res.status(409).json({ erro: 'Horário ocupado, passado ou inexistente. Trate o agendamento antes.' }); return }
    res.json({ ok: true })
  })
  return router
}
export default createHorariosRouter()
