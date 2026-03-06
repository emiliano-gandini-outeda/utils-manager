export function createToolCard(tool, { onLaunch, onTagClick }) {
  const card = document.createElement('article')
  card.className = `tool-card${tool.is_active ? '' : ' inactive'}`

  const top = document.createElement('div')
  top.className = 'tool-card-top'

  const avatar = document.createElement('div')
  avatar.className = 'tool-avatar'
  if (tool.icon_url) {
    const img = document.createElement('img')
    img.src = tool.icon_url
    img.alt = `${tool.name} icon`
    img.onerror = () => {
      avatar.textContent = initials(tool.name)
    }
    avatar.appendChild(img)
  } else {
    avatar.textContent = initials(tool.name)
  }

  const launchHint = document.createElement('span')
  launchHint.className = 'launch-hint'
  launchHint.textContent = '↗'

  top.append(avatar, launchHint)

  const name = document.createElement('h3')
  name.className = 'tool-name'
  name.textContent = tool.name

  const provider = document.createElement('span')
  provider.className = `provider-badge${tool.provider.is_ego_service ? ' ego' : ''}`
  provider.textContent = tool.provider.name

  const desc = document.createElement('p')
  desc.className = 'tool-desc'
  desc.textContent = tool.description || 'No description provided.'

  const tagsWrap = document.createElement('div')
  tagsWrap.className = 'tool-tags'
  if (tool.tags.length === 0) {
    const noTags = document.createElement('span')
    noTags.className = 'tag-pill'
    noTags.textContent = 'untagged'
    tagsWrap.appendChild(noTags)
  } else {
    tool.tags.forEach((tag) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tag-pill buttonlike'
      btn.textContent = tag
      btn.addEventListener('click', (event) => {
        event.stopPropagation()
        if (typeof onTagClick === 'function') {
          onTagClick(tag)
        }
      })
      tagsWrap.appendChild(btn)
    })
  }

  card.append(top, name, provider, desc, tagsWrap)

  if (!tool.is_active) {
    const inactive = document.createElement('span')
    inactive.className = 'inactive-label'
    inactive.textContent = 'inactive'
    card.appendChild(inactive)
  }

  card.addEventListener('click', () => {
    if (typeof onLaunch === 'function') {
      onLaunch(tool)
    }
  })

  return card
}

function initials(name) {
  return String(name)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
