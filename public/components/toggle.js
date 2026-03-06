export function createToggle({ checked = false, onChange } = {}) {
  const wrapper = document.createElement('label')
  wrapper.className = 'toggle'

  const input = document.createElement('input')
  input.type = 'checkbox'
  input.checked = checked

  const slider = document.createElement('span')
  slider.className = 'toggle-slider'

  input.addEventListener('change', () => {
    if (typeof onChange === 'function') {
      onChange(input.checked)
    }
  })

  wrapper.append(input, slider)

  return {
    el: wrapper,
    input,
    get value() {
      return input.checked
    },
    set value(next) {
      input.checked = Boolean(next)
    },
  }
}
