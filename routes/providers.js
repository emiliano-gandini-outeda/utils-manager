import express from 'express'
import {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  countToolsByProvider,
} from '../db/index.js'

const router = express.Router()

function normalizeProvider(body = {}) {
  return {
    name: String(body.name || '').trim(),
    base_url: String(body.base_url || '').trim(),
    description: body.description ? String(body.description).trim() : '',
    is_ego_service: Boolean(body.is_ego_service),
  }
}

router.get('/', (req, res) => {
  const providers = getProviders()
  const toolCounts = countToolsByProvider()
  res.json(
    providers.map((provider) => ({
      ...provider,
      tools_count: toolCounts[provider.id] || 0,
    }))
  )
})

router.get('/:id', (req, res) => {
  const provider = getProvider(req.params.id)
  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' })
  }
  return res.json(provider)
})

router.post('/', (req, res) => {
  const payload = normalizeProvider(req.body)
  if (!payload.name || !payload.base_url) {
    return res.status(400).json({ error: 'name and base_url are required' })
  }

  try {
    const created = createProvider(payload)
    return res.status(201).json(created)
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Provider name already exists' })
    }
    return res.status(500).json({ error: 'Failed to create provider' })
  }
})

router.put('/:id', (req, res) => {
  const existing = getProvider(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Provider not found' })
  }

  const payload = normalizeProvider(req.body)
  if (!payload.name || !payload.base_url) {
    return res.status(400).json({ error: 'name and base_url are required' })
  }

  try {
    const updated = updateProvider(req.params.id, payload)
    return res.json(updated)
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Provider name already exists' })
    }
    return res.status(500).json({ error: 'Failed to update provider' })
  }
})

router.delete('/:id', (req, res) => {
  const existing = getProvider(req.params.id)
  if (!existing) {
    return res.status(404).json({ error: 'Provider not found' })
  }

  try {
    const result = deleteProvider(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Provider not found' })
    }
    return res.json({ ok: true })
  } catch (error) {
    if (String(error.message).includes('FOREIGN KEY')) {
      return res.status(409).json({ error: 'Provider has tools and cannot be deleted' })
    }
    return res.status(500).json({ error: 'Failed to delete provider' })
  }
})

export default router
