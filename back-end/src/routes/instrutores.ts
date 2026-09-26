import { prisma } from "../../lib/prisma"
import { Router } from "express"
import jwt from "jsonwebtoken"
import { z } from 'zod'
import { hashPassword } from "../../lib/password"
import { verifyPassword } from "../../lib/password"

const router = Router()

const instrutorSchema = z.object({
  nome: z.string().min(1).max(30),
  email: z.string().email().max(40),
  senha: z.string().min(6).max(100),
  telefone: z.string().min(8).max(20),
  especialidade: z.string().min(1).max(50),
  foto: z.string(),
})

const instrutorUpdateSchema = instrutorSchema.omit({ senha: true }).extend({
  senha: z.string().min(6).max(100).optional(),
})
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  senha: z.string().min(1).max(100),
})
const publicFields = {
  id_instrutor: true,
  nome: true,
  email: true,
  telefone: true,
  especialidade: true,
  ativo: true,
  foto: true,
} as const
const issuer = "academia"
const audience = "instrutor"

router.get("/", async (req, res) => {
  try {
    const instrutores = await prisma.instrutor.findMany({
      select: {
        id_instrutor: true,
        nome: true,
        email: true,
        telefone: true,
        especialidade: true,
        ativo: true,
        foto: true,
      },
    })
    res.status(200).json(instrutores)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post("/", async (req, res) => {

  const valida = instrutorSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  const { nome, email, senha, telefone, especialidade, foto } = valida.data

  try {
    const instrutor = await prisma.instrutor.create({
      data: { nome, email, senha: hashPassword(senha), telefone, especialidade, foto }
    })
    const { senha: _, ...instrutorSemSenha } = instrutor
    res.status(201).json(instrutorSemSenha)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ erro: "Informe um e-mail válido e sua senha." })
    return
  }

  const key = process.env.JWT_KEY
  if (!key) {
    res.status(503).json({ erro: "Login temporariamente indisponível." })
    return
  }

  try {
    const instrutor = await prisma.instrutor.findFirst({ where: { email: parsed.data.email } })
    if (!instrutor || !verifyPassword(parsed.data.senha, instrutor.senha)) {
      res.status(401).json({ erro: "E-mail ou senha inválidos." })
      return
    }
    if (!instrutor.ativo) {
      res.status(403).json({ erro: "Instrutor inativo." })
      return
    }

    const token = jwt.sign({ papel: "instrutor" }, key, {
      algorithm: "HS256",
      subject: String(instrutor.id_instrutor),
      issuer,
      audience,
      expiresIn: "1h",
    })
    const { senha: _, ...instrutorSemSenha } = instrutor
    res.status(200).json({ ...instrutorSemSenha, token, expiresIn: 3600 })
  } catch {
    res.status(500).json({ erro: "Não foi possível entrar. Tente novamente." })
  }
})

router.get("/me", async (req, res) => {
  const key = process.env.JWT_KEY
  if (!key) {
    res.status(503).json({ erro: "Login temporariamente indisponível." })
    return
  }

  let id: number
  try {
    const authorization = req.headers.authorization
    if (!authorization?.startsWith("Bearer ")) throw new Error("Token ausente")
    const payload = jwt.verify(authorization.slice(7), key, { algorithms: ["HS256"], issuer, audience })
    if (typeof payload === "string" || payload.papel !== "instrutor" || !payload.sub || !/^\d+$/.test(payload.sub)) {
      throw new Error("Token inválido")
    }
    id = Number(payload.sub)
  } catch {
    res.status(401).json({ erro: "Sua sessão expirou ou é inválida. Entre novamente." })
    return
  }

  try {
    const instrutor = await prisma.instrutor.findUnique({ where: { id_instrutor: id }, select: publicFields })
    if (!instrutor || !instrutor.ativo) {
      res.status(401).json({ erro: "Instrutor não encontrado ou inativo. Entre novamente." })
      return
    }
    res.status(200).json(instrutor)
  } catch {
    res.status(500).json({ erro: "Não foi possível carregar sua conta." })
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const instrutor = await prisma.instrutor.findUnique({
      where: { id_instrutor: parseInt(id) },
      select: {
        id_instrutor: true,
        nome: true,
        email: true,
        telefone: true,
        especialidade: true,
        ativo: true,
        foto: true,
      },
    })
    res.status(200).json(instrutor)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const valida = instrutorUpdateSchema.safeParse(req.body)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do instrutor inválido" })
    return
  }

  if (!valida.success) {
    res.status(400).json({ erro: valida.error.flatten() })
    return
  }

  const { senha, ...dados } = valida.data

  try {
    const instrutor = await prisma.instrutor.update({
      where: { id_instrutor: id },
      data: senha ? { ...dados, senha: hashPassword(senha) } : dados,
    })
    const { senha: _, ...instrutorSemSenha } = instrutor
    res.status(200).json(instrutorSemSenha)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do instrutor inválido" })
    return
  }

  try {
    const instrutor = await prisma.instrutor.delete({
      where: { id_instrutor: id }
    })
    res.status(200).json(instrutor)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router