import { prisma } from "../../lib/prisma";

import { Router } from 'express'
import { z } from 'zod'

const router = Router()

const planoSchema = z.object({
  nome_plano: z.string().min(1).max(30),
  descricao: z.string().max(100),
  duracao_meses: z.number().int().positive(),
  valor_plano: z.number().nonnegative(),
  ativo: z.boolean().default(true)
})

router.get("/", async (req, res) => {
  try {
    const planos = await prisma.plano.findMany()
    res.status(200).json(planos)
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {

  const valida = planoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const plano = await prisma.plano.create({
      data: valida.data
    })
    res.status(201).json(plano)
  } catch (error) {
    res.status(400).json({ error })
  }
})

router.delete("/:id", async (req, res) => {
  const { id } = req.params

  try {
    const plano = await prisma.plano.delete({
      where: { id_plano: Number(id) }
    })
    res.status(200).json(plano)
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const { id } = req.params

  const valida = planoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error })
    return
  }

  try {
    const plano = await prisma.plano.update({
      where: { id_plano: Number(id) },
      data: valida.data
    })
    res.status(200).json(plano)
  } catch (error) {
    res.status(400).json({ error })
  }
})

export default router