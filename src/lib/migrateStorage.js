// The app was called roost, then brick. Move saved favourites, place, mode and language to the atlin keys once.
const names = ['favorites', 'place', 'mode', 'language']
const sep = n => (n === 'favorites' ? '_' : '-')

export function migrateStorage() {
  try {
    for (const n of names) {
      const next = `atlin${sep(n)}${n}`
      for (const app of ['roost', 'brick']) {
        const old = `${app}${sep(n)}${n}`
        const v = localStorage.getItem(old)
        if (v === null) continue
        if (localStorage.getItem(next) === null) localStorage.setItem(next, v)
        localStorage.removeItem(old)
      }
    }
  } catch { /* storage blocked: nothing to move */ }
}
