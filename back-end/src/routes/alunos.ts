import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import { hashPassword } from "../../lib/password"

const router = Router()
const alunoSchema = z.object({
  nome: z.string().trim().min(1).max(30),
  data_nascimento: z.number().int(),
  email: z.string().trim().toLowerCase().email().max(40),
  telefone: z.string().trim().min(8).max(20),
  data_cadastro: z.string().optional(),
  foto: z.string(),
  id_plano: z.number().int(),
  senha: z.string().min(8).max(100),
})
const alunoUpdateSchema = alunoSchema.extend({ senha: z.string().min(8).max(100).optional() })
const publicAluno = (aluno: Record<string, unknown>) => {
  const { senha: _senha, cliente_id: _clienteId, ...safeAluno } = aluno
  return safeAluno
}

router.get("/", async (_req, res) => {
  try {
    const alunos = await prisma.aluno.findMany()
    res.status(200).json(alunos.map(publicAluno))
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
      : await prisma.aluno.findMany({ where: { OR: [{ nome: { contains: termo, mode: "insensitive" } }, { email: { contains: termo, mode: "insensitive" } }] } })
    res.status(200).json(alunos.map(publicAluno))
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: "ID do aluno inválido" }); return }
  try {
    const aluno = await prisma.aluno.findUnique({ where: { id_aluno: id } })
    if (!aluno) { res.status(404).json({ erro: "Aluno não encontrado" }); return }
    res.status(200).json(publicAluno(aluno))
  } catch (error) {
    res.status(500).json({ erro: error })
  }
})

router.post("/", async (req, res) => {
  const valida = alunoSchema.safeParse(req.body)
  if (!valida.success) { res.status(400).json({ erro: "Confira os dados do aluno. A senha deve ter entre 8 e 100 caracteres." }); return }
  try {
    const { senha, ...dados } = valida.data
    const aluno = await prisma.$transaction(async tx => {
      const cliente = await tx.cliente.upsert({
        where: { email: dados.email },
        create: { nome: dados.nome, email: dados.email, telefone: dados.telefone, senha: hashPassword(senha) },
        update: { nome: dados.nome, telefone: dados.telefone, senha: hashPassword(senha) },
      })
      return tx.aluno.create({ data: { ...dados, senha: hashPassword(senha), cliente_id: cliente.id_cliente } })
    })
    res.status(201).json(publicAluno(aluno))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id)
  const valida = alunoUpdateSchema.safeParse(req.body)
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: "ID do aluno inválido" }); return }
  if (!valida.success) { res.status(400).json({ erro: "Confira os dados do aluno e, se informada, a senha deve ter entre 8 e 100 caracteres." }); return }
  try {
    const aluno = await prisma.$transaction(async tx => {
      const atual = await tx.aluno.findUnique({ where: { id_aluno: id } })
      if (!atual) throw Object.assign(new Error("Aluno não encontrado"), { code: "P2025" })
      const { senha, ...dados } = valida.data
      if ((!atual.cliente_id || atual.email !== dados.email) && !senha) {
        throw new Error("Informe uma senha para criar ou alterar a conta do cliente.")
      }
      const cliente = await tx.cliente.upsert({
        where: { email: dados.email },
        create: { nome: dados.nome, email: dados.email, telefone: dados.telefone, senha: hashPassword(senha ?? "troca-de-senha-obrigatoria") },
        update: { nome: dados.nome, telefone: dados.telefone, ...(senha ? { senha: hashPassword(senha) } : {}) },
      })
      return tx.aluno.update({ where: { id_aluno: id }, data: { ...dados, ...(senha ? { senha: hashPassword(senha) } : {}), cliente_id: cliente.id_cliente } })
    })
    res.status(200).json(publicAluno(aluno))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ erro: "ID do aluno inválido" }); return }
  try {
    const aluno = await prisma.aluno.delete({ where: { id_aluno: id } })
    res.status(200).json(publicAluno(aluno))
  } catch (error) {
    res.status(400).json({ erro: error })
  }
})

export default router
