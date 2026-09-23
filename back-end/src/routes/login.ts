import { prisma } from "../../lib/prisma"
import { Router } from "express"
import jwt from 'jsonwebtoken'
import { z } from "zod"
import { verifyPassword } from "../../lib/password"

const router = Router()

router.post("/", async (req, res) => {
  const valida = z.object({
    email: z.string().email(),
    senha: z.string().min(1),
  }).safeParse(req.body)

  const mensaPadrao = "E-mail ou senha inválidos"

  if (!valida.success) {
    res.status(400).json({ erro: mensaPadrao })
    return
  }

  const { email, senha } = valida.data

  try {
    const instrutor = await prisma.cliente.findFirst({
      where: { email }
    })

    if (instrutor == null || !verifyPassword(senha, instrutor.senha)) {
      res.status(400).json({ erro: mensaPadrao })
      return
    }

    if (instrutor.ativo) {
      const token = jwt.sign({
        instrutorLogadoId: instrutor.id_instrutor,
        instrutorLogadoNome: instrutor.nome
      },
        process.env.JWT_KEY as string,
        { expiresIn: "1h" }
      )

      res.status(200).json({
        id_instrutor: instrutor.id_instrutor,
        nome: instrutor.nome,
        email: instrutor.email,
        especialidade: instrutor.especialidade,
        token
      })
    } else {
      res.status(400).json({ erro: "Instrutor inativo" })
    }
  } catch (error) {
    res.status(400).json(error)
  }
})

export default router