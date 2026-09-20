import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../lib/prisma"

const router = Router()

const pagamentoSchema = z.object({
  id_aluno: z.number().int().positive(),
  id_plano: z.number().int().positive(),
  data_pagamento: z.coerce.date().optional(),
  data_vencimento: z.coerce.date(),
  valor: z.number().nonnegative(),
  metodo: z.enum(["Dinheiro", "Cartao", "PIX"]),
  status_pagamento: z.enum(["Pendente", "Pago", "Atrasado"]),
})

router.get("/", async (_req, res) => {
  try {
    res.status(200).json(await prisma.pagamento.findMany())
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {
  const valida = pagamentoSchema.safeParse(req.body)
  if (!valida.success) {
    res.status(400).json({ erro: valida.error.flatten() })
    return
  }

  try {
    res.status(201).json(await prisma.pagamento.create({ data: valida.data }))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const valida = pagamentoSchema.safeParse(req.body)
  if (!Number.isInteger(id) || id <= 0 || !valida.success) {
    res.status(400).json({ erro: "Dados do pagamento inválidos" })
    return
  }

  try {
    res.status(200).json(await prisma.pagamento.update({ where: { id_pagamento: id }, data: valida.data }))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: "ID do pagamento inválido" })
    return
  }

  try {
    res.status(200).json(await prisma.pagamento.delete({ where: { id_pagamento: id } }))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
