// The app was called roost; move saved favourites, place, mode and language to the brick keys once.
const keys = { roost_favorites: 'brick_favorites', 'roost-place': 'brick-place', 'roost-mode': 'brick-mode', 'roost-language': 'brick-language' }

export function migrateStorage() {
  try {
    for (const [old, next] of Object.entries(keys)) {
      const v = localStorage.getItem(old)
      if (v === null) continue
      if (localStorage.getItem(next) === null) localStorage.setItem(next, v)
      localStorage.removeItem(old)
    }
  } catch { /* storage blocked: nothing to move */ }
}
