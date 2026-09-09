import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"

const router = Router()

const alunoSchema = z.object({
  nome: z.string().min(1).max(30),
  data_nascimento: z.number().int(),
  email: z.string().email().max(40),
  telefone: z.number().int(),
  data_cadastro: z.string().optional(),
  foto: z.string(),
  id_plano: z.number().int(),
})

router.get("/", async (req, res) => {
  try {
    const alunos = await prisma.aluno.findMany()
    res.status(200).json(alunos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/pesquisa/:termo", async (req, res) => {
  const { termo } = req.params
  const id = Number(termo)

  try {
    const alunos = Number.isInteger(id) && id > 0
      ? await prisma.aluno.findMany({ where: { id_aluno: id } })
      : await prisma.aluno.findMany({
          where: {
            OR: [
              { nome: { contains: termo, mode: "insensitive" } },
              { email: { contains: termo, mode: "insensitive" } },
            ]
          }
        })

    res.status(200).json(alunos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do aluno inválido" })
    return
  }

  try {
    const aluno = await prisma.aluno.findUnique({ where: { id_aluno: id } })

    if (!aluno) {
      res.status(404).json({ erro: "Aluno não encontrado" })
      return
    }

    res.status(200).json(aluno)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {
  const valida = alunoSchema.safeParse(req.body)

  if (!valida.success) {
    res.status(400).json({ erro: valida.error.flatten() })
    return
  }

  try {
    const aluno = await prisma.aluno.create({ data: valida.data })
    res.status(201).json(aluno)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const valida = alunoSchema.safeParse(req.body)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do aluno inválido" })
    return
  }

  if (!valida.success) {
    res.status(400).json({ erro: valida.error.flatten() })
    return
  }

  try {
    const aluno = await prisma.aluno.update({
      where: { id_aluno: id },
      data: valida.data
    })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do aluno inválido" })
    return
  }

  try {
    const aluno = await prisma.aluno.delete({ where: { id_aluno: id } })
    res.status(200).json(aluno)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router