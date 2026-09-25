import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from 'zod'
import { hashPassword } from "../../lib/password"

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