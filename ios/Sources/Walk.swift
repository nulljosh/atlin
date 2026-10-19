import SwiftUI

// The walk score from src/lib/walk.js: what sits within 800 m, capped and weighted.
// Same filters, caps and weights; keep the two in step.
enum Walk {
    static let rows: [(key: String, filters: [String], cap: Double, weight: Double)] = [
        ("groceries", ["[shop~\"^(supermarket|convenience|greengrocer|bakery|butcher)$\"]"], 3, 0.25),
        ("food", ["[amenity~\"^(restaurant|cafe|fast_food|pub|bar)$\"]"], 10, 0.2),
        ("transit", ["[highway=bus_stop]", "[railway~\"^(station|tram_stop|subway_entrance)$\"]"], 6, 0.2),
        ("errands", ["[amenity~\"^(pharmacy|bank|post_office|library|clinic|doctors)$\"]"], 5, 0.15),
        ("parks", ["[leisure~\"^(park|playground)$\"]"], 3, 0.1),
        ("schools", ["[amenity~\"^(school|kindergarten)$\"]"], 2, 0.1),
    ]
    // osm.ch is left out: it only holds Switzerland.
    static let mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

    static func score(_ counts: [String: Int]) -> Int {
        Int((100 * rows.reduce(0) { $0 + $1.weight * min(Double(counts[$1.key] ?? 0), $1.cap) / $1.cap }).rounded())
    }

    static func label(_ s: Int) -> String {
        s >= 70 ? "Very walkable" : s >= 50 ? "Somewhat walkable" : s >= 25 ? "Some errands on foot" : "Car needed"
    }

    static func query(_ lat: Double, _ lng: Double) -> String {
        "[out:json][timeout:20];" + rows.map { r in
            let near = r.filters.map { "nwr(around:800,\(lat),\(lng))\($0);" }
            return (near.count > 1 ? "(\(near.joined()));" : near[0]) + "out count;"
        }.joined()
    }

    /// Counts per row key, or nil when every mirror failed.
    static func near(_ lat: Double, _ lng: Double) async -> [String: Int]? {
        struct Reply: Decodable { struct El: Decodable { let tags: [String: String] }; let elements: [El] }
        var body = URLComponents(); body.queryItems = [.init(name: "data", value: query(lat, lng))]
        for m in mirrors {
            var req = URLRequest(url: URL(string: m)!)
            req.httpMethod = "POST"
            req.httpBody = body.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B").data(using: .utf8)
            req.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
            guard let (data, res) = try? await URLSession.shared.data(for: req), (res as? HTTPURLResponse)?.statusCode == 200,
                  let reply = try? JSONDecoder().decode(Reply.self, from: data), reply.elements.count == rows.count else { continue }
            return Dictionary(uniqueKeysWithValues: zip(rows.map(\.key), reply.elements.map { Int($0.tags["total"] ?? "") ?? 0 }))
        }
        return nil
    }
}

struct WalkSection: View {
    let lat: Double, lng: Double
    @State private var counts: [String: Int]?

    var body: some View {
        Group {
            if let counts {
                let s = Walk.score(counts)
                VStack(spacing: 0) {
                    row("Walk score", "\(s) · \(Walk.label(s))")
                    Divider().padding(.leading, Space.m)
                    row("Transit stops nearby", "\(counts["transit"] ?? 0)")
                    Divider().padding(.leading, Space.m)
                    row("Schools nearby", "\(counts["schools"] ?? 0)")
                }
                .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: Space.grouped, style: .continuous))
            }
        }
        .task(id: "\(lat),\(lng)") { counts = await Walk.near(lat, lng) }
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack { Text(title).foregroundStyle(.secondary); Spacer(); Text(value) }
            .padding(.vertical, Space.m - Space.xs).padding(.horizontal, Space.m)
    }
}
