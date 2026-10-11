import Foundation
import Observation

struct Listing: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let source: String?
    let url: String?
    let address: String?
    let city: String?
    let currency: String
    let imperial: Bool?
    let mode: String
    let price: Double
    let beds: Double
    let baths: Double
    let sqft: Double
    let type: String
    let lat: Double
    let lng: Double
    let photos: [String]
    let year: Int?
    let listedDaysAgo: Int?
    // Percent under the median for the same bedroom count, set by Store. Same rule as src/lib/deals.js.
    var deal = 0

    private enum CodingKeys: String, CodingKey {
        case id, source, url, address, city, currency, imperial, mode, price, beds, baths, sqft, type, lat, lng, photos, year, listedDaysAgo
    }

    var priceText: String {
        let p = price.formatted(.currency(code: currency).precision(.fractionLength(0)))
        return mode == "rent" ? "\(p)/mo" : p
    }

    var areaText: String? {
        guard sqft > 0 else { return nil }
        return imperial == false
            ? "\(Int((sqft / 10.7639).rounded()).formatted()) m²"
            : "\(Int(sqft).formatted()) sq ft"
    }

    var statsText: String {
        [beds > 0 ? "\(beds.formatted()) bd" : nil, baths > 0 ? "\(baths.formatted()) ba" : nil, areaText]
            .compactMap { $0 }.joined(separator: " · ")
    }
}

struct Place: Codable, Hashable, Identifiable, Sendable {
    var id: String { "\(lat),\(lng)" }
    let name: String
    let detail: String
    let lat: Double
    let lng: Double
    let countryCode: String
    // The town a neighbourhood belongs to; the listing feeds index by town.
    var area: String? = nil

    static let start = Place(name: "Vancouver", detail: "British Columbia, Canada", lat: 49.2827, lng: -123.1207, countryCode: "CA")
}

// One bad row from a feed should not blank the whole city.
private struct Lossy<T: Decodable>: Decodable {
    let value: T?
    init(from decoder: Decoder) throws { value = try? T(from: decoder) }
}

private struct Feed: Decodable {
    let listings: [Lossy<Listing>]
    let modes: [String]?
}

private struct NominatimHit: Decodable {
    struct Address: Decodable { let country_code: String?; let state: String?; let country: String?; let city: String?; let town: String?; let municipality: String?; let village: String? }
    let name: String?
    let display_name: String
    let lat: String
    let lon: String
    let address: Address?
}

@MainActor @Observable
final class Store {
    private static let api = "https://brick.jaybulb.com/api/listings"
    private let defaults = UserDefaults.standard

    var place: Place { didSet { save(place, "place") } }
    var mode = "rent"
    var modes = ["rent"]
    var listings: [Listing] = []
    var loading = false
    var failed = false
    var saved: [Listing] { didSet { save(saved, "saved") } }

    init() {
        place = Self.read("place") ?? .start
        saved = Self.read("saved") ?? []
    }

    func isSaved(_ l: Listing) -> Bool { saved.contains { $0.id == l.id } }

    func toggle(_ l: Listing) {
        if isSaved(l) { saved.removeAll { $0.id == l.id } } else { saved.insert(l, at: 0) }
    }

    func load() async {
        var c = URLComponents(string: Self.api)!
        c.queryItems = [
            .init(name: "lat", value: String(place.lat)), .init(name: "lng", value: String(place.lng)),
            .init(name: "country", value: place.countryCode), .init(name: "city", value: place.name), .init(name: "area", value: place.area ?? ""),
            .init(name: "mode", value: mode)
        ]
        loading = true
        failed = false
        defer { loading = false }
        do {
            let (data, _) = try await URLSession.shared.data(from: c.url!)
            let feed = try JSONDecoder().decode(Feed.self, from: data)
            listings = Self.rankByDeal(feed.listings.compactMap(\.value))
            if let m = feed.modes, !m.isEmpty { modes = m }
        } catch is CancellationError {
        } catch {
            if (error as? URLError)?.code == .cancelled { return }
            listings = []
            failed = true
        }
    }

    static func rankByDeal(_ homes: [Listing]) -> [Listing] {
        let byBeds = Dictionary(grouping: homes, by: { Int($0.beds) }).mapValues { $0.map(\.price).sorted() }
        return homes.map { l in
            var l = l
            let p = byBeds[Int(l.beds)] ?? []
            let typical = p.count < 3 ? 0 : (p.count % 2 == 1 ? p[p.count / 2] : (p[p.count / 2 - 1] + p[p.count / 2]) / 2)
            let isRoom = (l.address ?? "").range(of: #"\broom\b"#, options: [.regularExpression, .caseInsensitive]) != nil
            let deal = typical > 0 && !isRoom ? Int(((typical - l.price) / typical * 100).rounded()) : 0
            // Over 60% under is almost always a room share or a typo, not a find.
            l.deal = deal > 60 ? 0 : deal
            return l
        }
        .sorted { $0.deal > $1.deal }
    }

    func search(_ query: String) async -> [Place] {
        var c = URLComponents(string: "https://nominatim.openstreetmap.org/search")!
        c.queryItems = [
            .init(name: "q", value: query), .init(name: "format", value: "jsonv2"),
            .init(name: "addressdetails", value: "1"), .init(name: "limit", value: "8"),
            .init(name: "featureType", value: "settlement")
        ]
        var req = URLRequest(url: c.url!)
        // Nominatim's usage policy asks every client to identify itself.
        req.setValue("Brick-iOS/1.0 (brick.jaybulb.com)", forHTTPHeaderField: "User-Agent")
        guard let (data, _) = try? await URLSession.shared.data(for: req),
              let hits = try? JSONDecoder().decode([NominatimHit].self, from: data) else { return [] }
        return hits.compactMap { h in
            guard let lat = Double(h.lat), let lng = Double(h.lon) else { return nil }
            let name = h.name ?? h.display_name.components(separatedBy: ",").first ?? h.display_name
            let detail = [h.address?.state, h.address?.country].compactMap { $0 }.joined(separator: ", ")
            let a = h.address
            return Place(name: name, detail: detail, lat: lat, lng: lng, countryCode: (a?.country_code ?? "").uppercased(),
                         area: a?.city ?? a?.town ?? a?.municipality ?? a?.village)
        }
    }

    private func save<T: Encodable>(_ value: T, _ key: String) {
        defaults.set(try? JSONEncoder().encode(value), forKey: key)
    }

    private static func read<T: Decodable>(_ key: String) -> T? {
        UserDefaults.standard.data(forKey: key).flatMap { try? JSONDecoder().decode(T.self, from: $0) }
    }
}
