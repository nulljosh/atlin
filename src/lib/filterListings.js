// Shared listing filter+sort. Used by the Listings page and the WebMCP tools so
// an agent searching listings gets exactly what the UI would show.
export function filterListings(listings, filters, favoriteSet = new Set()) {
  const result = listings.filter(l => {
    if (l.price < filters.priceMin || l.price > filters.priceMax) return false
    if (filters.beds > 0 && l.beds < filters.beds) return false
    // A home with no size given can't be shown to meet a minimum size.
    if (filters.sqftMin > 0 && !(l.sqft >= filters.sqftMin)) return false
    if (filters.propertyType !== 'all' && l.type !== filters.propertyType) return false
    if (filters.favoritesOnly && !favoriteSet.has(l.id)) return false
    if (filters.dealsOnly && !(l.deal >= 5)) return false
    if (filters.freshOnly && l.listedDaysAgo > 7) return false
    return true
  })

  switch (filters.sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'newest':
      result.sort((a, b) => a.listedDaysAgo - b.listedDaysAgo)
      break
    case 'deal':
      result.sort((a, b) => (b.deal ?? 0) - (a.deal ?? 0))
      break
    case 'sqft-desc':
      result.sort((a, b) => b.sqft - a.sqft)
      break
  }

  // Homes with a real photo come first; the sort still orders each group.
  const hasPhoto = l => Boolean(l.photo ?? l.photos?.length)
  return [...result.filter(hasPhoto), ...result.filter(l => !hasPhoto(l))]
}
