import { prisma } from "../../lib/prisma"
import { Router } from "express"
import jwt from 'jsonwebtoken'

const router = Router()

router.post("/", async (req, res) => {
  const { email } = req.body

  const mensaPadrao = "Email não encontrado"

  if (!email) {
    res.status(400).json({ erro: mensaPadrao })
    return
  }

  try {
    const instrutor = await prisma.cliente.findFirst({
      where: { email }
    })

    if (instrutor == null) {
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