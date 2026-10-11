package com.nulljosh.roost

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.math.roundToInt

// Real listings from the same /api/listings the web and iPhone apps use. The
// endpoint holds the feed keys and the cache; this only reads it.

@Serializable
data class LiveListing(
    val id: String,
    val source: String? = null,
    val url: String? = null,
    val address: String? = null,
    val city: String? = null,
    val currency: String = "USD",
    val imperial: Boolean? = null,
    val mode: String = "rent",
    val price: Double = 0.0,
    val beds: Double = 0.0,
    val baths: Double = 0.0,
    val sqft: Double = 0.0,
    val type: String = "house",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val listedDaysAgo: Int? = null,
)

@Serializable
private data class Feed(val listings: List<LiveListing> = emptyList())

class LiveClient(private val base: String = "https://brick.jaybulb.com") {
    private val http = HttpClient {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true; coerceInputValues = true }) }
        // A first look at a new town runs the feed live and can take half a minute.
        install(HttpTimeout) { requestTimeoutMillis = 90_000 }
    }

    suspend fun listings(place: Place, mode: String): List<LiveListing> =
        http.get("$base/api/listings") {
            parameter("lat", place.lat)
            parameter("lng", place.lng)
            parameter("country", place.countryCode)
            parameter("city", place.name)
            parameter("area", place.area)
            parameter("mode", mode)
        }.body<Feed>().listings.filter { it.price > 0 }
}

/** Percent under the median price for the same bedroom count; 0 when fewer
 *  than three comparable homes. Same rule as src/lib/deals.js. */
fun dealScores(listings: List<LiveListing>): Map<String, Int> {
    val byBeds = listings.groupBy { it.beds.toInt() }.mapValues { (_, g) -> g.map { it.price }.sorted() }
    return listings.associate { l ->
        val prices = byBeds.getValue(l.beds.toInt())
        val typical = if (prices.size < 3) 0.0 else if (prices.size % 2 == 1) prices[prices.size / 2]
            else (prices[prices.size / 2 - 1] + prices[prices.size / 2]) / 2
        l.id to if (typical == 0.0) 0 else ((typical - l.price) / typical * 100).roundToInt()
    }
}
