import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from 'zod'

const router = Router()

const instrutorSchema = z.object({
  nome: z.string().min(1).max(30),
  email: z.string().email().max(40),
  telefone: z.string().min(8).max(20),
  especialidade: z.string().min(1).max(50),
  foto: z.string(),
})

router.get("/", async (req, res) => {
  try {
    const instrutores = await prisma.cliente.findMany()
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

  const { nome, email, telefone, especialidade, foto } = valida.data

  try {
    const instrutor = await prisma.cliente.create({
      data: { nome, email, telefone, especialidade, foto }
    })
    res.status(201).json(instrutor)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.get("/:id", async (req, res) => {
  const { id } = req.params
  try {
    const instrutor = await prisma.cliente.findUnique({
      where: { id_instrutor: parseInt(id) }
    })
    res.status(200).json(instrutor)
  } catch (error) {
    res.status(400).json(error)
  }
})

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do instrutor inválido" })
    return
  }

  try {
    const instrutor = await prisma.cliente.delete({
      where: { id_instrutor: id }
    })
    res.status(200).json(instrutor)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router