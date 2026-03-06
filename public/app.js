import { createToastManager } from './components/toast.js'
import { renderLogin } from './pages/login.js'
import { renderDashboard } from './pages/dashboard.js'
import { renderAdminTools } from './pages/adminTools.js'
import { renderAdminProviders } from './pages/adminProviders.js'

const app = document.getElementById('app')
const toast = createToastManager()

const state = {
  user: null,
}

const routes = {
  '/': renderDashboard,
  '/admin/tools': renderAdminTools,
  '/admin/providers': renderAdminProviders,
  '/login': renderLogin,
}

function setLoading(label = 'Loading...') {
  app.innerHTML = `<div class="center-screen"><div class="loading-dot"></div><p>${label}</p></div>`
}

export async function api(path, options = {}) {
  const headers = { ...options.headers }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(path, {
    credentials: 'include',
    ...options,
    headers,
  })

  if (res.status === 401) {
    state.user = null
    if (window.location.pathname !== '/login') {
      navigate('/login', { replace: true })
    }
    return null
  }

  if (!res.ok) {
    let payload = { error: `Request failed (${res.status})` }
    try {
      payload = await res.json()
    } catch {
      // no-op
    }
    throw payload
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return null
}

export function navigate(path, { replace = false } = {}) {
  if (replace) {
    history.replaceState({}, '', path)
  } else {
    history.pushState({}, '', path)
  }
  void renderRoute()
}

async function fetchMe() {
  const res = await fetch('/auth/me', { credentials: 'include' })
  if (!res.ok) {
    return null
  }
  return res.json()
}

async function renderRoute() {
  const path = window.location.pathname
  const route = routes[path] || routes['/']

  if (path !== '/login') {
    const me = await fetchMe()
    if (!me?.user) {
      navigate('/login', { replace: true })
      return
    }
    state.user = me.user
  } else {
    const me = await fetchMe()
    if (me?.user) {
      state.user = me.user
      navigate('/', { replace: true })
      return
    }
  }

  try {
    await route({
      app,
      api,
      navigate,
      state,
      toast,
      setLoading,
    })
  } catch (error) {
    const message = error?.error || 'Unexpected error'
    toast.error(message)
    app.innerHTML = '<div class="center-screen"><p>Something went wrong.</p></div>'
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-link]')
  if (!link) return

  const href = link.getAttribute('href')
  if (!href) return

  event.preventDefault()
  navigate(href)
})

window.addEventListener('popstate', () => {
  void renderRoute()
})

setLoading()
void renderRoute()
