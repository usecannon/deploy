export function getItem(key: string) {
  try {
    return window.localStorage?.getItem(key) || null
  } catch (err) {
    // Some browsers throw when a user blocks cookies
    console.error(err)
    return null
  }
}

export function setItem(key: string, value: string | null) {
  try {
    if (value) {
      window.localStorage?.setItem(key, value)
    } else {
      window.localStorage?.removeItem(key)
    }
  } catch (err) {
    // Some browsers throw when a user blocks cookies
    console.error(err)
    return
  }
}
