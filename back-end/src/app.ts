import express from 'express'
import type { ErrorRequestHandler } from 'express'
import cors from 'cors'
import alunos from './routes/alunos'
import instrutores from './routes/instrutores'
import login from './routes/login'
import planos from './routes/planos'
import treinos from './routes/treinos'
import pagamentos from './routes/pagamentos'
import clientes from './routes/clientes'
import admin from './routes/admin'
import horarios from './routes/horarios'
import agendamentos from './routes/agendamentos'
import meuPlano from './routes/meu-plano'
import { authenticate } from './middleware/auth'

export const app = express()
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)
app.disable('x-powered-by')
const origins = (process.env.FRONTEND_URL ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x => x.trim())
app.use(cors({ origin: origins }))
app.use(express.json({ limit: '32kb' }))
app.get('/health', (_req, res) => { res.json({ ok: true }) })
app.get('/', (_req, res) => { res.json({ nome: 'Movimente API' }) })
app.use('/clientes', clientes)
app.use('/meu-plano', meuPlano)
app.use('/admin', admin)
app.use('/planos', planos)
app.use('/horarios', horarios)
app.use('/agendamentos', agendamentos)
app.use('/login', login)
app.use('/alunos', authenticate('admin'), alunos)
app.use('/instrutores', authenticate('admin'), instrutores)
app.use('/treinos', authenticate('admin'), treinos)
app.use('/pagamentos', authenticate('admin'), pagamentos)
app.use((_req, res) => { res.status(404).json({ erro: 'Recurso não encontrado.' }) })
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  const code = error?.code
  const status = code === 'P2002' || code === 'P2003' || code === 'P2034' ? 409 : code === 'P2025' ? 404 : error?.status ?? 500
  const message = code === 'P2002' ? 'Já existe um registro com esses dados.' : code === 'P2003' ? 'Registro vinculado a outros dados. Desative-o para preservar o histórico.' : code === 'P2034' ? 'Os dados mudaram. Tente novamente.' : code === 'P2025' ? 'Registro não encontrado.' : status === 500 ? 'Não foi possível concluir a operação.' : error.message
  res.status(status).json({ erro: message })
}
app.use(errors)
