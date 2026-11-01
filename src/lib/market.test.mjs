// formatMoney keeps cents only when asked, and never for whole-unit currencies like the yen.
import assert from 'node:assert/strict'
import { formatMoney } from './market.js'

assert.equal(formatMoney(2400, 'USD', 'en-US'), '$2,400')
assert.equal(formatMoney(1.4, 'USD', 'en-US', 2), '$1.40') // rent per sq ft read "$1" before
assert.equal(formatMoney(1.4, 'CAD', 'en-CA', 2), '$1.40')
assert.equal(formatMoney(152.6, 'JPY', 'en-US', 2), '¥153')
console.log('market: ok')
