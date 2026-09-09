import express from 'express'
import cors from 'cors'

import routePlanos from './routes/planos'
import routeAlunos from './routes/alunos'
import routesInstrutores from './routes/instrutores'
import routesLogin from './routes/login'

const app = express()
const port = 3000

app.use(express.json())
app.use(cors())

app.use("/planos", routePlanos)
app.use("/alunos", routeAlunos)
app.use("/instrutores", routesInstrutores)
app.use("/instrutores/login", routesLogin)

app.get('/', (req, res) => {
  res.send('API: Revenda de Veículos')
})

app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})