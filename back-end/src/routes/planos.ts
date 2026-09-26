import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { authenticate } from '../middleware/auth'
import { generatePlanInfo } from '../../lib/ai'

const schema = z.object({ nome_plano: z.string().trim().min(1).max(30), descricao: z.string().trim().max(100), duracao_meses: z.number().int().min(1).max(32767), valor_plano: z.number().nonnegative(), ativo: z.boolean().default(true), destaque: z.boolean().default(false) })
export function createPlanosRouter(db = prisma, generate = generatePlanInfo) {
  const router = Router()
  router.get('/gestao', authenticate('admin', db), async (_req, res) => { res.json(await db.plano.findMany({ orderBy: { id_plano: 'desc' } })) })
  router.get('/', async (req, res) => {
    const query = z.object({ busca: z.string().trim().max(100).optional(), destaque: z.enum(['true', 'false']).optional() }).safeParse(req.query)
    if (!query.success) { res.status(400).json({ erro: 'Pesquisa inválida.' }); return }
    const busca = query.data.busca
    res.json(await db.plano.findMany({ where: { ativo: true, ...(query.data.destaque === 'true' ? { destaque: true } : {}), ...(busca ? { OR: [{ nome_plano: { contains: busca, mode: 'insensitive' as const } }, { descricao: { contains: busca, mode: 'insensitive' as const } }] } : {}) }, orderBy: [{ destaque: 'desc' }, { id_plano: 'desc' }] }))
  })
  router.get('/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: 'Plano inválido.' }); return }
    const plano = await db.plano.findFirst({ where: { id_plano: id, ativo: true } })
    if (!plano) { res.status(404).json({ erro: 'Plano não encontrado.' }); return }
    res.json(plano)
  })
  router.use(authenticate('admin', db))
  router.post('/', async (req, res) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Confira os dados do plano.' }); return }
    res.status(201).json(await db.plano.create({ data: parsed.data }))
  })
  router.put('/:id', async (req, res) => {
    const parsed = schema.safeParse(req.body)
    const id = Number(req.params.id)
    if (!parsed.success || !Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: 'Confira os dados do plano.' }); return }
    res.json(await db.plano.update({ where: { id_plano: id }, data: { ...parsed.data, ia_texto: null, ia_modelo: null, ia_gerado_em: null } }))
  })
  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: 'Plano inválido.' }); return }
    if (await db.aluno.count({ where: { id_plano: id } }) || await db.pagamento.count({ where: { id_plano: id } })) {
      res.status(409).json({ erro: 'Plano em uso. Desative-o para preservar o histórico.' }); return
    }
    res.json(await db.plano.delete({ where: { id_plano: id } }))
  })
  const inflight = new Set<number>()
  router.post('/:id/ia', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: 'Plano inválido.' }); return }
    if (inflight.has(id)) { res.status(409).json({ erro: 'A consulta já está em andamento.' }); return }
    const plano = await db.plano.findUnique({ where: { id_plano: id } })
    if (!plano) { res.status(404).json({ erro: 'Plano não encontrado.' }); return }
    if (plano.ia_texto && plano.ia_gerado_em && Date.now() - plano.ia_gerado_em.getTime() < 86400000) { res.json(plano); return }
    inflight.add(id)
    try {
      const generated = await generate(plano)
      const updated = await db.plano.updateMany({ where: { id_plano: id, nome_plano: plano.nome_plano, descricao: plano.descricao, duracao_meses: plano.duracao_meses, valor_plano: plano.valor_plano }, data: generated })
      if (!updated.count) { res.status(409).json({ erro: 'O plano mudou. Consulte novamente.' }); return }
      res.json(await db.plano.findUnique({ where: { id_plano: id } }))
    } finally { inflight.delete(id) }
  })
  return router
}
export default createPlanosRouter()
