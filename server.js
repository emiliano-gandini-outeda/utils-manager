import express from 'express'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

import { initDb } from './db/index.js'
import authRoutes from './routes/auth.js'
import toolRoutes from './routes/tools.js'
import providerRoutes from './routes/providers.js'
import { requireAuth } from './middleware/requireAuth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

initDb()

app.use(express.json())
app.use(cookieParser())
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'replace-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    },
  })
)

app.use('/auth', authRoutes)
app.get('/auth', (req, res) => {
  res.redirect('/login')
})
app.use('/public', express.static(path.join(__dirname, 'public')))
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.use(requireAuth)
app.use('/api/tools', toolRoutes)
app.use('/api/providers', providerRoutes)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

const port = Number(process.env.PORT || 3000)
app.listen(port, () => {
  console.log(`Utils Manager listening on http://localhost:${port}`)
})
