package com.nulljosh.atlin

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

data class Place(
    val id: String,
    val name: String,
    val label: String,
    val countryCode: String,
    val lat: Double,
    val lng: Double,
    // The town a neighbourhood belongs to; the listing feeds index by town.
    val area: String = "",
)

val DEFAULT_PLACE = Place(
    id = "vancouver-bc", name = "Vancouver", label = "Vancouver, British Columbia, Canada",
    countryCode = "CA", lat = 49.2827, lng = -123.1207,
)

@Serializable
private data class NominatimAddress(
    @SerialName("country_code") val countryCode: String? = null,
    val city: String? = null,
    val town: String? = null,
    val village: String? = null,
    val municipality: String? = null,
)

@Serializable
private data class NominatimResult(
    @SerialName("place_id") val placeId: Long,
    @SerialName("display_name") val displayName: String,
    val name: String? = null,
    val lat: String,
    val lon: String,
    val address: NominatimAddress? = null,
    val boundingbox: List<String>? = null,
)

// Ported from src/lib/geo.js's searchPlaces only. streetsNear (Overpass real
// street anchors) is not ported -- generateListings already has a fallback
// path for that case, so this just always takes it. See roadmap.md.
class GeoClient {
    private val http = HttpClient {
        install(ContentNegotiation) { json(Json { ignoreUnknownKeys = true }) }
    }

    suspend fun searchPlaces(query: String, language: String = "en"): List<Place> {
        if (query.isBlank()) return emptyList()
        val results: List<NominatimResult> = http.get("https://nominatim.openstreetmap.org/search") {
            parameter("q", query)
            parameter("format", "jsonv2")
            parameter("addressdetails", "1")
            parameter("limit", "8")
            parameter("accept-language", language)
            parameter("featureType", "settlement")
        }.body()
        return results.filter { it.boundingbox != null }.map { r ->
            val town = r.address?.city ?: r.address?.town ?: r.address?.municipality ?: r.address?.village ?: ""
            val name = r.name?.takeIf { it.isNotBlank() } ?: r.displayName.substringBefore(",")
            Place(
                id = r.placeId.toString(),
                name = name,
                label = r.displayName,
                countryCode = (r.address?.countryCode ?: "").uppercase(),
                lat = r.lat.toDoubleOrNull() ?: 0.0,
                lng = r.lon.toDoubleOrNull() ?: 0.0,
                area = town,
            )
        }
    }
}
