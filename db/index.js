import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { nanoid } from 'nanoid'

let db

function ensureDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
}

function parseTags(raw) {
  try {
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mapProvider(row) {
  if (!row) return null
  return {
    ...row,
    is_ego_service: Boolean(row.is_ego_service),
  }
}

function mapTool(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    description: row.description,
    tags: parseTags(row.tags),
    icon_url: row.icon_url,
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
    provider: {
      id: row.provider_id,
      name: row.provider_name,
      is_ego_service: Boolean(row.provider_is_ego_service),
    },
  }
}

export function initDb() {
  const dataDir = path.resolve(process.cwd(), process.env.DATA_DIR || './data')
  fs.mkdirSync(dataDir, { recursive: true })

  const dbPath = path.join(dataDir, 'utils-manager.sqlite')
  db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

  const schemaPath = path.resolve(process.cwd(), 'db/schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  db.exec(schema)
}

export function getProviders() {
  ensureDb()
  return db
    .prepare('SELECT id, name, base_url, description, is_ego_service, created_at FROM providers ORDER BY name ASC')
    .all()
    .map(mapProvider)
}

export function getProvider(id) {
  ensureDb()
  const row = db
    .prepare('SELECT id, name, base_url, description, is_ego_service, created_at FROM providers WHERE id = ?')
    .get(id)
  return mapProvider(row)
}

export function createProvider(data) {
  ensureDb()
  const id = nanoid(8)
  db.prepare(
    `INSERT INTO providers (id, name, base_url, description, is_ego_service)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, data.name, data.base_url, data.description || null, data.is_ego_service ? 1 : 0)
  return getProvider(id)
}

export function updateProvider(id, data) {
  ensureDb()
  db.prepare(
    `UPDATE providers
       SET name = ?, base_url = ?, description = ?, is_ego_service = ?
     WHERE id = ?`
  ).run(data.name, data.base_url, data.description || null, data.is_ego_service ? 1 : 0, id)
  return getProvider(id)
}

export function deleteProvider(id) {
  ensureDb()
  return db.prepare('DELETE FROM providers WHERE id = ?').run(id)
}

export function getTools() {
  ensureDb()
  const rows = db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.url,
         t.description,
         t.tags,
         t.icon_url,
         t.is_active,
         t.created_at,
         t.updated_at,
         p.id as provider_id,
         p.name as provider_name,
         p.is_ego_service as provider_is_ego_service
       FROM tools t
       JOIN providers p ON p.id = t.provider_id
       ORDER BY t.name ASC`
    )
    .all()
  return rows.map(mapTool)
}

export function getTool(id) {
  ensureDb()
  const row = db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.url,
         t.description,
         t.tags,
         t.icon_url,
         t.is_active,
         t.created_at,
         t.updated_at,
         p.id as provider_id,
         p.name as provider_name,
         p.is_ego_service as provider_is_ego_service
       FROM tools t
       JOIN providers p ON p.id = t.provider_id
       WHERE t.id = ?`
    )
    .get(id)
  return mapTool(row)
}

export function createTool(data) {
  ensureDb()
  const id = nanoid(8)
  db.prepare(
    `INSERT INTO tools (id, name, url, description, provider_id, tags, icon_url, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.url,
    data.description || null,
    data.provider_id,
    JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
    data.icon_url || null,
    data.is_active ? 1 : 0
  )
  return getTool(id)
}

export function updateTool(id, data) {
  ensureDb()
  db.prepare(
    `UPDATE tools
       SET name = ?,
           url = ?,
           description = ?,
           provider_id = ?,
           tags = ?,
           icon_url = ?,
           is_active = ?,
           updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    data.name,
    data.url,
    data.description || null,
    data.provider_id,
    JSON.stringify(Array.isArray(data.tags) ? data.tags : []),
    data.icon_url || null,
    data.is_active ? 1 : 0,
    id
  )
  return getTool(id)
}

export function deleteTool(id) {
  ensureDb()
  return db.prepare('DELETE FROM tools WHERE id = ?').run(id)
}

export function countToolsByProvider() {
  ensureDb()
  return db
    .prepare('SELECT provider_id, COUNT(*) as count FROM tools GROUP BY provider_id')
    .all()
    .reduce((acc, row) => {
      acc[row.provider_id] = Number(row.count)
      return acc
    }, {})
}
