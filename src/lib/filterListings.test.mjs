import assert from 'node:assert'
import { filterListings } from './filterListings.js'

const base = { priceMin: 0, priceMax: Infinity, beds: 0, sqftMin: 0, propertyType: 'all', sort: 'deal' }
const homes = [{ id: 'big', price: 1, beds: 1, sqft: 900 }, { id: 'small', price: 1, beds: 1, sqft: 400 }, { id: 'unknown', price: 1, beds: 1, sqft: 0 }]

assert.equal(filterListings(homes, base).length, 3, 'no size filter keeps every home')
assert.deepEqual(filterListings(homes, { ...base, sqftMin: 500 }).map(l => l.id), ['big'], 'a minimum size drops small homes and homes with no size')

// Baths: a minimum drops homes below it and homes that never said.
{
  const rows = [{ id: 'two', price: 1, beds: 1, baths: 2 }, { id: 'one', price: 1, beds: 1, baths: 1 }, { id: 'none', price: 1, beds: 1, baths: 0 }]
  assert.deepEqual(filterListings(rows, { ...base, bathsMin: 1.5 }).map(l => l.id), ['two'])
  assert.equal(filterListings(rows, base).length, 3)
  console.log('baths filter: ok')
}
