require('ts-node/register')
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { hashPassword, verifyPassword } = require('../lib/password')
const { generatePlanInfo } = require('../lib/ai')

test('senhas têm salts diferentes e rejeitam valor incorreto', () => {
  const first = hashPassword('teste-unitario-123'), second = hashPassword('teste-unitario-123')
  assert.notEqual(first, second)
  assert.ok(verifyPassword('teste-unitario-123', first))
  assert.equal(verifyPassword('incorreta', first), false)
})
test('IA envia somente dados do plano e aceita apenas resposta completa', async () => {
  const originalFetch = global.fetch, originalKey = process.env.OPENAI_API_KEY, originalModel = process.env.OPENAI_MODEL
  const plan = { nome_plano: 'Plano', descricao: 'Descrição', duracao_meses: 3, valor_plano: 150, email: 'privado@example.com' }
  try {
    delete process.env.OPENAI_API_KEY
    await assert.rejects(generatePlanInfo(plan), /Configure OPENAI/)
    process.env.OPENAI_API_KEY = 'chave-apenas-de-teste'; process.env.OPENAI_MODEL = 'modelo-teste'
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://api.openai.com/v1/responses')
      assert.ok(!options.body.includes('privado@example.com'))
      assert.equal(JSON.parse(options.body).store, false)
      return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Informações do plano.' }] }] }) }
    }
    const result = await generatePlanInfo(plan)
    assert.equal(result.ia_texto, 'Informações do plano.')
    assert.equal(result.ia_modelo, 'modelo-teste')
    global.fetch = async () => ({ ok: true, json: async () => ({ status: 'incomplete', output: [] }) })
    await assert.rejects(generatePlanInfo(plan), /texto completo/)
    global.fetch = async () => ({ ok: false })
    await assert.rejects(generatePlanInfo(plan), /não aceitou/)
  } finally {
    global.fetch = originalFetch
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey
    if (originalModel === undefined) delete process.env.OPENAI_MODEL; else process.env.OPENAI_MODEL = originalModel
  }
})
