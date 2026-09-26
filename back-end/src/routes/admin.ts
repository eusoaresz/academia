import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { verifyPassword } from '../../lib/password'
import { authenticate, loginLimit } from '../middleware/auth'

export function createAdminRouter(db = prisma) {
  const router = Router()
  router.post('/login', loginLimit(), async (req, res) => {
    const parsed = z.object({ email: z.string().trim().toLowerCase().email(), senha: z.string().min(1).max(100) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ erro: 'Informe e-mail e senha válidos.' }); return }
    const key = process.env.JWT_KEY
    if (!key) { res.status(503).json({ erro: 'Login indisponível.' }); return }
    const admin = await db.admin.findUnique({ where: { email: parsed.data.email } })
    if (!admin?.ativo || !verifyPassword(parsed.data.senha, admin.senha)) { res.status(401).json({ erro: 'E-mail ou senha inválidos.' }); return }
    const token = jwt.sign({ papel: 'admin' }, key, { subject: admin.id_admin, audience: 'admin', issuer: 'academia', algorithm: 'HS256', expiresIn: '1h' })
    res.json({ token, expiresIn: 3600 })
  })
  router.use(authenticate('admin', db))
  router.get('/me', async (_req, res) => {
    res.json(await db.admin.findUnique({ where: { id_admin: res.locals.auth.id }, select: { id_admin: true, nome: true, email: true } }))
  })
  router.get('/dashboard', async (_req, res) => {
    const [clientes, planos, status, interesses] = await Promise.all([
      db.cliente.count(), db.plano.count({ where: { ativo: true } }),
      db.agendamento.groupBy({ by: ['status'], _count: { _all: true } }),
      db.plano.findMany({ select: { nome_plano: true, _count: { select: { agendamentos: true } } } }),
    ])
    res.json({ clientes, planos, porStatus: status.map(x => ({ nome: x.status, total: x._count._all })), porPlano: interesses.map(x => ({ nome: x.nome_plano, total: x._count.agendamentos })) })
  })
  return router
}
export default createAdminRouter()
