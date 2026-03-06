export function createToastManager() {
  const container = document.createElement('div')
  container.className = 'toast-container'
  document.body.appendChild(container)

  function show(message, type = 'success') {
    const el = document.createElement('div')
    el.className = `toast toast-${type}`
    el.textContent = message
    container.appendChild(el)

    requestAnimationFrame(() => {
      el.classList.add('visible')
    })

    setTimeout(() => {
      el.classList.remove('visible')
      setTimeout(() => el.remove(), 200)
    }, 2800)
  }

  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
  }
}
