// One tap sets a whole filter set. The same four modes ship on iOS and macOS (Store.swift, DealMode).
export const modes = [
  { key: 'ask_s_deals', set: { sort: 'deal', dealsOnly: true, freshOnly: false, beds: 0 } },
  { key: 'ask_s_beds', set: { sort: 'deal', dealsOnly: true, freshOnly: false, beds: 2 } },
  { key: 'ask_s_space', set: { sort: 'sqft-desc', dealsOnly: false, freshOnly: false, beds: 0 } },
  { key: 'ask_s_new', set: { sort: 'newest', dealsOnly: false, freshOnly: true, beds: 0 } }
]

export const modeActive = (mode, filters) => Object.entries(mode.set).every(([k, v]) => filters[k] === v)
