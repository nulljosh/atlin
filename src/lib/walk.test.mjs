import assert from 'node:assert'
import { walkScore, walkLabel } from './walk.js'

assert.equal(walkScore({}), 0)
assert.equal(walkScore({ groceries: 9, food: 40, transit: 20, errands: 9, parks: 5, schools: 4 }), 100)
assert.equal(walkScore({ groceries: 3, food: 10 }), 45)
assert.equal(walkLabel(45), 'walk_some')
console.log('walk ok')
