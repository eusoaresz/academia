// Executar explicitamente: npm run test:integration. Cria e remove somente seus próprios registros.
require('ts-node/register')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const jwt = require('jsonwebtoken')
const { prisma } = require('../lib/prisma')
const { hashPassword } = require('../lib/password')
const { app } = require('../src/app')

test('fluxo completo no banco: cliente, administrador, vagas e respostas', { timeout: 120000 }, async t => {
  const tag = randomUUID(), adminId = randomUUID(), emails = [`a-${tag}@example.com`, `b-${tag}@example.com`]
  const adminEmail = `admin-${tag}@example.com`, password = randomUUID(), planIds = []
  let server
  try {
    await prisma.admin.create({ data: { id_admin: adminId, nome: 'Teste integração', email: adminEmail, senha: hashPassword(password) } })
    server = app.listen(0, '127.0.0.1')
    await new Promise(resolve => server.once('listening', resolve))
    const call = async (path, method = 'GET', body, token) => {
      const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
      return { status: res.status, data: await res.json() }
    }
    let adminToken, tokens = [], appointment, slot, plan
    await t.test('cadastro, normalização, senha, e-mail duplicado e sessão persistente', async () => {
      for (const email of emails) {
        const registration = await call('/clientes/cadastro', 'POST', { nome: 'Cliente teste', email: email.toUpperCase(), telefone: '53999991234', senha: password })
        assert.equal(registration.status, 201); assert.equal(registration.data.senha, undefined)
        const login = await call('/clientes/login', 'POST', { email, senha: password, manterConectado: true })
        assert.equal(login.status, 200); assert.equal(login.data.expiresIn, 604800)
        tokens.push(login.data.token)
        assert.equal((await call('/clientes/me', 'GET', undefined, login.data.token)).data.id_cliente, registration.data.id_cliente)
      }
      assert.equal((await call('/clientes/cadastro', 'POST', { nome: 'Outro', email: emails[0], telefone: '53999991234', senha: password })).status, 409)
      assert.equal((await call('/clientes/login', 'POST', { email: emails[0], senha: 'incorreta' })).status, 401)
    })
    await t.test('admin autentica; cliente e visitante não acessam gestão', async () => {
      const login = await call('/admin/login', 'POST', { email: adminEmail, senha: password })
      assert.equal(login.status, 200); adminToken = login.data.token
      assert.equal((await call('/admin/me', 'GET', undefined, adminToken)).data.id_admin, adminId)
      for (const path of ['/alunos','/instrutores','/pagamentos','/treinos','/admin/dashboard','/agendamentos','/planos/gestao','/horarios/gestao']) {
        assert.equal((await call(path)).status, 401, path)
        assert.equal((await call(path, 'GET', undefined, tokens[0])).status, 401, path)
      }
      const expired = jwt.sign({ papel: 'admin' }, process.env.JWT_KEY, { subject: adminId, issuer: 'academia', audience: 'admin', expiresIn: -1 })
      assert.equal((await call('/admin/me', 'GET', undefined, expired)).status, 401)
    })
    await t.test('planos públicos filtram destaques e inativos; escrita exige admin', async () => {
      const data = { nome_plano: `Teste ${tag.slice(0,8)}`, descricao: 'Plano de teste', duracao_meses: 1, valor_plano: 99.9, destaque: true, ativo: true }
      assert.equal((await call('/planos', 'POST', data, tokens[0])).status, 401)
      const result = await call('/planos', 'POST', data, adminToken); assert.equal(result.status, 201)
      plan = result.data; planIds.push(plan.id_plano)
      const hidden = await call('/planos', 'POST', { ...data, ativo: false }, adminToken); assert.equal(hidden.status, 201); planIds.push(hidden.data.id_plano)
      const publicPlans = await call(`/planos?busca=${encodeURIComponent(data.nome_plano)}&destaque=true`)
      assert.deepEqual(publicPlans.data.map(x => x.id_plano), [plan.id_plano])
      assert.equal((await call(`/planos/${hidden.data.id_plano}`)).status, 404)
      assert.equal((await call(`/planos/${plan.id_plano}`)).status, 200)
    })
    await t.test('admin publica vaga; datas passadas e duplicatas são recusadas', async () => {
      const data = { id_plano: plan.id_plano, data_hora: new Date(Date.now() + 86400000 * 3).toISOString() }
      assert.equal((await call('/horarios', 'POST', { ...data, data_hora: '2020-01-01T12:00:00Z' }, adminToken)).status, 400)
      const created = await call('/horarios', 'POST', data, adminToken); assert.equal(created.status, 201); slot = created.data
      assert.equal((await call('/horarios', 'POST', data, adminToken)).status, 409)
      assert.ok((await call(`/horarios?plano=${plan.id_plano}`)).data.some(x => x.id_horario === slot.id_horario))
    })
    await t.test('reserva exige login e banco impede duas reservas simultâneas', async () => {
      const body = { id_horario: slot.id_horario, observacao_cliente: 'Quero conhecer a academia.' }
      assert.equal((await call('/agendamentos', 'POST', body)).status, 401)
      const results = await Promise.all(tokens.map(token => call('/agendamentos', 'POST', body, token)))
      assert.deepEqual(results.map(x => x.status).sort(), [201,409])
      const winner = results.findIndex(x => x.status === 201)
      appointment = results[winner].data
      if (winner === 1) tokens.reverse()
      assert.ok(!(await call(`/horarios?plano=${plan.id_plano}`)).data.some(x => x.id_horario === slot.id_horario))
      assert.equal((await call(`/horarios/${slot.id_horario}`, 'PATCH', { ativo: false }, adminToken)).status, 409)
    })
    await t.test('cliente não consulta nem cancela agendamento de outra conta', async () => {
      assert.ok((await call('/agendamentos/meus', 'GET', undefined, tokens[0])).data.some(x => x.id_agendamento === appointment.id_agendamento))
      assert.ok(!(await call('/agendamentos/meus', 'GET', undefined, tokens[1])).data.some(x => x.id_agendamento === appointment.id_agendamento))
      assert.equal((await call(`/agendamentos/${appointment.id_agendamento}/cancelar`, 'PATCH', undefined, tokens[1])).status, 409)
    })
    await t.test('resposta do admin aparece ao cliente e cancelamento libera vaga', async () => {
      const answer = { status: 'Confirmado', resposta_admin: 'Aula confirmada. Até lá!' }
      assert.equal((await call(`/agendamentos/${appointment.id_agendamento}/resposta`, 'PATCH', answer, tokens[0])).status, 401)
      assert.equal((await call(`/agendamentos/${appointment.id_agendamento}/resposta`, 'PATCH', answer, adminToken)).status, 200)
      const mine = (await call('/agendamentos/meus', 'GET', undefined, tokens[0])).data.find(x => x.id_agendamento === appointment.id_agendamento)
      assert.equal(mine.status, 'Confirmado'); assert.equal(mine.resposta_admin, answer.resposta_admin); assert.equal(mine.admin.nome, 'Teste integração')
      assert.equal((await call(`/agendamentos/${appointment.id_agendamento}/cancelar`, 'PATCH', undefined, tokens[0])).status, 200)
      assert.equal((await call(`/agendamentos/${appointment.id_agendamento}/resposta`, 'PATCH', answer, adminToken)).status, 409)
      assert.ok((await call(`/horarios?plano=${plan.id_plano}`)).data.some(x => x.id_horario === slot.id_horario))
      const dashboard = await call('/admin/dashboard', 'GET', undefined, adminToken)
      assert.equal(dashboard.status, 200); assert.ok(dashboard.data.porStatus.some(x => x.nome === 'Cancelado' && x.total > 0))
    })
    await t.test('admin desativado perde acesso mesmo com token válido', async () => {
      await prisma.admin.update({ where: { id_admin: adminId }, data: { ativo: false } })
      assert.equal((await call('/admin/me', 'GET', undefined, adminToken)).status, 401)
    })
  } finally {
    if (server) await new Promise(resolve => { server.close(resolve); server.closeAllConnections() })
    await prisma.$transaction([
      prisma.agendamento.deleteMany({ where: { id_plano: { in: planIds } } }),
      prisma.horario.deleteMany({ where: { id_plano: { in: planIds } } }),
      prisma.plano.deleteMany({ where: { id_plano: { in: planIds } } }),
      prisma.cliente.deleteMany({ where: { email: { in: emails } } }),
      prisma.admin.deleteMany({ where: { id_admin: adminId } }),
    ])
    await prisma.$disconnect()
  }
})
