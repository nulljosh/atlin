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
    var photos: [String]
    let year: Int?
    let listedDaysAgo: Int?
    let priceWas: Double?
    // Percent under the median for the same bedroom count, set by Store. Same rule as src/lib/deals.js.
    var deal = 0

    private enum CodingKeys: String, CodingKey {
        case id, source, url, address, city, currency, imperial, mode, price, beds, baths, sqft, type, lat, lng, photos, year, listedDaysAgo, priceWas
    }

    // Managers upload "Free Rent!" graphics as the first photo; a graphic is not a home.
    var withoutPromoPhotos: Listing {
        var l = self
        l.photos = photos.filter { $0.range(of: #"promo|graphic|banner|free[-_ ]?rent|move[-_ ]?in|logo|flyer|incentive|rent[-_ ]?sync|[-_](\d{3,4})x\1\b|\.png(\?|$)"#, options: [.regularExpression, .caseInsensitive]) == nil }
        return l
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

    // Same numbers as the web detail page: price per area, and for a sale a
    // monthly estimate at 20% down, 30 years, 5.5%.
    var perAreaText: String? {
        guard sqft > 0 else { return nil }
        let area = imperial == false ? sqft / 10.7639 : sqft
        let unit = imperial == false ? "m²" : "sq ft"
        return "\((price / area).formatted(.currency(code: currency).precision(.fractionLength(0)))) / \(unit)\(mode == "rent" ? " / mo" : "")"
    }

    var mortgageText: String? {
        guard mode == "sale" else { return nil }
        let r = 0.055 / 12
        let monthly = price * 0.8 * r / (1 - pow(1 + r, -360))
        return "Est. \(monthly.formatted(.currency(code: currency).precision(.fractionLength(0))))/mo · 20% down, 30 yr, 5.5%"
    }

    var statsText: String {
        [beds > 0 ? "\(beds.formatted()) bd" : "Studio", baths > 0 ? "\(baths.formatted()) ba" : nil, areaText]
            .compactMap { $0 }.joined(separator: " · ")
    }
}

enum SortMode: String, CaseIterable, Identifiable {
    case deal = "Best deal", priceLow = "Price: low", priceHigh = "Price: high", newest = "Newest", largest = "Largest"
    var id: String { rawValue }
}

enum DealMode: String, CaseIterable, Identifiable {
    case bestDeals = "Best deals", value = "2+ beds, best value", space = "Most space", fresh = "Just listed"
    var id: String { rawValue }
    var sort: SortMode { self == .space ? .largest : self == .fresh ? .newest : .deal }
    var dealsOnly: Bool { self == .bestDeals || self == .value }
    var freshOnly: Bool { self == .fresh }
    var beds: Int { self == .value ? 2 : 0 }
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

typealias Point = (lat: Double, lng: Double)

// Ray casting, the same check as insideArea in src/lib/mapPins.js.
func insideArea(_ p: Point, _ area: [Point]) -> Bool {
    var inside = false, j = area.count - 1
    for i in area.indices {
        let a = area[i], b = area[j]
        if (a.lat > p.lat) != (b.lat > p.lat), p.lng < (b.lng - a.lng) * (p.lat - a.lat) / (b.lat - a.lat) + a.lng { inside.toggle() }
        j = i
    }
    return inside
}

@MainActor @Observable
final class Store {
    private static let api = "https://atlin.jaybulb.com/api/listings"
    private let defaults = UserDefaults.standard

    var place: Place { didSet { save(place, "place"); area = nil; if place.countryCode != "US" { mode = "rent" } } }
    var mode = "rent"
    var modes = ["rent"]
    var listings: [Listing] = []
    var loading = false
    var failed = false
    var saved: [Listing] { didSet { save(saved, "saved") } }

    // Same four filters as the web app, same defaults.
    var minBeds = 0
    var minSqft = 0.0
    var type: String? = nil
    var maxPrice: Double? = nil
    var sort = SortMode.deal
    var dealsOnly = false
    var freshOnly = false
    // A loop drawn on the map, as (lat, lng) points. Only homes inside it show.
    var area: [Point]? = nil

    // Saved searches in the same shape the web writes, so one list serves both.
    var searchID: String { "\(place.id)|\(mode)|\(minBeds)|0|\(maxPrice.map { String(Int($0)) } ?? "Infinity")|\(type ?? "all")\(minSqft > 0 ? "|\(Int(minSqft))" : "")" }

    func currentSearch() -> [String: Any] {
        [
            "id": searchID,
            "label": [place.name, mode == "sale" ? "Buy" : "Rent", minBeds > 0 ? "\(minBeds)+ bd" : nil].compactMap { $0 }.joined(separator: " · "),
            "place": ["id": place.id, "name": place.name, "lat": place.lat, "lng": place.lng, "countryCode": place.countryCode],
            "mode": mode,
            "filters": ["beds": minBeds, "priceMin": 0, "priceMax": maxPrice.map { $0 as Any } ?? NSNull(), "propertyType": type ?? "all", "sort": "deal", "sqftMin": Int(minSqft)],
        ]
    }

    func apply(search s: [String: Any]) {
        if let p = s["place"] as? [String: Any], let name = p["name"] as? String, let lat = p["lat"] as? Double, let lng = p["lng"] as? Double {
            place = Place(name: name, detail: "", lat: lat, lng: lng, countryCode: (p["countryCode"] as? String) ?? place.countryCode)
        }
        if let m = s["mode"] as? String { mode = m }
        let f = s["filters"] as? [String: Any] ?? [:]
        minBeds = (f["beds"] as? Int) ?? 0
        minSqft = (f["sqftMin"] as? Double) ?? 0
        maxPrice = f["priceMax"] as? Double
        let t = f["propertyType"] as? String
        type = t == nil || t == "all" ? nil : t
    }

    // One tap sets the whole filter set. Same four modes as src/lib/modes.js.
    func apply(_ m: DealMode) {
        sort = m.sort; dealsOnly = m.dealsOnly; freshOnly = m.freshOnly; minBeds = m.beds
    }
    func isActive(_ m: DealMode) -> Bool {
        sort == m.sort && dealsOnly == m.dealsOnly && freshOnly == m.freshOnly && minBeds == m.beds
    }

    // Sale is offered only where a sale feed exists (US), the same rule as the web.
    var saleAvailable: Bool { place.countryCode == "US" && modes.contains("sale") }

    var visible: [Listing] {
        let rows = listings.filter { l in
            (minBeds == 0 || l.beds >= Double(minBeds)) && (minSqft == 0 || l.sqft >= minSqft) && (type == nil || l.type == type) && (maxPrice == nil || l.price <= maxPrice!)
                && (!dealsOnly || l.deal >= 5) && (!freshOnly || (l.listedDaysAgo ?? 99) <= 7)
                && (area.map { insideArea((l.lat, l.lng), $0) } ?? true)
        }
        // Screenshots only: homes with a real photo first, so the store images are not placeholders.
        // Homes with a real photo come first, same as the web; the sort orders each group.
        let photosFirst = true
        func order(_ a: Listing, _ b: Listing, _ by: Bool) -> Bool { photosFirst && a.photos.isEmpty != b.photos.isEmpty ? !a.photos.isEmpty : by }
        switch sort {
        case .deal: return rows.sorted { order($0, $1, $0.deal > $1.deal) }
        case .priceLow: return rows.sorted { $0.price < $1.price }
        case .priceHigh: return rows.sorted { $0.price > $1.price }
        case .newest: return rows.sorted { ($0.listedDaysAgo ?? 99) < ($1.listedDaysAgo ?? 99) }
        case .largest: return rows.sorted { $0.sqft > $1.sqft }
        }
    }

    // "Under X" steps cut from the prices on screen, so they mean something in any market.
    // Same steps as the web: 500 sq ft, or 50 m² kept in square feet.
    var metric: Bool { listings.first?.imperial == false }
    var sizeSteps: [Double] { metric ? [50, 75, 100, 150].map { ($0 * 10.7639).rounded() } : [500, 750, 1000, 1500] }
    func sizeLabel(_ v: Double) -> String { metric ? "\(Int((v / 10.7639).rounded())) m²+" : "\(Int(v).formatted()) sq ft+" }

    var priceSteps: [Double] {
        let p = listings.map(\.price).sorted()
        guard p.count >= 4 else { return [] }
        return [0.25, 0.5, 0.75].map { Self.nice(p[Int(Double(p.count - 1) * $0)]) }
    }

    private static func nice(_ n: Double) -> Double {
        let mag = pow(10, floor(log10(n)))
        return (n / (mag / 2)).rounded() * (mag / 2)
    }

    // First launch only: no saved place yet, so start from where the person is.
    var needsLocate: Bool

    init() {
        needsLocate = Self.read("place") as Place? == nil && !UserDefaults.standard.bool(forKey: "noLocate")
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
            var homes = feed.listings.compactMap(\.value).map(\.withoutPromoPhotos)
            // One photo reused across three or more different buildings is an ad or a logo.
            // Units in one building sharing its exterior shot is normal, so count buildings.
            var uses: [String: Set<String>] = [:]
            for h in homes {
                let building = (h.address ?? "").split(separator: "#").first.map { $0.trimmingCharacters(in: .whitespaces).lowercased() } ?? ""
                for u in Set(h.photos) { uses[u, default: []].insert(building) }
            }
            homes = homes.map { var h = $0; h.photos = h.photos.filter { (uses[$0]?.count ?? 0) < 3 }; return h }
            listings = Self.rankByDeal(homes)
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
        req.setValue("Atlin/1.0 (atlin.jaybulb.com)", forHTTPHeaderField: "User-Agent")
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
