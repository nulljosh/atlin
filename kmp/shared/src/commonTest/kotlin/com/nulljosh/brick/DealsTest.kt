package com.nulljosh.brick

import kotlin.test.Test
import kotlin.test.assertEquals

class DealsTest {
    private fun home(id: String, beds: Double, price: Double) = LiveListing(id = id, beds = beds, price = price)

    @Test
    fun scoresAgainstSameBedroomCount() {
        val scores = dealScores(listOf(home("a", 2.0, 1000.0), home("b", 2.0, 2000.0), home("c", 2.0, 3000.0), home("d", 5.0, 100.0)))
        assertEquals(mapOf("a" to 50, "b" to 0, "c" to -50, "d" to 0), scores)
    }
}
