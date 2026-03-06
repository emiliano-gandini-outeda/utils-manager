export async function renderLogin({ app, api, navigate, toast }) {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-card">
        <h1>utils</h1>
        <p class="muted">sign in to access internal tools</p>
        <form id="login-form" class="stack">
          <label>
            Username
            <input name="username" type="text" autocomplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <p id="login-error" class="error-inline" hidden></p>
          <button id="login-btn" class="btn btn-primary" type="submit">Sign in</button>
        </form>
      </section>
    </main>
  `

  const form = app.querySelector('#login-form')
  const button = app.querySelector('#login-btn')
  const errorEl = app.querySelector('#login-error')

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    errorEl.hidden = true

    const formData = new FormData(form)
    const username = String(formData.get('username') || '').trim()
    const password = String(formData.get('password') || '')

    if (!username || !password) {
      errorEl.textContent = 'Username and password are required.'
      errorEl.hidden = false
      return
    }

    button.disabled = true
    button.textContent = 'Signing in...'

    try {
      const payload = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })

      if (payload?.ok) {
        navigate('/')
        toast.success('Welcome back.')
      }
    } catch (error) {
      errorEl.textContent = error?.error || 'Invalid credentials'
      errorEl.hidden = false
    } finally {
      button.disabled = false
      button.textContent = 'Sign in'
    }
  })
}
