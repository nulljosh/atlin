package com.nulljosh.brick

import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToLong

// Ported from src/data/listings.js. Listings are generated for whatever
// place the user is browsing, seeded by that place's coordinates, so the
// same city always yields the same homes.
// ponytail: generated inventory, no real streets (streetsNear/Overpass not
// ported -- see Geo.kt), so every listing anchors to the place centroid
// with the fallback jitter spread, same as the web app's degraded path.

val PROPERTY_TYPES = listOf("house", "condo", "townhouse")

private val NUMBER_AFTER_STREET = setOf(
    "DE", "AT", "CH", "NL", "BE", "LU", "SE", "NO", "DK", "FI", "IS", "PL", "CZ", "SK",
    "HU", "RO", "BG", "RS", "HR", "SI", "GR", "IT", "ES", "PT", "TR", "RU", "UA", "EE",
    "LV", "LT", "BR", "AR", "CL", "CO", "PE", "MX", "ID", "VN", "NP", "JP", "CN", "TW", "KR",
)

private fun formatAddress(number: Int, street: String, countryCode: String): String =
    if (countryCode in NUMBER_AFTER_STREET) "$street $number" else "$number $street"

/** Park-Miller LCG, same constants as seededRandom() in listings.js -- must
 *  produce the identical sequence for the same seed as the web app. */
private class SeededRandom(seed: Double) {
    private var s: Long = (abs(seed.toLong()) % 2147483646L).let { if (it == 0L) 1L else it }
    fun next(): Double {
        s = (s * 16807) % 2147483647
        return (s - 1).toDouble() / 2147483646.0
    }
}

private fun seedFor(place: Place): Double =
    kotlin.math.round((place.lat + 90) * 1e4) * 100003 + kotlin.math.round((place.lng + 180) * 1e4)

private fun <T> pick(rand: SeededRandom, list: List<T>): T = list[(rand.next() * list.size).toInt()]

private fun spreadFor(): Double = 0.06 * 0.5 // no bbox ported, so always the no-bbox default span

private fun roundTo(n: Double, step: Double): Double = max(step, (n / step).roundToLong() * step)

data class Listing(
    val id: String,
    val address: String,
    val neighborhood: String,
    val city: String,
    val countryCode: String,
    val currency: String,
    val imperial: Boolean,
    val mode: String,
    val price: Double,
    val beds: Int,
    val baths: Int,
    val sqft: Int,
    val type: String,
    val lat: Double,
    val lng: Double,
    val year: Int,
    val listedDaysAgo: Int,
    val refNumber: String,
)

fun generateListings(place: Place, mode: String = "sale", count: Int = 60): List<Listing> {
    val market = marketFor(place.countryCode)
    val rand = SeededRandom(seedFor(place) + if (mode == "rent") 7919.0 else 0.0)
    val listings = mutableListOf<Listing>()
    val base = 400000 * market.level

    repeat(count) { i ->
        val type = pick(rand, PROPERTY_TYPES)
        val street = place.name
        val jitter = spreadFor()

        val beds: Int; val baths: Int; val sqft: Int; val sizeFactor: Double
        when (type) {
            "house" -> {
                beds = floor(rand.next() * 4).toInt() + 2
                baths = floor(rand.next() * 3).toInt() + 1
                sqft = floor(rand.next() * 2000).toInt() + 1200
                sizeFactor = 1.6
            }
            "condo" -> {
                beds = floor(rand.next() * 3).toInt() + 1
                baths = max(1, (beds / 2.0).roundToLong().toInt())
                sqft = floor(rand.next() * 800).toInt() + 450
                sizeFactor = 0.8
            }
            else -> {
                beds = floor(rand.next() * 3).toInt() + 2
                baths = floor(rand.next() * 2).toInt() + 1
                sqft = floor(rand.next() * 1200).toInt() + 800
                sizeFactor = 1.15
            }
        }

        val spread = 0.6 + rand.next() * 0.9
        val value = base * sizeFactor * spread
        val price = if (mode == "rent") roundTo(value * market.grossYield / 12, 10.0) else roundTo(value, 1000.0)

        listings.add(
            Listing(
                id = "${place.id}-$mode-$i",
                address = formatAddress(floor(rand.next() * 220).toInt() + 1, street, market.countryCode),
                neighborhood = place.name,
                city = place.name,
                countryCode = market.countryCode,
                currency = market.currency,
                imperial = market.imperial,
                mode = mode,
                price = price,
                beds = beds,
                baths = baths,
                sqft = sqft,
                type = type,
                lat = place.lat + (rand.next() - 0.5) * jitter,
                lng = place.lng + (rand.next() - 0.5) * jitter,
                year = floor(rand.next() * 60).toInt() + 1965,
                listedDaysAgo = floor(rand.next() * 30).toInt() + 1,
                refNumber = "R${100000 + floor(rand.next() * 899999).toInt()}",
            ),
        )
    }

    return listings
}
