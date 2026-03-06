import { createToolCard } from '../components/toolCard.js'

function topbar(user) {
  return `
    <header class="topbar">
      <div class="brand">utils</div>
      <div class="topbar-right">
        <span class="muted">${user}</span>
        <a href="/auth/logout" class="link">logout</a>
      </div>
    </header>
  `
}

export async function renderDashboard({ app, api, state }) {
  const tools = (await api('/api/tools')) || []

  app.innerHTML = `
    <div class="layout">
      ${topbar(state.user)}
      <section class="dashboard-controls panel">
        <div class="search-row">
          <input id="search-input" class="input" placeholder="Search by name, tag, provider" />
          <select id="provider-filter" class="select">
            <option value="">All providers</option>
          </select>
          <a class="btn" data-link href="/admin/tools">Admin</a>
        </div>
        <div id="tag-filters" class="tag-filter-row"></div>
      </section>
      <section>
        <div id="tool-grid" class="tool-grid"></div>
        <p id="empty-state" class="empty" hidden>No tools match the current filters.</p>
      </section>
    </div>
  `

  const searchInput = app.querySelector('#search-input')
  const providerFilter = app.querySelector('#provider-filter')
  const tagFilters = app.querySelector('#tag-filters')
  const grid = app.querySelector('#tool-grid')
  const empty = app.querySelector('#empty-state')

  const providerNames = [...new Set(tools.map((t) => t.provider.name))].sort((a, b) => a.localeCompare(b))
  providerNames.forEach((name) => {
    const option = document.createElement('option')
    option.value = name
    option.textContent = name
    providerFilter.appendChild(option)
  })

  const allTags = [...new Set(tools.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b))
  const selectedTags = new Set()

  allTags.forEach((tag) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tag-pill buttonlike filter-tag'
    button.textContent = tag
    button.addEventListener('click', () => {
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag)
      } else {
        selectedTags.add(tag)
      }
      button.classList.toggle('active', selectedTags.has(tag))
      draw()
    })
    tagFilters.appendChild(button)
  })

  function matchesText(tool, text) {
    const haystack = `${tool.name} ${tool.description || ''} ${tool.provider.name} ${tool.tags.join(' ')}`.toLowerCase()
    return haystack.includes(text)
  }

  function draw() {
    const search = searchInput.value.trim().toLowerCase()
    const provider = providerFilter.value

    const filtered = tools.filter((tool) => {
      if (search && !matchesText(tool, search)) return false
      if (provider && tool.provider.name !== provider) return false
      if (selectedTags.size > 0 && !tool.tags.some((tag) => selectedTags.has(tag))) return false
      return true
    })

    grid.innerHTML = ''

    filtered.forEach((tool) => {
      const card = createToolCard(tool, {
        onLaunch: (clickedTool) => {
          window.location.href = `/api/tools/${clickedTool.id}/launch`
        },
        onTagClick: (tag) => {
          selectedTags.add(tag)
          Array.from(tagFilters.children).forEach((node) => {
            if (node.textContent === tag) {
              node.classList.add('active')
            }
          })
          draw()
        },
      })
      grid.appendChild(card)
    })

    empty.hidden = filtered.length > 0
  }

  searchInput.addEventListener('input', draw)
  providerFilter.addEventListener('change', draw)

  draw()
}
