package com.nulljosh.brick

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ListingsTest {
    @Test fun sameSeedIsDeterministic() {
        val a = generateListings(DEFAULT_PLACE, "sale", count = 10)
        val b = generateListings(DEFAULT_PLACE, "sale", count = 10)
        assertEquals(a, b)
    }

    @Test fun saleAndRentDiffer() {
        val sale = generateListings(DEFAULT_PLACE, "sale", count = 5)
        val rent = generateListings(DEFAULT_PLACE, "rent", count = 5)
        assertTrue(sale.map { it.price } != rent.map { it.price })
    }

    @Test fun marketAppliesCountryLevel() {
        val ca = marketFor("CA")
        assertEquals("CAD", ca.currency)
        assertTrue(ca.imperial)
        val unknown = marketFor("XX")
        assertEquals("USD", unknown.currency)
    }
}
