import 'dotenv/config'
import { app } from './app'
import { prisma } from '../lib/prisma'
if (!process.env.DATABASE_URL || !process.env.JWT_KEY) throw new Error('Configure DATABASE_URL e JWT_KEY antes de iniciar.')
const server = app.listen(Number(process.env.PORT ?? 3000), () => console.log(`API na porta ${process.env.PORT ?? 3000}`))
function shutdown() { server.close(() => { void prisma.$disconnect().finally(() => process.exit(0)) }) }
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
