import assert from 'node:assert'
import { visibleForZoom, capForZoom } from './mapPins.js'

const listings = Array.from({ length: 60 }, (_, i) => ({ id: i, lat: 49 + i / 1000, lng: -123 }))

// The pile of overlapping price pills at city zoom is the whole reason this exists.
assert.ok(visibleForZoom(listings, 12).length < listings.length, 'city zoom must thin the pins')
assert.equal(visibleForZoom(listings, 17).length, listings.length, 'street zoom shows every home')

// More zoom never means fewer pins.
const counts = [10, 11, 12, 13, 14, 15, 16].map(z => visibleForZoom(listings, z).length)
assert.deepEqual(counts, [...counts].sort((a, b) => a - b), 'pin count rises with zoom')
assert.ok(counts.every(c => c <= listings.length), 'never invents pins')

// Striding, not slicing: a prefix would bunch the survivors in one corner.
const shown = visibleForZoom(listings, 12)
assert.notDeepEqual(shown, listings.slice(0, shown.length), 'subset must be spread, not a prefix')
assert.ok(shown[shown.length - 1].id > listings.length / 2, 'subset reaches the far end of the list')
assert.equal(new Set(shown.map(l => l.id)).size, shown.length, 'no duplicate pins')

// Even a short list can collide at city zoom.
assert.equal(visibleForZoom(listings.slice(0, 5), 11).length, 1)
assert.equal(capForZoom(20), Infinity)

// Dense neighborhoods must not draw several price pills in the same pixels.
const dense = Array.from({ length: 20 }, (_, id) => ({ id, lat: 49, lng: -123 }))
assert.equal(visibleForZoom(dense, 12, () => 'CA$500K').length, 1)
const separate = Array.from({ length: 4 }, (_, id) => ({ id, lat: 49, lng: -123 + id * 0.1 }))
assert.equal(visibleForZoom(separate, 12, () => 'CA$500K').length, 4)

console.log('mapPins: ok')

// Draw-on-map: a traced square around downtown Vancouver.
import { insideArea } from './mapPins.js'
const square = [[49.27, -123.13], [49.27, -123.10], [49.29, -123.10], [49.29, -123.13]]
assert.ok(insideArea([49.28, -123.12], square), 'a home inside the loop is kept')
assert.ok(!insideArea([49.26, -123.12], square), 'south of the loop is dropped')
assert.ok(!insideArea([49.28, -123.05], square), 'east of the loop is dropped')
// A U shape: the notch between the arms is outside even though it sits within the bounds.
const u = [[0, 0], [0, 3], [3, 3], [3, 2], [1, 2], [1, 1], [3, 1], [3, 0]]
assert.ok(!insideArea([2, 1.5], u), 'the notch of a U is outside')
assert.ok(insideArea([2, 0.5], u), 'an arm of the U is inside')
