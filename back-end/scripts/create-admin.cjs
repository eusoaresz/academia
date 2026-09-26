require('dotenv/config')
const { createInterface } = require('node:readline/promises')
const { Writable } = require('node:stream')
const { prisma } = require('../lib/prisma')
const { hashPassword } = require('../lib/password')
const { z } = require('zod')
async function main() {
  if (!process.stdin.isTTY) throw new Error('Execute este comando em um terminal interativo para definir a senha sem exibi-la.')
  let muted = false
  const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback() } })
  const rl = createInterface({ input: process.stdin, output, terminal: true })
  try {
    const email = (await rl.question('E-mail do administrador [victor@hotmail.com]: ') || 'victor@hotmail.com').trim().toLowerCase()
    const nome = (await rl.question('Nome: ')).trim()
    process.stdout.write('Senha (mínimo 12 caracteres; entrada oculta): '); muted = true
    const senha = await rl.question('')
    muted = false; process.stdout.write('\nConfirme a senha: '); muted = true
    const confirmation = await rl.question('')
    muted = false; process.stdout.write('\n')
    const parsed = z.object({ email: z.string().email().max(254), nome: z.string().min(2).max(80), senha: z.string().min(12).max(100) }).safeParse({ email, nome, senha })
    if (!parsed.success || senha !== confirmation) throw new Error('Dados inválidos ou senhas diferentes. Nenhuma conta foi alterada.')
    // Não redefine credenciais de uma conta existente.
    await prisma.admin.create({ data: { email, nome, senha: hashPassword(senha) } })
    console.log('Administrador criado. Acesse /#gestao no frontend.')
  } finally { muted = false; rl.close() }
}
main().catch(error => { console.error(error.code === 'P2002' ? 'Já existe um administrador com este e-mail.' : error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
