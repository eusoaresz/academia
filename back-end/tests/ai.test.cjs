require('ts-node/register')
const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { generatePlanInfo } = require('../lib/ai')
const originalFetch = global.fetch
const originalEnv = { ...process.env }
afterEach(() => {
  global.fetch = originalFetch
  for (const name of ['GEMINI_API_KEY', 'GEMINI_MODEL']) {
    if (originalEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnv[name]
  }
})
const plan = { nome_plano: 'Plano mensal', descricao: 'Acesso à academia', duracao_meses: 1, valor_plano: 100, email: 'nao-enviar@example.com' }
function configure() { process.env.GEMINI_API_KEY = 'test-only'; process.env.GEMINI_MODEL = 'gemini-test' }
test('Gemini envia somente os dados públicos e extrai o texto final', async () => {
  configure()
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent')
    assert.equal(options.headers['x-goog-api-key'], 'test-only')
    assert.ok(!url.includes('test-only'))
    const body = JSON.parse(options.body)
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { nome: plan.nome_plano, descricao: plan.descricao, duracao_meses: 1, preco_total_reais: 100 })
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'interno' }, { text: 'Texto final.' }] } }] })
  }
  const result = await generatePlanInfo(plan)
  assert.equal(result.ia_texto, 'Texto final.')
  assert.equal(result.ia_modelo, 'gemini-test')
  assert.ok(result.ia_gerado_em instanceof Date)
})
test('configuração ausente ou modelo inválido não faz requisição', async () => {
  configure()
  global.fetch = () => assert.fail('Não deveria consultar')
  delete process.env.GEMINI_API_KEY
  await assert.rejects(generatePlanInfo(plan), { status: 503 })
  configure(); process.env.GEMINI_MODEL = '../invalid'
  await assert.rejects(generatePlanInfo(plan), { status: 503 })
})
test('erros HTTP são traduzidos sem expor o corpo do provedor', async () => {
  configure()
  for (const status of [400, 401, 403, 404, 429, 500, 503]) {
    global.fetch = async () => new Response('segredo-do-provedor', { status })
    await assert.rejects(generatePlanInfo(plan), e => e.status === (status === 429 || status === 503 ? status : 502) && !e.message.includes('segredo-do-provedor'))
  }
})
test('respostas bloqueadas, truncadas, vazias e inválidas não são aceitas', async () => {
  configure()
  for (const body of [null, {}, { promptFeedback: { blockReason: 'SAFETY' } }, { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'incompleto' }] } }] }, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: ' ' }] } }] }, { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'x'.repeat(6001) }] } }] }]) {
    global.fetch = async () => Response.json(body)
    await assert.rejects(generatePlanInfo(plan), { status: 502 })
  }
  global.fetch = async () => new Response('não é JSON')
  await assert.rejects(generatePlanInfo(plan), { status: 502 })
})
test('falha de rede recebe mensagem controlada', async () => {
  configure()
  global.fetch = async () => { throw new Error('detalhe privado') }
  await assert.rejects(generatePlanInfo(plan), e => e.status === 502 && !e.message.includes('privado'))
})
