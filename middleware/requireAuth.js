import jwt from 'jsonwebtoken'

function wantsJson(req) {
  const accept = req.headers.accept || ''
  return accept.includes('application/json') || req.path.startsWith('/api/')
}

export function requireAuth(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : null

  const token = req.cookies?.ego_token || bearer || req.query.token

  if (!token) {
    if (wantsJson(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.redirect('/login')
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    if (req.session) {
      if (req.cookies?.ego_token && req.session.token !== token) {
        if (wantsJson(req)) {
          return res.status(401).json({ error: 'Session expired' })
        }
        return res.redirect('/login')
      }
    }

    req.user = { username: payload.sub }
    return next()
  } catch {
    if (wantsJson(req)) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.redirect('/login')
  }
}
