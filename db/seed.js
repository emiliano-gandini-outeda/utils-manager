import 'dotenv/config'
import {
  initDb,
  getProviders,
  createProvider,
  createTool,
  getTools,
} from './index.js'

initDb()

const providers = getProviders()

let egoProvider = providers.find((p) => p.name === 'EGO Services')
if (!egoProvider) {
  egoProvider = createProvider({
    name: 'EGO Services',
    base_url: 'https://utils.ego-services.com',
    description: 'Internal EGO Services tooling',
    is_ego_service: true,
  })
}

let externalProvider = providers.find((p) => p.name === 'External')
if (!externalProvider) {
  externalProvider = createProvider({
    name: 'External',
    base_url: 'https://example.com',
    description: 'Third-party tools',
    is_ego_service: false,
  })
}

const tools = getTools()
const existingIndexer = tools.find((t) => t.name === 'DB Indexer')

if (!existingIndexer) {
  createTool({
    name: 'DB Indexer',
    url: 'http://localhost:3001',
    description: 'Indexes user records for fast search.',
    provider_id: egoProvider.id,
    tags: ['database', 'indexing'],
    icon_url: null,
    is_active: true,
  })
}

console.log('Seed complete.')
