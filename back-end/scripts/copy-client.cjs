const fs = require('node:fs')
const path = require('node:path')
fs.cpSync(path.resolve(__dirname, '../generated/prisma'), path.resolve(__dirname, '../dist/generated/prisma'), { recursive: true })
