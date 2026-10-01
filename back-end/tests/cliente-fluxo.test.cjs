require('ts-node/register')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const jwt = require('jsonwebtoken')
const { createMeuPlanoRouter } = require('../src/routes/meu-plano')
const { createHorariosRouter } = require('../src/routes/horarios')
const { createAgendamentosRouter } = require('../src/routes/agendamentos')
const id = 'd2446946-208a-4afc-b6ae-702af26f0b01'
process.env.JWT_KEY = 'chave-apenas-para-testes-locais'

function database() {
  const state = { alunos: [], pagamentos: [], reservas: [], planos: [
    { id_plano: 1, nome_plano: 'Start', descricao: 'Mensal', duracao_meses: 1, valor_plano: 89.9, ativo: true },
    { id_plano: 2, nome_plano: 'Performance', descricao: 'Trimestral', duracao_meses: 3, valor_plano: 239.9, ativo: true },
    { id_plano: 3, nome_plano: 'Inativo', ativo: false },
  ] }
  const profile = { id_cliente: id, nome: 'Cliente Teste', email: 'teste@example.com', telefone: '11999999999' }
  const slot = { id_horario: 10, id_plano: 2, ativo: true, data_hora: new Date(Date.now() + 86400000) }
  const db = {
    cliente: { findUnique: async () => profile, findUniqueOrThrow: async () => profile },
    aluno: {
      findUnique: async ({ where }) => state.alunos.find(a => a.cliente_id === where.cliente_id) ?? null,
      create: async ({ data }) => { const item = { ...data, id_aluno: state.alunos.length + 1, status: new Date() }; state.alunos.push(item); return item },
      update: async ({ where, data }) => Object.assign(state.alunos.find(a => a.id_aluno === where.id_aluno), data),
    },
    plano: {
      findFirst: async ({ where }) => state.planos.find(p => p.id_plano === where.id_plano && p.ativo) ?? null,
      findUnique: async ({ where }) => state.planos.find(p => p.id_plano === where.id_plano) ?? null,
    },
    pagamento: {
      findMany: async ({ where }) => state.pagamentos.filter(p => p.id_aluno === where.id_aluno && p.id_plano === where.id_plano),
      create: async ({ data }) => { const item = { ...data, id_pagamento: state.pagamentos.length + 1, data_pagamento: new Date() }; state.pagamentos.push(item); return item },
    },
    horario: {
      findMany: async ({ where }) => {
        assert.deepEqual(where.agendamentos.none.status.in, ['Pendente', 'Confirmado'])
        assert.ok(where.data_hora.gt instanceof Date)
        return (!where.id_plano || where.id_plano === slot.id_plano) && !state.reservas.length ? [slot] : []
      },
      findFirst: async ({ where }) => {
        assert.deepEqual(where.agendamentos.none.status.in, ['Pendente', 'Confirmado'])
        return where.id_horario === slot.id_horario && !state.reservas.length ? slot : null
      },
    },
    agendamento: { create: async ({ data }) => { state.reservas.push(data); return data } },
    $transaction: async (fn, options) => { assert.equal(options.isolationLevel, 'Serializable'); return fn(db) },
  }
  return { db, state }
}

async function run(fn) {
  const { db, state } = database()
  const app = express()
  app.use(express.json())
  app.use('/meu-plano', createMeuPlanoRouter(db))
  app.use('/horarios', createHorariosRouter(db))
  app.use('/agendamentos', createAgendamentosRouter(db))
  app.use((error, _req, res, _next) => res.status(500).json({ erro: error.message }))
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const token = jwt.sign({ papel: 'cliente' }, process.env.JWT_KEY, { subject: id, issuer: 'academia', audience: 'cliente' })
  async function request(path, body, authenticated = true) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  try { await fn(request, state) } finally { await new Promise(resolve => server.close(resolve)) }
}
const selection = { id_plano: 1, nome: 'Cliente Teste', data_nascimento: 1998 }

test('cliente escolhe plano, consulta conta e registra pagamento pendente pelo preço do servidor', () => run(async (request, state) => {
  assert.equal((await request('/meu-plano')).data.matriculado, false)
  assert.equal((await request('/meu-plano', { ...selection, cliente_id: 'outro', id_aluno: 900 })).status, 200)
  assert.equal(state.alunos[0].cliente_id, id)
  const account = await request('/meu-plano')
  assert.equal(account.data.plano.id_plano, 1)
  const payment = await request('/meu-plano/pagamentos', { metodo: 'PIX', valor: 0.01, status_pagamento: 'Pago', id_plano: 2 })
  assert.equal(payment.status, 201)
  assert.equal(payment.data.valor, 89.9)
  assert.equal(payment.data.id_plano, 1)
  assert.equal(payment.data.status_pagamento, 'Pendente')
  assert.equal((await request('/meu-plano')).data.pendente, true)
  assert.equal((await request('/meu-plano/pagamentos', { metodo: 'PIX' })).status, 409)
  assert.equal(state.pagamentos.length, 1)
}))

test('seleção repetida é idempotente; troca antes de pagar preserva a matrícula', () => run(async (request, state) => {
  await request('/meu-plano', selection)
  await request('/meu-plano', selection)
  assert.equal(state.alunos.length, 1)
  assert.equal((await request('/meu-plano', { id_plano: 2 })).status, 200)
  assert.equal(state.alunos.length, 1)
  assert.equal((await request('/meu-plano')).data.plano.id_plano, 2)
}))

test('pagamento pendente ou vigente impede troca e novo pagamento', () => run(async (request, state) => {
  await request('/meu-plano', selection)
  await request('/meu-plano/pagamentos', { metodo: 'Dinheiro' })
  assert.equal((await request('/meu-plano', { id_plano: 2 })).status, 409)
  state.pagamentos[0].status_pagamento = 'Pago'
  assert.equal((await request('/meu-plano', { id_plano: 2 })).status, 409)
  assert.equal((await request('/meu-plano/pagamentos', { metodo: 'Cartao' })).status, 409)
  assert.equal((await request('/meu-plano')).data.pago, true)
}))

test('pagamentos de outro plano não quitam o plano selecionado', () => run(async (request, state) => {
  await request('/meu-plano', selection)
  state.pagamentos.push({ id_aluno: 1, id_plano: 2, status_pagamento: 'Pago', data_pagamento: new Date() })
  assert.equal((await request('/meu-plano')).data.pago, false)
}))

test('rejeita conta sem sessão, plano inativo e matrícula incompleta', () => run(async (request, state) => {
  assert.equal((await request('/meu-plano', selection, false)).status, 401)
  assert.equal((await request('/meu-plano', { ...selection, id_plano: 3 })).status, 404)
  assert.equal((await request('/meu-plano', { id_plano: 1 })).status, 400)
  assert.equal((await request('/meu-plano/pagamentos', { metodo: 'PIX' })).status, 404)
  assert.equal(state.alunos.length, 0)
}))

test('vaga experimental de Performance pode ser agendada com Start, sem contratar ou pagar', () => run(async (request, state) => {
  assert.equal((await request('/horarios')).data.length, 1)
  const booked = await request('/agendamentos', { id_horario: 10, id_plano: 1 })
  assert.equal(booked.status, 201)
  assert.equal(booked.data.id_plano, 1)
  assert.equal(booked.data.id_cliente, id)
  assert.equal(state.alunos.length, 0)
  assert.equal(state.pagamentos.length, 0)
  assert.equal((await request('/horarios')).data.length, 0)
  assert.equal((await request('/agendamentos', { id_horario: 10, id_plano: 2 })).status, 409)
}))

test('agendamento recusa plano inativo e vaga inexistente', () => run(async (request, state) => {
  assert.equal((await request('/agendamentos', { id_horario: 10, id_plano: 3 })).status, 409)
  assert.equal((await request('/agendamentos', { id_horario: 99, id_plano: 1 })).status, 409)
  assert.equal(state.reservas.length, 0)
}))
