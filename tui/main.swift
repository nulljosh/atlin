import Foundation
import SwiftTUI

// ponytail: hits Nominatim directly, same public geocoding API src/lib/geo.js calls,
// no Swift port needed since there's no existing native app or local model to reuse.

struct Place: Decodable, Identifiable {
    var id: String { "\(lat),\(lon)" }
    let displayName: String
    let lat: String
    let lon: String
    enum CodingKeys: String, CodingKey { case displayName = "display_name", lat, lon }
}

let args = CommandLine.arguments.dropFirst()
guard let query = args.first else {
    print("usage: roost-tui <place>")
    exit(1)
}

func search(_ q: String) async -> [Place] {
    guard let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
          let url = URL(string: "https://nominatim.openstreetmap.org/search?q=\(encoded)&format=json&limit=5") else { return [] }
    var req = URLRequest(url: url)
    req.setValue("roost-tui (jaybulb.com)", forHTTPHeaderField: "User-Agent")
    guard let (data, _) = try? await URLSession.shared.data(for: req) else { return [] }
    return (try? JSONDecoder().decode([Place].self, from: data)) ?? []
}

struct PlacesCard: View {
    let query: String
    let places: [Place]

    var body: some View {
        VStack(alignment: .leading) {
            Text("roost: \(query)").bold()
            if places.isEmpty {
                Text("No matches")
            } else {
                ForEach(places) { p in
                    Text("\(p.displayName) (\(p.lat), \(p.lon))")
                }
            }
        }
        .padding()
        .border()
    }
}

let semaphore = DispatchSemaphore(value: 0)
var places: [Place] = []
Task {
    places = await search(query)
    semaphore.signal()
}
semaphore.wait()

Application(rootView: PlacesCard(query: query, places: places)).start()
