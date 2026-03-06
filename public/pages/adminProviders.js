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

function providerFormDefaults(provider) {
  return {
    name: provider?.name || '',
    base_url: provider?.base_url || '',
    description: provider?.description || '',
    is_ego_service: Boolean(provider?.is_ego_service),
  }
}

function createProviderForm(initial = {}) {
  const values = providerFormDefaults(initial)
  const form = document.createElement('form')
  form.className = 'inline-form panel stack'
  form.innerHTML = `
    <div class="grid-2">
      <label>Name<input name="name" class="input" required /></label>
      <label>Base URL<input name="base_url" class="input" required /></label>
    </div>
    <label>Description<textarea name="description" class="input" rows="3"></textarea></label>
    <div class="form-footer">
      <label class="inline-control">Is EGO Service <span id="ego-toggle"></span></label>
      <div class="actions"></div>
    </div>
  `

  form.elements.name.value = values.name
  form.elements.base_url.value = values.base_url
  form.elements.description.value = values.description

  const toggleSlot = form.querySelector('#ego-toggle')
  const toggle = createToggle({ checked: values.is_ego_service })
  toggleSlot.appendChild(toggle.el)

  return {
    form,
    getPayload() {
      return {
        name: String(form.elements.name.value || '').trim(),
        base_url: String(form.elements.base_url.value || '').trim(),
        description: String(form.elements.description.value || '').trim(),
        is_ego_service: toggle.value,
      }
    },
    actionsEl: form.querySelector('.actions'),
  }
}

export async function renderAdminProviders({ app, api, state, toast }) {
  app.innerHTML = adminShell(state.user, '/admin/providers')

  const main = app.querySelector('#admin-main')

  let providers = (await api('/api/providers')) || []

  let creating = false
  let editingId = null
  let confirmingDeleteId = null

  function redraw() {
    main.innerHTML = `
      <section class="admin-header">
        <h1>Providers</h1>
        <button id="new-provider" class="btn btn-primary">${creating ? 'Cancel' : 'New Provider'}</button>
      </section>
      <div id="new-provider-form"></div>
      <section class="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Base URL</th>
              <th>EGO Service</th>
              <th>Tools count</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="provider-body"></tbody>
        </table>
        <p id="providers-empty" class="empty" hidden>No providers yet - add one above.</p>
      </section>
    `

    const body = main.querySelector('#provider-body')
    const empty = main.querySelector('#providers-empty')

    empty.hidden = providers.length > 0

    providers.forEach((provider) => {
      const tr = document.createElement('tr')
      tr.innerHTML = `
        <td>${provider.name}</td>
        <td class="mono">${provider.base_url}</td>
        <td>${provider.is_ego_service ? '<span class="provider-badge ego">EGO</span>' : '<span class="provider-badge">No</span>'}</td>
        <td>${provider.tools_count || 0}</td>
        <td class="actions-cell">
          <button data-act="edit" data-id="${provider.id}" class="btn btn-small">Edit</button>
          ${
            confirmingDeleteId === provider.id
              ? `<button data-act="confirm-delete" data-id="${provider.id}" class="btn btn-danger btn-small">Are you sure? ${provider.tools_count || 0} tools use this.</button>
                 <button data-act="cancel-delete" data-id="${provider.id}" class="btn btn-small">Cancel</button>`
              : `<button data-act="delete" data-id="${provider.id}" class="btn btn-small">Delete</button>`
          }
        </td>
      `

      body.appendChild(tr)

      if (editingId === provider.id) {
        const editRow = document.createElement('tr')
        const td = document.createElement('td')
        td.colSpan = 5
        const { form, getPayload, actionsEl } = createProviderForm(provider)
        actionsEl.innerHTML = `
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" data-act="cancel-edit" class="btn">Cancel</button>
        `

        form.addEventListener('submit', async (event) => {
          event.preventDefault()
          const payload = getPayload()
          if (!payload.name || !payload.base_url) {
            toast.error('Name and base URL are required.')
            return
          }
          try {
            await api(`/api/providers/${provider.id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            })
            toast.success('Provider updated.')
            providers = (await api('/api/providers')) || []
            editingId = null
            redraw()
          } catch (error) {
            toast.error(error?.error || 'Failed to update provider.')
          }
        })

        td.appendChild(form)
        editRow.appendChild(td)
        body.appendChild(editRow)
      }
    })

    const newBtn = main.querySelector('#new-provider')
    newBtn.addEventListener('click', () => {
      creating = !creating
      redraw()
    })

    if (creating) {
      const mount = main.querySelector('#new-provider-form')
      const { form, getPayload, actionsEl } = createProviderForm()
      actionsEl.innerHTML = `<button type="submit" class="btn btn-primary">Create</button>`

      form.addEventListener('submit', async (event) => {
        event.preventDefault()
        const payload = getPayload()
        if (!payload.name || !payload.base_url) {
          toast.error('Name and base URL are required.')
          return
        }

        const submitBtn = form.querySelector('button[type="submit"]')
        submitBtn.disabled = true
        submitBtn.textContent = 'Creating...'

        try {
          await api('/api/providers', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          toast.success('Provider created.')
          providers = (await api('/api/providers')) || []
          creating = false
          redraw()
        } catch (error) {
          toast.error(error?.error || 'Failed to create provider.')
          submitBtn.disabled = false
          submitBtn.textContent = 'Create'
        }
      })

      mount.appendChild(form)
    }

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
          await api(`/api/providers/${id}`, { method: 'DELETE' })
          toast.success('Provider deleted.')
          providers = (await api('/api/providers')) || []
          confirmingDeleteId = null
          redraw()
        } catch (error) {
          toast.error(error?.error || 'Failed to delete provider.')
        }
      }
    })
  }

  redraw()
}
