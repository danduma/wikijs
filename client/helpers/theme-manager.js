const STORAGE_KEY = 'wikiAppearanceMode'
const VALID_MODES = new Set(['light', 'dark', 'auto'])

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

export const computeEffectiveDarkMode = (mode, systemPrefersDark, siteDefaultDark) => {
  const normalizedMode = normalizeMode(mode)
  if (normalizedMode === 'dark') return true
  if (normalizedMode === 'light') return false
  if (normalizedMode === 'auto') {
    if (typeof systemPrefersDark === 'boolean') return systemPrefersDark
    return !!siteDefaultDark
  }
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
  const systemPrefersDark = store.get('site/systemPrefersDark')
  const effectiveDark = computeEffectiveDarkMode(normalizedMode, systemPrefersDark, siteDefaultDark)
  store.set('site/dark', effectiveDark)
}

export const initThemeManager = (store) => {
  const siteDefaultDark = store.get('site/darkDefault')

  let systemPrefersDark = null
  let mediaQuery = null

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark = !!mediaQuery.matches
  }

  store.set('site/systemPrefersDark', typeof systemPrefersDark === 'boolean' ? systemPrefersDark : false)

  let mode = normalizeMode(safeLocalStorageGet(STORAGE_KEY))

  // Backward compatibility / migration: if no local preference, migrate JWT appearance
  if (!mode) {
    const jwtAppearance = (store.get('user/appearance') || '').toString().toLowerCase()
    if (jwtAppearance === 'dark' || jwtAppearance === 'light') {
      mode = jwtAppearance
      safeLocalStorageSet(STORAGE_KEY, mode)
    }
  }

  // Default to system preference when no explicit preference exists.
  if (!mode) {
    mode = 'auto'
  }

  store.set('site/appearanceMode', mode)

  const effectiveDark = computeEffectiveDarkMode(mode, systemPrefersDark, siteDefaultDark)
  store.set('site/dark', effectiveDark)

  const onSystemChange = (e) => {
    const matches = !!(e && e.matches)
    store.set('site/systemPrefersDark', matches)
    if (store.get('site/appearanceMode') === 'auto') {
      store.set('site/dark', matches)
    }
  }

  const onStorage = (e) => {
    if (!e || e.key !== STORAGE_KEY) return
    const nextMode = normalizeMode(e.newValue)
    setAppearanceMode(nextMode, store, { persist: false })
  }

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onSystemChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onSystemChange)
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorage)
  }

  // Keep effective theme aligned with site default when no local preference is set.
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
    if (mediaQuery) {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onSystemChange)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(onSystemChange)
      }
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', onStorage)
    }
  }
}
