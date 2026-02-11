const STORAGE_KEY = 'wikiAppearanceMode'
const VALID_MODES = new Set(['light', 'dark'])

const safeLocalStorageGet = (key) => {
  try {
    return window.localStorage.getItem(key)
  } catch (err) {
    return null
  }
}

const safeLocalStorageSet = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch (err) {
    // ignore (blocked storage, private mode, etc.)
  }
}

const safeLocalStorageRemove = (key) => {
  try {
    window.localStorage.removeItem(key)
  } catch (err) {
    // ignore
  }
}

const normalizeMode = (value) => {
  if (typeof value !== 'string') return null
  const mode = value.trim().toLowerCase()
  return VALID_MODES.has(mode) ? mode : null
}

export const computeEffectiveDarkMode = (mode, siteDefaultDark) => {
  const normalizedMode = normalizeMode(mode)
  if (normalizedMode === 'dark') return true
  if (normalizedMode === 'light') return false
  return !!siteDefaultDark
}

export const setAppearanceMode = (mode, store, { persist = true } = {}) => {
  const normalizedMode = normalizeMode(mode)

  if (persist) {
    if (normalizedMode) {
      safeLocalStorageSet(STORAGE_KEY, normalizedMode)
    } else {
      safeLocalStorageRemove(STORAGE_KEY)
    }
  }

  store.set('site/appearanceMode', normalizedMode)

  const siteDefaultDark = store.get('site/darkDefault')
  const effectiveDark = computeEffectiveDarkMode(normalizedMode, siteDefaultDark)
  store.set('site/dark', effectiveDark)
}

export const initThemeManager = (store) => {
  const siteDefaultDark = store.get('site/darkDefault')

  const storedMode = safeLocalStorageGet(STORAGE_KEY)
  let mode = normalizeMode(storedMode)

  if (!mode && storedMode !== null) {
    safeLocalStorageRemove(STORAGE_KEY)
  }

  // Backward compatibility / migration: if no local preference, migrate JWT appearance
  if (!mode) {
    const jwtAppearance = (store.get('user/appearance') || '').toString().toLowerCase()
    if (jwtAppearance === 'dark' || jwtAppearance === 'light') {
      mode = jwtAppearance
      safeLocalStorageSet(STORAGE_KEY, mode)
    }
  }

  store.set('site/appearanceMode', mode)

  const effectiveDark = computeEffectiveDarkMode(mode, siteDefaultDark)
  store.set('site/dark', effectiveDark)

  const onStorage = (e) => {
    if (!e || e.key !== STORAGE_KEY) return
    const nextMode = normalizeMode(e.newValue)
    setAppearanceMode(nextMode, store, { persist: false })
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorage)
  }

  // Keep effective theme aligned with site default when no explicit user preference is set.
  const unwatch = store.watch(
    (state) => state.site.darkDefault,
    (nextDefault) => {
      const currentMode = store.get('site/appearanceMode')
      if (!normalizeMode(currentMode)) {
        store.set('site/dark', !!nextDefault)
      }
    }
  )

  return () => {
    if (unwatch) unwatch()
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', onStorage)
    }
  }
}
