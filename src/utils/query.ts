import * as qs from 'qs'

export function getAll() {
  return qs.parse(window.location.search, {
    ignoreQueryPrefix: true,
  })
}

export function get(key: string) {
  return (getAll()[key] as string) || ''
}

export function set(key: string, value: string) {
  const values = getAll()

  if (value) {
    values[key] = value
  } else {
    delete values[key]
  }

  const query = qs.stringify(values)
  const pathname = `${window.location.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState({}, '', pathname)
}
