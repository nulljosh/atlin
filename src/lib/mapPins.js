// Select a spread-out subset, then reject pills that would overlap at the
// current zoom. Coordinates are projected into the same Web Mercator pixels
// Leaflet uses, so the check works without measuring DOM nodes after render.

const CAPS = [
  [11, 8],
  [12, 12],
  [13, 22],
  [14, 36]
]

export function capForZoom(zoom) {
  for (const [maxZoom, cap] of CAPS) {
    if (zoom <= maxZoom) return cap
  }
  return Infinity
}

function pointFor(listing, zoom) {
  const lat = Math.max(-85, Math.min(85, listing.lat)) * Math.PI / 180
  const scale = 256 * 2 ** zoom
  return {
    x: (listing.lng + 180) / 360 * scale,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / Math.PI) / 2 * scale
  }
}

export function visibleForZoom(listings, zoom, labelFor = () => '') {
  const cap = capForZoom(zoom)
  const prioritized = []
  const used = new Set()
  if (listings.length > cap) {
    const step = listings.length / cap
    for (let i = 0; i < cap; i++) {
      const index = Math.floor(i * step)
      prioritized.push(listings[index])
      used.add(index)
    }
  }
  for (let i = 0; i < listings.length; i++) {
    if (!used.has(i)) prioritized.push(listings[i])
  }

  const out = []
  const boxes = []
  for (const listing of prioritized) {
    if (out.length >= cap) break
    const point = pointFor(listing, zoom)
    const width = labelFor(listing).length * 9 + 20
    // The SVG is anchored at its bottom tip; keep a small breathing room.
    const box = { left: point.x - width / 2 - 4, right: point.x + width / 2 + 4,
      top: point.y - 34, bottom: point.y + 4 }
    if (boxes.some(other => box.left < other.right && box.right > other.left &&
      box.top < other.bottom && box.bottom > other.top)) continue
    out.push(listing)
    boxes.push(box)
  }
  return out
}

// Draw-on-map search: is a home inside the loop the person traced? Ray casting
// over [lat, lng] points; the loop closes itself, so the last point joins the first.
export function insideArea([lat, lng], area) {
  let inside = false
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const [yi, xi] = area[i]
    const [yj, xj] = area[j]
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
