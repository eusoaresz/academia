require('ts-node/register')
const { test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { generatePlanInfo } = require('../lib/ai')

const originalFetch = global.fetch
const originalEnv = { ...process.env }
afterEach(() => {
  global.fetch = originalFetch
  for (const name of ['OPENAI_API_KEY', 'OPENAI_MODEL']) {
    if (originalEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnv[name]
  }
})

const plan = { nome_plano: 'Plano mensal', descricao: 'Acesso à academia', duracao_meses: 1, valor_plano: 100 }
function configure() {
  process.env.OPENAI_API_KEY = 'test-only'
  process.env.OPENAI_MODEL = 'gpt-test'
}

test('OpenAI envia somente os dados públicos e extrai o texto final', async () => {
  configure()
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions')
    assert.equal(options.headers.Authorization, 'Bearer test-only')
    assert.ok(!url.includes('test-only'))
    const body = JSON.parse(options.body)
    assert.equal(body.model, 'gpt-test')
    assert.deepEqual(JSON.parse(body.messages[1].content), { nome: plan.nome_plano, descricao: plan.descricao, duracao_meses: 1, preco_total_reais: 100 })
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Texto final.' } }] })
  }
  const result = await generatePlanInfo(plan)
  assert.equal(result.ia_texto, 'Texto final.')
  assert.equal(result.ia_modelo, 'gpt-test')
  assert.ok(result.ia_gerado_em instanceof Date)
})

test('configuração ausente ou modelo inválido não faz requisição', async () => {
  configure()
  global.fetch = () => assert.fail('Não deveria consultar')
  delete process.env.OPENAI_API_KEY
  await assert.rejects(generatePlanInfo(plan), { status: 503 })
  configure()
  process.env.OPENAI_MODEL = '../invalid'
  await assert.rejects(generatePlanInfo(plan), { status: 503 })
})

test('erros HTTP são traduzidos sem expor o corpo do provedor', async () => {
  configure()
  for (const status of [400, 401, 403, 404, 429, 500, 503]) {
    global.fetch = async () => new Response('segredo-do-provedor', { status })
    await assert.rejects(generatePlanInfo(plan), e => e.status === (status === 429 || status === 503 ? status : 502) && !e.message.includes('segredo-do-provedor'))
  }
})

test('respostas truncadas, vazias e inválidas não são aceitas', async () => {
  configure()
  for (const body of [null, {}, { choices: [] }, { choices: [{ finish_reason: 'length', message: { content: 'incompleto' } }] }, { choices: [{ finish_reason: 'stop', message: { content: ' ' } }] }, { choices: [{ finish_reason: 'stop', message: { content: 'x'.repeat(6001) } }] }]) {
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
