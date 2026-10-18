package com.nulljosh.atlin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

@Composable
fun AtlinTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF96654E)), content = content)

// Real listings from the shared /api/listings first. The seeded generator only
// stands in where no feed covers the place, and says so on screen.
// ponytail: English-only (the web app has 27 languages), no map.
@Composable
fun AppScreen(geo: GeoClient = GeoClient(), live: LiveClient = LiveClient()) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Place>>(emptyList()) }
    var place by remember { mutableStateOf(DEFAULT_PLACE) }
    var mode by remember { mutableStateOf("rent") }
    var real by remember { mutableStateOf<List<LiveListing>?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(place, mode) {
        real = null
        real = runCatching { live.listings(place, mode) }.getOrDefault(emptyList())
    }

    fun search() {
        scope.launch { runCatching { results = geo.searchPlaces(query) } }
    }

    Surface {
        Column(Modifier.fillMaxSize().padding(24.dp)) {
            Text("Atlin", style = MaterialTheme.typography.headlineMedium)
            Text("Browsing ${place.label}", modifier = Modifier.padding(top = 4.dp))
            Row(Modifier.padding(top = 16.dp)) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    label = { Text("Search any town") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Button(onClick = { search() }, modifier = Modifier.padding(top = 8.dp)) { Text("Search") }
            results.forEach { p ->
                OutlinedButton(
                    onClick = { place = p; results = emptyList(); query = "" },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                ) { Text(p.label, maxLines = 1) }
            }
            Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("rent" to "For rent", "sale" to "For sale").forEach { (m, label) ->
                    if (m == mode) Button(onClick = {}) { Text(label) }
                    else OutlinedButton(onClick = { mode = m }) { Text(label) }
                }
            }

            val homes = real
            when {
                homes == null -> Row(Modifier.padding(top = 24.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    Text("Pulling live listings for ${place.name}")
                }
                homes.size >= 5 -> {
                    val deals = remember(homes) { dealScores(homes) }
                    val sorted = remember(homes) { homes.sortedByDescending { deals[it.id] ?: 0 } }
                    Text("${homes.size} real listings, best deals first", Modifier.padding(top = 16.dp), style = MaterialTheme.typography.labelLarge)
                    LazyColumn(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(sorted, key = { it.id }) { l ->
                            val deal = deals[l.id] ?: 0
                            Column {
                                Text(l.address ?: l.city ?: "", style = MaterialTheme.typography.titleMedium)
                                val area = if (l.sqft > 0) " - " + formatArea(l.sqft.toInt(), l.imperial ?: true) else ""
                                val per = if (l.mode == "rent") "/mo" else ""
                                Text("${formatMoney(l.price, l.currency)}$per - ${l.beds.toInt()} bd / ${l.baths.toInt()} ba$area")
                                if (deal >= 5) Text("$deal% under typical", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
                else -> {
                    val samples = remember(place, mode) { generateListings(place, mode) }
                    Text("Sample homes. No live feed covers ${place.name} yet.", Modifier.padding(top = 16.dp), style = MaterialTheme.typography.labelLarge)
                    LazyColumn(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(samples) { l ->
                            Column {
                                Text(l.address, style = MaterialTheme.typography.titleMedium)
                                Text("${formatMoney(l.price, l.currency)} - ${l.beds} bd / ${l.baths} ba - ${formatArea(l.sqft, l.imperial)}")
                            }
                        }
                    }
                }
            }
        }
    }
}
