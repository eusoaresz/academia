import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../middleware/auth'

const pagarSchema = z.object({ metodo: z.enum(['PIX', 'Cartao', 'Dinheiro']) })
const planoFields = { id_plano: true, nome_plano: true, descricao: true, duracao_meses: true, valor_plano: true } as const

// Plano do aluno ligado à conta do cliente e pagamentos dele. O valor vem sempre do plano cadastrado, nunca do navegador.
export function createMeuPlanoRouter(db = prisma) {
  const router = Router()
  router.use(authenticate('cliente', db))

  async function carregar(idCliente: string) {
    const aluno = await db.aluno.findUnique({ where: { cliente_id: idCliente }, select: { id_aluno: true, id_plano: true, status: true } })
    if (!aluno) return null
    const plano = await db.plano.findUnique({ where: { id_plano: aluno.id_plano }, select: planoFields })
    const pagamentos = await db.pagamento.findMany({ where: { id_aluno: aluno.id_aluno }, orderBy: { data_pagamento: 'desc' } })
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

  router.post('/pagamentos', async (req, res) => {
    const parsed = pagarSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Escolha a forma de pagamento.' }); return }
    const dados = await carregar(res.locals.auth.id)
    if (!dados || !dados.plano) { res.status(404).json({ erro: 'Você ainda não possui um plano cadastrado.' }); return }
    if (dados.pendente) { res.status(409).json({ erro: 'Você já tem um pagamento aguardando confirmação da academia.' }); return }
    if (dados.pago) { res.status(409).json({ erro: 'O seu plano já está pago.' }); return }
    const pagamento = await db.pagamento.create({ data: {
      id_aluno: dados.aluno.id_aluno, id_plano: dados.plano.id_plano, valor: dados.plano.valor_plano,
      data_vencimento: new Date(), metodo: parsed.data.metodo, status_pagamento: 'Pendente',
    } })
    res.status(201).json(pagamento)
  })
  return router
}
export default createMeuPlanoRouter()
