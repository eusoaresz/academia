import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../middleware/auth'
import type { Prisma } from '../../generated/prisma'

const pagarSchema = z.object({ metodo: z.enum(['PIX', 'Cartao', 'Dinheiro']) })
const escolherSchema = z.object({
  id_plano: z.number().int().positive(),
  nome: z.string().trim().min(2).max(30).optional(),
  data_nascimento: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
})
const planoFields = { id_plano: true, nome_plano: true, descricao: true, duracao_meses: true, valor_plano: true } as const

// Plano do aluno ligado à conta do cliente e pagamentos dele. O valor vem sempre do plano cadastrado, nunca do navegador.
export function createMeuPlanoRouter(db = prisma) {
  const router = Router()
  router.use(authenticate('cliente', db))

  async function carregar(idCliente: string, conn: Prisma.TransactionClient = db) {
    const aluno = await conn.aluno.findUnique({ where: { cliente_id: idCliente }, select: { id_aluno: true, id_plano: true, status: true } })
    if (!aluno) return null
    const plano = await conn.plano.findUnique({ where: { id_plano: aluno.id_plano }, select: { ...planoFields, ativo: true } })
    const pagamentos = await conn.pagamento.findMany({ where: { id_aluno: aluno.id_aluno, id_plano: aluno.id_plano }, orderBy: { data_pagamento: 'desc' } })
    const agora = new Date()
    const cobertura = (data: Date) => { const fim = new Date(data); fim.setMonth(fim.getMonth() + (plano?.duracao_meses ?? 0)); return fim > agora }
    return {
      aluno, plano, pagamentos,
      pendente: pagamentos.some(x => x.status_pagamento !== 'Pago'),
      pago: pagamentos.some(x => x.status_pagamento === 'Pago' && cobertura(x.data_pagamento)),
    }
  }

  router.get('/', async (_req, res) => {
    const dados = await carregar(res.locals.auth.id)
    if (!dados || !dados.plano) { res.json({ matriculado: false }); return }
    res.json({ matriculado: true, desde: dados.aluno.status, plano: dados.plano, pagamentos: dados.pagamentos, pendente: dados.pendente, pago: dados.pago })
  })

  router.post('/', async (req, res) => {
    const parsed = escolherSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Confira o plano, nome (até 30 caracteres) e ano de nascimento.' }); return }
    const result = await db.$transaction(async tx => {
      const plano = await tx.plano.findFirst({ where: { id_plano: parsed.data.id_plano, ativo: true }, select: planoFields })
      if (!plano) return { status: 404, erro: 'Este plano não está disponível.' }
      const dados = await carregar(res.locals.auth.id, tx)
      if (dados) {
        if (dados.aluno.id_plano === plano.id_plano) return { status: 200 }
        if (dados.pendente || dados.pago) return { status: 409, erro: 'Seu plano atual possui pagamento pendente ou período pago em vigor. Fale com a academia para trocar.' }
        await tx.aluno.update({ where: { id_aluno: dados.aluno.id_aluno }, data: { id_plano: plano.id_plano } })
      } else {
        const cliente = await tx.cliente.findUniqueOrThrow({ where: { id_cliente: res.locals.auth.id } })
        const nome = parsed.data.nome ?? cliente.nome
        if (nome.length > 30 || cliente.email.length > 40 || !parsed.data.data_nascimento) return { status: 400, erro: 'Informe seu ano de nascimento e um nome de até 30 caracteres. A matrícula aceita e-mail de até 40 caracteres.' }
        // Não vincula matrícula por e-mail: apenas o vínculo autenticado identifica o aluno.
        await tx.aluno.create({ data: { cliente_id: cliente.id_cliente, nome, email: cliente.email, telefone: cliente.telefone,
          data_nascimento: parsed.data.data_nascimento, foto: '', data_cadastro: new Date().toISOString().slice(0, 10), id_plano: plano.id_plano } })
      }
      return { status: 200 }
    }, { isolationLevel: 'Serializable' })
    res.status(result.status).json(result.erro ? { erro: result.erro } : { ok: true })
  })

  router.post('/pagamentos', async (req, res) => {
    const parsed = pagarSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Escolha a forma de pagamento.' }); return }
    const result = await db.$transaction(async tx => {
    const dados = await carregar(res.locals.auth.id, tx)
    if (!dados || !dados.plano) return { status: 404, erro: 'Você ainda não possui um plano cadastrado.' }
    if (!dados.plano.ativo) return { status: 409, erro: 'Este plano está indisponível. Escolha outro plano ou fale com a academia.' }
    if (dados.pendente) return { status: 409, erro: 'Você já tem um pagamento aguardando confirmação da academia.' }
    if (dados.pago) return { status: 409, erro: 'O seu plano já está pago.' }
    const pagamento = await tx.pagamento.create({ data: {
      id_aluno: dados.aluno.id_aluno, id_plano: dados.plano.id_plano, valor: dados.plano.valor_plano,
      data_vencimento: new Date(), metodo: parsed.data.metodo, status_pagamento: 'Pendente',
    } })
    return { status: 201, pagamento }
    }, { isolationLevel: 'Serializable' })
    res.status(result.status).json(result.erro ? { erro: result.erro } : result.pagamento)
  })
  return router
}
export default createMeuPlanoRouter()
