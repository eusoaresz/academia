import express from 'express'
import cors from 'cors'
import alunosRouter from './routes/alunos'
import instrutoresRouter from './routes/instrutores'
import loginRouter from './routes/login'
import planosRouter from './routes/planos'
import treinosRouter from './routes/treinos'
import pagamentosRouter from './routes/pagamentos'

const app = express()
const port = 3000

app.use(express.json())
app.use(cors())
app.use('/alunos', alunosRouter)
app.use('/clientes', instrutoresRouter)
app.use('/login', loginRouter)
app.use('/planos', planosRouter)
app.use('/treinos', treinosRouter)
app.use('/pagamentos', pagamentosRouter)

app.get('/', (req, res) => {
  res.send('API: Academia - Servidor rodando!')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})