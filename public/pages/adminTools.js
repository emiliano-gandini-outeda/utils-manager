import { createTagInput } from '../components/tagInput.js'
import { createToggle } from '../components/toggle.js'

function adminShell(user, activePath) {
  return `
    <div class="admin-layout">
      <aside class="sidebar">
        <a data-link href="/" class="sidebar-back">← Dashboard</a>
        <nav class="sidebar-nav">
          <a data-link href="/admin/providers" class="${activePath === '/admin/providers' ? 'active' : ''}">Providers</a>
          <a data-link href="/admin/tools" class="${activePath === '/admin/tools' ? 'active' : ''}">Tools</a>
        </nav>
        <div class="sidebar-footer">
          <span class="muted">${user}</span>
          <a href="/auth/logout" class="link">logout</a>
        </div>
      </aside>
      <main class="admin-main" id="admin-main"></main>
    </div>
  `
}

function createToolForm({ providers, initial = {} }) {
  const form = document.createElement('form')
  form.className = 'inline-form panel stack'
  form.innerHTML = `
    <div class="grid-2">
      <label>Name<input class="input" name="name" required /></label>
      <label>URL<input class="input" name="url" required placeholder="https://..." /></label>
    </div>
    <label>Description<textarea class="input" name="description" rows="3"></textarea></label>
    <div class="grid-2">
      <label>Provider<select class="select" name="provider_id" required></select></label>
      <label>Icon URL<input class="input" name="icon_url" placeholder="https://..." /></label>
    </div>
    <label>Tags<div id="tags-slot"></div></label>
    <div class="form-footer">
      <label class="inline-control">Is Active <span id="active-toggle"></span></label>
      <div class="actions"></div>
    </div>
    <div id="icon-preview" class="icon-preview" hidden></div>
  `

  const providerSelect = form.elements.provider_id
  providers.forEach((provider) => {
    const option = document.createElement('option')
    option.value = provider.id
    option.textContent = provider.name
    providerSelect.appendChild(option)
  })

  form.elements.name.value = initial.name || ''
  form.elements.url.value = initial.url || ''
  form.elements.description.value = initial.description || ''
  form.elements.icon_url.value = initial.icon_url || ''
  providerSelect.value = initial.provider?.id || providers[0]?.id || ''

  const tagInput = createTagInput(initial.tags || [])
  form.querySelector('#tags-slot').appendChild(tagInput.el)

  const toggle = createToggle({ checked: initial.is_active !== undefined ? initial.is_active : true })
  form.querySelector('#active-toggle').appendChild(toggle.el)

  const iconPreview = form.querySelector('#icon-preview')
  form.elements.icon_url.addEventListener('input', () => {
    const value = String(form.elements.icon_url.value || '').trim()
    if (!value) {
      iconPreview.hidden = true
      iconPreview.innerHTML = ''
      return
    }
    iconPreview.hidden = false
    iconPreview.innerHTML = `<img src="${value}" alt="Icon preview" />`
  })

  return {
    form,
    actionsEl: form.querySelector('.actions'),
    getPayload() {
      return {
        name: String(form.elements.name.value || '').trim(),
        url: String(form.elements.url.value || '').trim(),
        description: String(form.elements.description.value || '').trim(),
        provider_id: String(form.elements.provider_id.value || '').trim(),
        tags: tagInput.getTags(),
        icon_url: String(form.elements.icon_url.value || '').trim(),
        is_active: toggle.value,
      }
    },
  }
}

export async function renderAdminTools({ app, api, state, toast }) {
  app.innerHTML = adminShell(state.user, '/admin/tools')
  const main = app.querySelector('#admin-main')

  let providers = (await api('/api/providers')) || []
  let tools = (await api('/api/tools')) || []

  let creating = false
  let editingId = null
  let confirmingDeleteId = null
  let sortBy = 'name'
  let sortDir = 'asc'

  function sortedTools() {
    return [...tools].sort((a, b) => {
      const av =
        sortBy === 'provider'
          ? a.provider.name
          : sortBy === 'created_at'
            ? a.created_at
            : a.name
      const bv =
        sortBy === 'provider'
          ? b.provider.name
          : sortBy === 'created_at'
            ? b.created_at
            : b.name
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  function setSort(column) {
    if (sortBy === column) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy = column
      sortDir = 'asc'
    }
    redraw()
  }

  function redraw() {
    main.innerHTML = `
      <section class="admin-header">
        <h1>Tools</h1>
        <button id="new-tool" class="btn btn-primary">${creating ? 'Cancel' : 'New Tool'}</button>
      </section>
      <div id="new-tool-form"></div>
      <section class="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th><button class="sort-link" data-sort="name">Name</button></th>
              <th>URL</th>
              <th><button class="sort-link" data-sort="provider">Provider</button></th>
              <th>Tags</th>
              <th>Status</th>
              <th><button class="sort-link" data-sort="created_at">Created</button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="tool-body"></tbody>
        </table>
        <p id="tools-empty" class="empty" hidden>No tools yet - add one above.</p>
      </section>
    `

    main.querySelector('#new-tool').addEventListener('click', () => {
      creating = !creating
      redraw()
    })

    main.querySelectorAll('.sort-link').forEach((el) => {
      el.addEventListener('click', () => setSort(el.dataset.sort))
    })

    const body = main.querySelector('#tool-body')
    const empty = main.querySelector('#tools-empty')
    const items = sortedTools()

    empty.hidden = items.length > 0

    items.forEach((tool) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${tool.name}</td>
        <td class="mono truncate">${tool.url}</td>
        <td><span class="provider-badge${tool.provider.is_ego_service ? ' ego' : ''}">${tool.provider.name}</span></td>
        <td>${tool.tags.map((t) => `<span class="tag-pill">${t}</span>`).join(' ')}</td>
        <td>${tool.is_active ? '<span class="status on">active</span>' : '<span class="status off">inactive</span>'}</td>
        <td class="mono">${tool.created_at || '-'}</td>
        <td class="actions-cell">
          <button data-act="edit" data-id="${tool.id}" class="btn btn-small">Edit</button>
          ${
            confirmingDeleteId === tool.id
              ? `<button data-act="confirm-delete" data-id="${tool.id}" class="btn btn-danger btn-small">Confirm delete?</button>
                 <button data-act="cancel-delete" data-id="${tool.id}" class="btn btn-small">Cancel</button>`
              : `<button data-act="delete" data-id="${tool.id}" class="btn btn-small">Delete</button>`
          }
        </td>
      `
      body.appendChild(tr)

      if (editingId === tool.id) {
        const editRow = document.createElement('tr')
        const td = document.createElement('td')
        td.colSpan = 7

        const { form, actionsEl, getPayload } = createToolForm({ providers, initial: tool })
        actionsEl.innerHTML = `
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" data-act="cancel-edit" class="btn">Cancel</button>
        `

        form.addEventListener('submit', async (event) => {
          event.preventDefault()
          const payload = getPayload()
          if (!payload.name || !payload.url || !payload.provider_id) {
            toast.error('Name, URL and provider are required.')
            return
          }
          if (!/^https?:\/\//i.test(payload.url)) {
            toast.error('URL must start with http:// or https://')
            return
          }

          try {
            await api(`/api/tools/${tool.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            })
            toast.success('Tool updated.')
            tools = (await api('/api/tools')) || []
            editingId = null
            redraw()
          } catch (error) {
            toast.error(error?.error || 'Failed to update tool.')
          }
        })

        td.appendChild(form)
        editRow.appendChild(td)
        body.appendChild(editRow)
      }
    })

    body.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-act]')
      if (!button) return
      const id = button.dataset.id
      const action = button.dataset.act

      if (action === 'edit') {
        editingId = editingId === id ? null : id
        confirmingDeleteId = null
        redraw()
        return
      }

      if (action === 'cancel-edit') {
        editingId = null
        redraw()
        return
      }

      if (action === 'delete') {
        confirmingDeleteId = id
        redraw()
        return
      }

      if (action === 'cancel-delete') {
        confirmingDeleteId = null
        redraw()
        return
      }

      if (action === 'confirm-delete') {
        try {
          await api(`/api/tools/${id}`, { method: 'DELETE' })
          toast.success('Tool deleted.')
          tools = (await api('/api/tools')) || []
          confirmingDeleteId = null
          redraw()
        } catch (error) {
          toast.error(error?.error || 'Failed to delete tool.')
        }
      }
    })

    if (creating) {
      const mount = main.querySelector('#new-tool-form')
      const { form, actionsEl, getPayload } = createToolForm({ providers })
      actionsEl.innerHTML = `<button type="submit" class="btn btn-primary">Create</button>`

      form.addEventListener('submit', async (event) => {
        event.preventDefault()
        const payload = getPayload()
        if (!payload.name || !payload.url || !payload.provider_id) {
          toast.error('Name, URL and provider are required.')
          return
        }
        if (!/^https?:\/\//i.test(payload.url)) {
          toast.error('URL must start with http:// or https://')
          return
        }

        const submit = form.querySelector('button[type="submit"]')
        submit.disabled = true
        submit.textContent = 'Creating...'

        try {
          await api('/api/tools', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          toast.success('Tool created.')
          tools = (await api('/api/tools')) || []
          creating = false
          redraw()
        } catch (error) {
          toast.error(error?.error || 'Failed to create tool.')
          submit.disabled = false
          submit.textContent = 'Create'
        }
      })

      mount.appendChild(form)
    }
  }

  redraw()
}
