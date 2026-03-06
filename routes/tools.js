import express from 'express'
import { getTool, getTools, createTool, updateTool, deleteTool, getProvider } from '../db/index.js'

const router = express.Router()

function normalizeTool(body = {}) {
  const tags = Array.isArray(body.tags)
    ? body.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : []

  return {
    name: String(body.name || '').trim(),
    url: String(body.url || '').trim(),
    description: body.description ? String(body.description).trim() : '',
    provider_id: String(body.provider_id || '').trim(),
    tags,
    icon_url: body.icon_url ? String(body.icon_url).trim() : '',
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
  }
}

router.get('/', (req, res) => {
  res.json(getTools())
})

router.get('/:id', (req, res) => {
  const tool = getTool(req.params.id)
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' })
  }
  return res.json(tool)
})

router.post('/', (req, res) => {
  const payload = normalizeTool(req.body)
  if (!payload.name || !payload.url || !payload.provider_id) {
    return res.status(400).json({ error: 'name, url and provider_id are required' })
  }
  if (!payload.url.startsWith('http://') && !payload.url.startsWith('https://')) {
    return res.status(400).json({ error: 'url must start with http:// or https://' })
  }

  if (!getProvider(payload.provider_id)) {
    return res.status(400).json({ error: 'provider_id is invalid' })
  }

  try {
    const created = createTool(payload)
    return res.status(201).json(created)
  } catch {
    return res.status(500).json({ error: 'Failed to create tool' })
  }
})

router.put('/:id', (req, res) => {
  const existing = getTool(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Tool not found' })
  }

  const payload = normalizeTool(req.body)
  if (!payload.name || !payload.url || !payload.provider_id) {
    return res.status(400).json({ error: 'name, url and provider_id are required' })
  }
  if (!payload.url.startsWith('http://') && !payload.url.startsWith('https://')) {
    return res.status(400).json({ error: 'url must start with http:// or https://' })
  }
  if (!getProvider(payload.provider_id)) {
    return res.status(400).json({ error: 'provider_id is invalid' })
  }

  try {
    const updated = updateTool(req.params.id, payload)
    return res.json(updated)
  } catch {
    return res.status(500).json({ error: 'Failed to update tool' })
  }
})

router.delete('/:id', (req, res) => {
  const existing = getTool(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Tool not found' })
  }

  try {
    const result = deleteTool(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Tool not found' })
    }
    return res.json({ ok: true })
  } catch {
    return res.status(500).json({ error: 'Failed to delete tool' })
  }
})

router.get('/:id/launch', (req, res) => {
  const tool = getTool(req.params.id)
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' })
  }

  if (tool.provider.is_ego_service) {
    const token = req.cookies?.ego_token
    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' })
    }
    const separator = tool.url.includes('?') ? '&' : '?'
    return res.redirect(`${tool.url}${separator}token=${encodeURIComponent(token)}`)
  }

  return res.redirect(tool.url)
})

export default router
