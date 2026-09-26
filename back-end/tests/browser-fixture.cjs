// Dados sintéticos para QA manual. Sempre executar cleanup ao terminar.
require('ts-node/register')
const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { prisma } = require('../lib/prisma')
const { hashPassword } = require('../lib/password')
const manifest = path.join(__dirname, '.browser-fixture.tmp')
async function main() {
  if (process.argv[2] === 'cleanup') {
    if (!fs.existsSync(manifest)) return
    const ids = JSON.parse(fs.readFileSync(manifest, 'utf8'))
    if (!ids.adminId || !ids.clientId || !ids.planId) throw new Error('Manifesto incompleto; não excluir dados.')
    await prisma.$transaction([
      prisma.agendamento.deleteMany({ where: { id_cliente: ids.clientId } }),
      prisma.horario.deleteMany({ where: { id_plano: ids.planId } }),
      prisma.plano.delete({ where: { id_plano: ids.planId } }),
      prisma.cliente.delete({ where: { id_cliente: ids.clientId } }),
      prisma.admin.delete({ where: { id_admin: ids.adminId } }),
    ])
    fs.unlinkSync(manifest); console.log('Dados de QA removidos.'); return
  }
  if (fs.existsSync(manifest)) throw new Error('Já há dados de QA. Execute cleanup primeiro.')
  const tag = randomUUID().slice(0,8), password = randomUUID()
  const result = await prisma.$transaction(async tx => {
    const admin = await tx.admin.create({ data: { nome: 'Admin de teste', email: `admin-${tag}@example.com`, senha: hashPassword(password) } })
    const client = await tx.cliente.create({ data: { nome: 'Cliente de teste', email: `cliente-${tag}@example.com`, telefone: '53999991234', senha: hashPassword(password) } })
    const plan = await tx.plano.create({ data: { nome_plano: 'QA Aula Experimental', descricao: 'Registro temporário para conferir a interface.', duracao_meses: 1, valor_plano: 100, destaque: true } })
    await tx.horario.create({ data: { id_plano: plan.id_plano, data_hora: new Date(Date.now() + 86400000 * 4) } })
    return { adminId: admin.id_admin, clientId: client.id_cliente, planId: plan.id_plano, adminEmail: admin.email, clientEmail: client.email, password }
  })
  fs.writeFileSync(manifest, JSON.stringify(result), { flag: 'wx' })
  console.log(JSON.stringify({ adminEmail: result.adminEmail, clientEmail: result.clientEmail, password: result.password }))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => prisma.$disconnect())
