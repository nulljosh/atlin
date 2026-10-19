// node src/data/listings.test.mjs
import assert from 'node:assert/strict'
import { generateListings } from './listings.js'
import { marketFor, formatMoney, formatArea } from '../lib/market.js'

const tokyo = { id: 't', name: '東京', countryCode: 'JP', lat: 35.68, lng: 139.76 }
const berlin = { id: 'b', name: 'Berlin', countryCode: 'DE', lat: 52.52, lng: 13.4 }
const nowhere = { id: 'x', name: 'Somewhere', countryCode: '', lat: 0, lng: 0 }

const jp = generateListings(tokyo, [{ name: '青山通り', lat: 35.67, lng: 139.71 }])
assert.deepEqual(jp, generateListings(tokyo, [{ name: '青山通り', lat: 35.67, lng: 139.71 }]), 'same place must give same homes')
assert.match(jp[0].address, /^青山通り \d+$/, 'JP puts the number after the street')
assert.ok(jp.every(l => l.price > 0 && l.beds > 0 && l.sqft > 0 && l.currency === 'JPY'))

const de = generateListings(berlin, [{ name: 'Kastanienallee', lat: 52.53, lng: 13.41 }])
assert.match(de[0].address, /^Kastanienallee \d+$/)
assert.notEqual(de[0].price, jp[0].price, 'different places, different inventory')

const rent = generateListings(tokyo, [{ name: '青山通り', lat: 35.67, lng: 139.71 }], 'rent')
assert.ok(rent[0].price < jp[0].price / 50, 'rent is a monthly figure, not a sale price')
assert.ok(rent.every(l => l.mode === 'rent' && l.price > 0))

// An unmapped country still prices in a currency.
assert.equal(generateListings(nowhere, [{ name: 'Main St', lat: 0, lng: 0 }])[0].currency, 'USD')

assert.equal(marketFor('jp').currency, 'JPY', 'country code case must not matter')
assert.ok(!formatMoney(52000000, 'JPY', 'ja').includes('.'), 'yen has no minor unit')
assert.ok(formatArea(1200, false, 'de').includes('m'), 'metric outside the imperial set')

// No streets means no way to tell land from water, so no sample homes rather than pins in the sea.
assert.deepEqual(generateListings({ ...berlin, bbox: [52.34, 13.09, 52.68, 13.76] }, []), [])
const near = generateListings(berlin, [{ name: 'Kastanienallee', lat: 52.53, lng: 13.41 }])
assert.ok(near.every(l => Math.abs(l.lat - 52.53) <= 0.002 && Math.abs(l.lng - 13.41) <= 0.002), 'homes stay about a block from their street')

console.log('listings: ok')
