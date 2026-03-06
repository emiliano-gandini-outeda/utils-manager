import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = express.Router()
const revokedTokens = new Map()

function cleanupRevoked() {
  const now = Date.now()
  for (const [token, expiresAt] of revokedTokens.entries()) {
    if (expiresAt <= now) {
      revokedTokens.delete(token)
    }
  }
}

function getTokenExpiry(token) {
  const decoded = jwt.decode(token)
  if (decoded && typeof decoded === 'object' && typeof decoded.exp === 'number') {
    return decoded.exp * 1000
  }
  return Date.now() + 8 * 60 * 60 * 1000
}

function revokeToken(token) {
  if (!token) return
  cleanupRevoked()
  revokedTokens.set(token, getTokenExpiry(token))
}

function isRevoked(token) {
  cleanupRevoked()
  return revokedTokens.has(token)
}

function parseUsers() {
  const usersRaw = process.env.USERS || ''
  const map = new Map()

  for (const entry of usersRaw.split(',').map((v) => v.trim()).filter(Boolean)) {
    const idx = entry.indexOf(':')
    if (idx === -1) continue
    const username = entry.slice(0, idx).trim()
    const hash = entry.slice(idx + 1).trim()
    if (!username || !hash) continue
    map.set(username, hash)
  }

  return map
}

const users = parseUsers()

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' })
  }

  const hash = users.get(username)
  if (!hash) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const match = await bcrypt.compare(password, hash)
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign({ sub: username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  })

  req.session.user = username
  req.session.token = token

  res.cookie('ego_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })

  return res.json({ ok: true, user: username })
})

router.get('/logout', (req, res) => {
  const token = req.cookies?.ego_token
  revokeToken(token)
  res.clearCookie('ego_token')
  req.session.destroy(() => {
    res.redirect('/login')
  })
})

router.get('/me', (req, res) => {
  const token = req.cookies?.ego_token
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (isRevoked(token)) {
      return res.status(401).json({ error: 'Session expired' })
    }
    if (req.session?.token !== token) {
      return res.status(401).json({ error: 'Session expired' })
    }
    return res.json({ user: payload.sub })
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
})

router.get('/verify', (req, res) => {
  const internalSecret = process.env.INTERNAL_AUTH_SECRET || ''
  const providedSecret = req.headers['x-internal-auth']

  if (!internalSecret || providedSecret !== internalSecret) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : null
  const token = bearer || req.query.token

  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (isRevoked(token)) {
      return res.status(401).json({ error: 'Revoked token' })
    }
    return res.json({ ok: true, user: payload.sub })
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
