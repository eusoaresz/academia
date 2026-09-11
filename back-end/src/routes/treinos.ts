import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma"

const router = Router()

const treinoSchema = z.object({
  id_aluno: z.number().int().positive(),
  id_instrutor: z.number().int().positive(),
  objetivo: z.string().min(1).max(100),
  observacoes: z.string().max(200),
  data_entrada: z.coerce.date().optional(),
  data_saida: z.coerce.date().optional(),
})

router.get("/", async (_req, res) => {
  try {
    res.status(200).json(await prisma.treino.findMany())
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {
  const valida = treinoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error.flatten() })
    return
  }

  try {
    res.status(201).json(await prisma.treino.create({ data: valida.data }))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const valida = treinoSchema.safeParse(req.body)
  if (!Number.isInteger(id) || id <= 0 || !valida.success) {
    res.status(400).json({ erro: "Dados do treino inválidos" })
    return
  }

  try {
    res.status(200).json(await prisma.treino.update({ where: { id_treino: id }, data: valida.data }))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do treino inválido" })
    return
  }

  try {
    res.status(200).json(await prisma.treino.delete({ where: { id_treino: id } }))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
