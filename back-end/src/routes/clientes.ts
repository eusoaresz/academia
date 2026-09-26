import { Router } from "express"
import jwt from "jsonwebtoken"
import { z } from "zod"
import { prisma } from "../../lib/prisma"
import { hashPassword, verifyPassword } from "../../lib/password"

const emailSchema = z.string().trim().toLowerCase().email().max(254)
const cadastroSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  email: emailSchema,
  telefone: z.string().trim().regex(/^[+\d\s().-]{8,20}$/).refine(value => value.replace(/\D/g, "").length >= 8),
  senha: z.string().min(8).max(100),
})
const loginSchema = z.object({ email: emailSchema, senha: z.string().min(1).max(100) })
const publicFields = { id_cliente: true, nome: true, email: true, telefone: true, data_cadastro: true } as const
const issuer = "academia"
const audience = "cliente"

// A injeção permite testar as rotas sem escrever no banco de desenvolvimento.
export function createClientesRouter(db: Pick<typeof prisma, "cliente"> = prisma, getKey = () => process.env.JWT_KEY) {
  const router = Router()

  router.post("/cadastro", async (req, res) => {
    const parsed = cadastroSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ erro: "Confira nome, e-mail e telefone. A senha deve ter entre 8 e 100 caracteres." })
      return
    }
    try {
      const { senha, ...dados } = parsed.data
      const cliente = await db.cliente.create({ data: { ...dados, senha: hashPassword(senha) }, select: publicFields })
      res.status(201).json(cliente)
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
        res.status(409).json({ erro: "Este e-mail já possui uma conta. Entre com sua senha." })
        return
      }
      res.status(500).json({ erro: "Não foi possível criar sua conta. Tente novamente." })
    }
  })

  router.post("/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ erro: "Informe um e-mail válido e sua senha." })
      return
    }
    const key = getKey()
    if (!key) {
      res.status(503).json({ erro: "Login temporariamente indisponível." })
      return
    }
    try {
      const cliente = await db.cliente.findUnique({ where: { email: parsed.data.email } })
      if (!cliente || !verifyPassword(parsed.data.senha, cliente.senha)) {
        res.status(401).json({ erro: "E-mail ou senha inválidos." })
        return
      }
      const token = jwt.sign({ papel: "cliente" }, key, {
        algorithm: "HS256", subject: cliente.id_cliente, issuer, audience, expiresIn: "1h",
      })
      res.json({ token, expiresIn: 3600 })
    } catch {
      res.status(500).json({ erro: "Não foi possível entrar. Tente novamente." })
    }
  })

  router.get("/me", async (req, res) => {
    const key = getKey()
    if (!key) {
      res.status(503).json({ erro: "Login temporariamente indisponível." })
      return
    }
    let id: string
    try {
      const authorization = req.headers.authorization
      if (!authorization?.startsWith("Bearer ")) throw new Error("Token ausente")
      const payload = jwt.verify(authorization.slice(7), key, { algorithms: ["HS256"], issuer, audience })
      if (typeof payload === "string" || payload.papel !== "cliente" || !z.string().uuid().safeParse(payload.sub).success) throw new Error("Token inválido")
      id = payload.sub!
    } catch {
      res.status(401).json({ erro: "Sua sessão expirou ou é inválida. Entre novamente." })
      return
    }
    try {
      const cliente = await db.cliente.findUnique({ where: { id_cliente: id }, select: publicFields })
      if (!cliente) {
        res.status(401).json({ erro: "Conta não encontrada. Entre novamente." })
        return
      }
      res.json(cliente)
    } catch {
      res.status(500).json({ erro: "Não foi possível carregar sua conta." })
    }
  })
  return router
}

export default createClientesRouter()
