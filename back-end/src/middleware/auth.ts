import type { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'

export function authenticate(role: 'cliente' | 'admin', db = prisma): RequestHandler {
  return async (req, res, next) => {
    const key = process.env.JWT_KEY
    if (!key) { res.status(503).json({ erro: 'Autenticação indisponível.' }); return }
    let id: string
    try {
      const header = req.headers.authorization
      if (!header?.startsWith('Bearer ')) throw new Error()
      const token = jwt.verify(header.slice(7), key, { algorithms: ['HS256'], issuer: 'academia', audience: role })
      if (typeof token === 'string' || token.papel !== role || !z.string().uuid().safeParse(token.sub).success) throw new Error()
      id = token.sub!
    } catch { res.status(401).json({ erro: 'Sessão inválida ou expirada. Entre novamente.' }); return }
    try {
      const account = role === 'admin'
        ? await db.admin.findFirst({ where: { id_admin: id, ativo: true }, select: { id_admin: true } })
        : await db.cliente.findUnique({ where: { id_cliente: id }, select: { id_cliente: true } })
      if (!account) { res.status(401).json({ erro: 'Conta indisponível.' }); return }
      res.locals.auth = { id, role }
      next()
    } catch { res.status(503).json({ erro: 'Não foi possível validar sua sessão.' }) }
  }
}

// Limite por processo, para conter tentativas repetidas. Em múltiplas instâncias usar armazenamento compartilhado.
export function loginLimit(): RequestHandler {
  const attempts = new Map<string, { count: number; until: number }>()
  return (req, res, next) => {
    const now = Date.now()
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key)
    const key = req.ip ?? 'unknown'
    const attempt = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 }
    attempt.count++
    attempts.set(key, attempt)
    if (attempt.count > 30) { res.status(429).json({ erro: 'Muitas tentativas. Aguarde 15 minutos.' }); return }
    next()
  }
}
