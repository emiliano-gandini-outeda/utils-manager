export function createTagInput(initialTags = []) {
  const root = document.createElement('div')
  root.className = 'tag-input'

  const tagsWrap = document.createElement('div')
  tagsWrap.className = 'tag-input-list'

  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Type tag + Enter'

  root.append(tagsWrap, input)

  let tags = [...new Set((initialTags || []).map((v) => String(v).trim()).filter(Boolean))]

  function render() {
    tagsWrap.innerHTML = ''
    tags.forEach((tag) => {
      const pill = document.createElement('span')
      pill.className = 'tag-pill editable'
      pill.textContent = tag

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'tag-remove'
      remove.textContent = 'x'
      remove.addEventListener('click', () => {
        tags = tags.filter((v) => v !== tag)
        render()
      })

      pill.appendChild(remove)
      tagsWrap.appendChild(pill)
    })
  }

  function pushInputValue() {
    const raw = input.value.trim()
    if (!raw) return
    raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((tag) => {
        if (!tags.includes(tag)) {
          tags.push(tag)
        }
      })
    input.value = ''
    render()
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      pushInputValue()
    }
  })

  input.addEventListener('blur', pushInputValue)

  render()

  return {
    el: root,
    getTags() {
      pushInputValue()
      return [...tags]
    },
    setTags(nextTags = []) {
      tags = [...new Set(nextTags.map((v) => String(v).trim()).filter(Boolean))]
      render()
    },
  }
}
