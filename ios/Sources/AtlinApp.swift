import SwiftUI
import MapKit

@main
struct AtlinApp: App {
    @State private var store = Store()
    @State private var auth = Auth()

    var body: some Scene {
        WindowGroup {
            BrowseView().environment(store).environment(auth)
            #if os(macOS)
                .frame(minWidth: 960, minHeight: 640)
            #endif
        }
        #if os(macOS)
        .defaultSize(width: 1280, height: 800)
        #endif
    }
}

// One set of numbers for both platforms, the same ones the web uses: an 8 point grid, cards 28, grouped 20.
enum Space {
    static let xs: CGFloat = 4, s: CGFloat = 8, m: CGFloat = 16, l: CGFloat = 24, xl: CGFloat = 32
    static let margin: CGFloat = 20, control: CGFloat = 48, card: CGFloat = 28, grouped: CGFloat = 20
}

struct BrowseView: View {
    @Environment(Store.self) private var store
    @State private var camera: MapCameraPosition = .automatic
    @State private var lonSpan = 0.22
    @State private var mapWidth: Double = 390

    // Same rule as the web map (src/lib/mapPins.js): cap the pins by zoom, then drop any
    // pill that would sit on top of one already placed.
    private var pins: [Listing] {
        let zoom = log2(360 / max(lonSpan, 0.0005))
        // The phone and Mac maps are bigger than the web's, so the caps are 3x; the overlap check does the thinning.
        let cap = zoom <= 11 ? 24 : zoom <= 12 ? 36 : zoom <= 13 ? 66 : zoom <= 14 ? 108 : Int.max
        let scale = 360 * mapWidth / max(lonSpan, 0.0005)  // points per world width
        var out: [Listing] = [], boxes: [CGRect] = []
        for l in store.visible {
            if out.count >= cap { break }
            let lat = max(-85, min(85, l.lat)) * .pi / 180
            let x = (l.lng + 180) / 360 * scale
            let y = (1 - log(tan(.pi / 4 + lat / 2)) / .pi) / 2 * scale
            // Native pills are bigger than the web's: ~10 points a character, 34 tall.
            let w = Double(l.priceText.count) * 10 + 28
            let box = CGRect(x: x - w / 2 - 4, y: y - 38, width: w + 8, height: 42)
            if boxes.contains(where: { $0.intersects(box) }) { continue }
            out.append(l); boxes.append(box)
        }
        return out
    }

    @State private var drawing = false
    @State private var trace: [CLLocationCoordinate2D] = []

    private var map: some View {
        MapReader { proxy in
            Map(position: $camera, interactionModes: drawing ? [] : .all) {
                ForEach(pins) { l in
                    Annotation(l.priceText, coordinate: .init(latitude: l.lat, longitude: l.lng)) {
                        PricePill(text: l.priceText)
                    }
                    .annotationTitles(.hidden)
                }
                if let area = store.area {
                    MapPolygon(coordinates: (area + [area[0]]).map { .init(latitude: $0.lat, longitude: $0.lng) })
                        .foregroundStyle(Color.accentColor.opacity(0.08))
                        .stroke(Color.accentColor, lineWidth: 2)
                }
                if trace.count > 1 {
                    MapPolyline(coordinates: trace).stroke(Color.accentColor, lineWidth: 2)
                }
            }
            .mapStyle(.standard(pointsOfInterest: .excludingAll))
            .onMapCameraChange(frequency: .onEnd) { lonSpan = $0.region.span.longitudeDelta }
            .onGeometryChange(for: Double.self) { $0.size.width } action: { mapWidth = $0 }
            // While drawing, a finger or the pointer traces a loop; letting go keeps the homes inside it.
            .overlay {
                if drawing {
                    Color.clear.contentShape(Rectangle()).gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { if let c = proxy.convert($0.location, from: .local) { trace.append(c) } }
                            .onEnded { _ in
                                if trace.count > 2 { store.area = trace.map { ($0.latitude, $0.longitude) } }
                                trace = []; drawing = false
                            }
                    )
                }
            }
            .ignoresSafeArea()
        }
        .overlay(alignment: .topTrailing) {
            Button {
                if store.area != nil { store.area = nil } else { drawing.toggle() }
            } label: {
                Label(store.area != nil ? "Clear area" : drawing ? "Trace a loop on the map" : "Draw",
                      systemImage: store.area != nil ? "xmark" : "scribble")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, Space.m)
                    .frame(height: Space.control)
                    .foregroundStyle(drawing ? .white : .primary)
                    .background(drawing ? Color.accentColor : .clear, in: Capsule())
                    .glassPill()
            }
            .buttonStyle(.plain)
            .padding(Space.m)
        }
    }

    var body: some View {
        content
            .task {
                guard store.needsLocate else { return }
                store.needsLocate = false
                if let here = await Locator().current() { store.place = here }
            }
            .task(id: "\(store.place.id)-\(store.mode)") {
                store.listings = []
                // On iPhone the list sheet covers the bottom half, so aim a little south of the town.
                #if os(iOS)
                let lift = 0.04
                #else
                let lift = 0.0
                #endif
                camera = .region(.init(center: .init(latitude: store.place.lat - lift, longitude: store.place.lng),
                                       span: .init(latitudeDelta: 0.22, longitudeDelta: 0.22)))
                await store.load()
            }
    }

    #if os(iOS)
    // The map fills the screen. Listings live in a glass sheet that rides over it,
    // the way Maps does it: drag it down for the map, up for the list.
    @State private var sheet = true
    // QA and screenshots: `-detent large` opens the list expanded.
    @State private var detent: PresentationDetent = UserDefaults.standard.string(forKey: "detent") == "large" ? .large : .fraction(0.45)

    private var content: some View {
        map.sheet(isPresented: $sheet) {
            ListingSheet(detent: $detent)
                .presentationDetents([.height(120), .fraction(0.45), .large], selection: $detent)
                .presentationBackgroundInteraction(.enabled(upThrough: .fraction(0.45)))
                .presentationCornerRadius(Space.card)
                .interactiveDismissDisabled()
                .glassSheetBackground()
        }
    }
    #else
    // The Mac gets what the web gets on a wide screen: the list on the left, the map filling the rest.
    private var content: some View {
        HStack(spacing: 0) {
            ListingSheet(detent: .constant(.large))
                .frame(width: 440)
                .background(.regularMaterial)
            map
        }
    }
    #endif
}

extension View {
    // iOS 26 sheets are Liquid Glass at partial heights on their own; earlier
    // systems get the thin material so the map still shows through.
    @ViewBuilder func glassSheetBackground() -> some View {
        #if os(iOS)
        if #available(iOS 26, *) { self } else { presentationBackground(.ultraThinMaterial) }
        #else
        self
        #endif
    }

    @ViewBuilder func glassPill() -> some View {
        if #available(iOS 26, macOS 26, *) { glassEffect(.regular, in: Capsule()) } else { background(.ultraThinMaterial, in: Capsule()) }
    }
}

struct ListingSheet: View {
    @Environment(Store.self) private var store
    @Environment(Auth.self) private var auth
    @State private var showAccount = false
    @Binding var detent: PresentationDetent
    @State private var query = ""
    @State private var results: [Place] = []
    @State private var path: [Listing] = []

    var body: some View {
        @Bindable var store = store
        NavigationStack(path: $path) {
            Group {
                if store.loading && store.listings.isEmpty {
                    VStack(spacing: Space.m) {
                        ProgressView()
                        Text("Pulling live listings for \(store.place.name)").font(.footnote).foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if store.listings.isEmpty {
                    ContentUnavailableView(
                        store.failed ? "Could not load listings" : "No listings here yet",
                        systemImage: store.failed ? "wifi.slash" : "house",
                        description: Text(store.failed ? "Check your connection and pull to try again." : "Atlin only shows real listings. Try a bigger town nearby.")
                    )
                } else {
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: Space.l) {
                            FilterRow()
                            Text("\(store.visible.count) listings").font(.footnote).foregroundStyle(.secondary)
                            if store.visible.isEmpty {
                                ContentUnavailableView("Nothing matches", systemImage: "line.3.horizontal.decrease", description: Text("Loosen a filter."))
                            }
                            ForEach(store.visible) { l in
                                NavigationLink(value: l) { ListingCard(listing: l) }.buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, Space.margin)
                        .padding(.vertical, Space.m)
                    }
                }
            }
            .onChange(of: store.listings.count) { _, n in
                // `-openFirst 1` jumps to the top listing, for screenshots.
                if n > 0, path.isEmpty, UserDefaults.standard.bool(forKey: "openFirst"), let first = store.visible.first(where: { !$0.photos.isEmpty }) ?? store.visible.first { path = [first] }
            }
            .refreshable { await store.load() }
            .sheet(isPresented: $showAccount) { AccountView() }
            .onChange(of: auth.user) { _, u in
                // Signing in merges this device's saved homes with the account's, both ways.
                guard u != nil else { return }
                let mine = Set(store.saved.map(\.id)), theirs = Set(auth.favorites)
                for l in store.listings where theirs.contains(l.id) && !mine.contains(l.id) { store.saved.append(l) }
                Task { await auth.saveFavorites(Array(mine.union(theirs))) }
            }
            .navigationTitle(store.place.name)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .navigationDestination(for: Listing.self) { ListingDetail(listing: $0) }
            .toolbar {
                ToolbarItem(placement: .navigation) {
                    NavigationLink { SavedView() } label: { Image(systemName: "heart") }
                        .accessibilityLabel("Saved homes")
                }
                if auth.user != nil {
                    ToolbarItem(placement: .primaryAction) {
                        let saved = auth.searches.contains { ($0["id"] as? String) == store.searchID }
                        Button {
                            var list = auth.searches.filter { ($0["id"] as? String) != store.searchID }
                            if !saved { list.insert(store.currentSearch(), at: 0) }
                            Task { await auth.saveSearches(Array(list.prefix(12))) }
                        } label: { Image(systemName: saved ? "bookmark.fill" : "bookmark") }
                        .accessibilityLabel(saved ? "Remove saved search" : "Save search")
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { showAccount = true } label: { Image(systemName: auth.user == nil ? "person.crop.circle" : "person.crop.circle.fill") }
                        .accessibilityLabel(auth.user == nil ? "Sign in" : "Account")
                }
                if store.saleAvailable {
                    ToolbarItem(placement: .primaryAction) {
                        Picker("Mode", selection: $store.mode) {
                            Text("Rent").tag("rent")
                            Text("Buy").tag("sale")
                        }
                        .pickerStyle(.segmented)
                    }
                }
            }
            #if os(iOS)
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search any town")
            #else
            .searchable(text: $query, prompt: "Search any town")
            #endif
            .searchSuggestions {
                ForEach(results) { p in
                    Button { choose(p) } label: {
                        VStack(alignment: .leading) {
                            Text(p.name)
                            Text(p.detail).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            // Return takes the top match, so typing a town and pressing Return just works.
            .onSubmit(of: .search) {
                Task {
                    let list = results.isEmpty ? await store.search(query) : results
                    if let p = list.first { choose(p) }
                }
            }
            .task(id: query) {
                guard query.count > 1 else { results = []; return }
                // Nominatim allows one request a second, so wait for a pause in typing.
                try? await Task.sleep(for: .milliseconds(600))
                guard !Task.isCancelled else { return }
                results = await store.search(query)
            }
        }
    }

    private func choose(_ p: Place) {
        store.place = p
        query = ""
        results = []
        detent = .fraction(0.45)
    }
}

// Beds, type, price and sort: one swipeable row of capsule menus, like the web filter bar.
struct FilterRow: View {
    @Environment(Store.self) private var store

    var body: some View {
        @Bindable var store = store
        VStack(alignment: .leading, spacing: Space.s) {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Space.s) {
                ForEach(DealMode.allCases) { m in
                    Button { store.apply(m) } label: {
                        Text(m.rawValue).font(.subheadline.weight(.medium))
                            .padding(.horizontal, Space.m).frame(minHeight: 44)
                            .background(store.isActive(m) ? AnyShapeStyle(Color.primary) : AnyShapeStyle(.quaternary), in: Capsule())
                            .foregroundStyle(store.isActive(m) ? AnyShapeStyle(.background) : AnyShapeStyle(.primary))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Space.s) {
                FilterMenu(title: "Beds", value: store.minBeds == 0 ? "Any" : "\(store.minBeds)+", active: store.minBeds > 0) {
                    Picker("Beds", selection: $store.minBeds) {
                        Text("Any beds").tag(0)
                        ForEach(1...4, id: \.self) { Text("\($0)+ beds").tag($0) }
                    }
                }
                FilterMenu(title: "Size", value: store.minSqft == 0 ? "Any" : store.sizeLabel(store.minSqft), active: store.minSqft > 0) {
                    Picker("Size", selection: $store.minSqft) {
                        Text("Any size").tag(0.0)
                        ForEach(store.sizeSteps, id: \.self) { Text(store.sizeLabel($0)).tag($0) }
                    }
                }
                FilterMenu(title: "Type", value: store.type.map { $0 == "condo" ? "Apartment" : $0.capitalized } ?? "All", active: store.type != nil) {
                    Picker("Type", selection: $store.type) {
                        Text("All types").tag(String?.none)
                        Text("House").tag(String?.some("house"))
                        Text("Apartment").tag(String?.some("condo"))
                        Text("Townhouse").tag(String?.some("townhouse"))
                    }
                }
                FilterMenu(title: "Price", value: store.maxPrice.map { "Under \($0.formatted(.number.notation(.compactName)))" } ?? "Any", active: store.maxPrice != nil) {
                    Picker("Price", selection: $store.maxPrice) {
                        Text("Any price").tag(Double?.none)
                        ForEach(store.priceSteps, id: \.self) { Text("Under \($0.formatted(.number.notation(.compactName)))").tag(Double?.some($0)) }
                    }
                }
                FilterMenu(title: "Sort", value: store.sort.rawValue, active: store.sort != .deal) {
                    Picker("Sort", selection: $store.sort) {
                        ForEach(SortMode.allCases) { Text($0.rawValue).tag($0) }
                    }
                }
            }
        }
        }
    }
}

struct FilterMenu<Content: View>: View {
    let title: String
    let value: String
    let active: Bool
    @ViewBuilder var content: Content

    var body: some View {
        Menu { content } label: {
            VStack(alignment: .leading, spacing: 0) {
                Text(title).font(.caption2).foregroundStyle(active ? Color.white.opacity(0.8) : .secondary)
                HStack(spacing: Space.xs) {
                    Text(value).font(.subheadline.weight(.medium))
                    Image(systemName: "chevron.down").font(.caption2.weight(.semibold))
                }
            }
            .padding(.horizontal, Space.m)
            .frame(minHeight: Space.control)
            .background(active ? AnyShapeStyle(Color.accentColor) : AnyShapeStyle(.quaternary), in: Capsule())
            .foregroundStyle(active ? .white : .primary)
        }
        .buttonStyle(.plain)
    }
}

struct PricePill: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, Space.s).padding(.vertical, 5)
            .background(Color.accentColor, in: Capsule())
            .foregroundStyle(.white)
    }
}

struct Photo: View {
    let url: String?
    var width = 640
    // No photo: a grey street map of where the home is, same as the web card.
    var at: (lat: Double, lng: Double)? = nil
    @Environment(\.colorScheme) private var scheme

    private var map: URL? {
        guard url == nil, let at else { return nil }
        let span = 0.009, h = width * 11 / 16
        let dLat = span * Double(h) / Double(width) * cos(at.lat * .pi / 180)
        let bbox = [at.lng - span / 2, at.lat - dLat / 2, at.lng + span / 2, at.lat + dLat / 2].map { String(format: "%.5f", $0) }.joined(separator: ",")
        return URL(string: "https://server.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/export?bbox=\(bbox)&bboxSR=4326&size=\(width),\(h)&imageSR=3857&format=jpg&f=image")
    }

    // Feed photos are full-size originals; wsrv.nl serves a resized WebP, same as the web app.
    private var resized: URL? {
        guard let url, url.hasPrefix("http"),
              let q = url.addingPercentEncoding(withAllowedCharacters: .alphanumerics) else { return nil }
        return URL(string: "https://wsrv.nl/?url=\(q)&w=\(width)&h=\(width * 11 / 16)&fit=cover&output=webp&q=72")
    }

    var body: some View {
        AsyncImage(url: resized ?? map) { phase in
            if let image = phase.image, map != nil {
                image.resizable().scaledToFill()
                    .grayscale(1).colorInvert(scheme == .dark).contrast(0.9)
                    .overlay { Circle().fill(Color.accentColor).frame(width: 18, height: 18).overlay(Circle().stroke(.white, lineWidth: 3)).shadow(radius: 3) }
            } else if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Rectangle().fill(.quaternary).overlay { Image(systemName: "house").foregroundStyle(.secondary) }
            }
        }
    }
}

private extension View {
    @ViewBuilder func colorInvert(_ on: Bool) -> some View { if on { colorInvert() } else { self } }
}

// The web card, on a phone: photo on top, price, stats, address.
struct ListingCard: View {
    let listing: Listing

    var body: some View {
        VStack(alignment: .leading, spacing: Space.s) {
            Photo(url: listing.photos.first, width: 800, at: (listing.lat, listing.lng))
                .aspectRatio(16.0 / 11.0, contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: Space.grouped, style: .continuous))
            HStack(spacing: Space.s) {
                Text(listing.priceText).font(.title3.weight(.bold))
                if listing.deal >= 5 {
                    Text("\(listing.deal)% under typical")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, Space.s).padding(.vertical, Space.xs)
                        .background(.green.opacity(0.14), in: Capsule())
                        .foregroundStyle(.green)
                }
            }
            .padding(.horizontal, Space.xs)
            VStack(alignment: .leading, spacing: 2) {
                Text(listing.statsText).font(.subheadline).foregroundStyle(.secondary)
                Text(listing.address ?? listing.city ?? "").font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            }
            .padding(.horizontal, Space.xs)
        }
        .accessibilityElement(children: .combine)
    }
}

struct ListingDetail: View {
    @Environment(Auth.self) private var auth
    @Environment(Store.self) private var store
    let listing: Listing

    // Same rule as the web: same mode and bedroom count, within 25% on price.
    private var similar: [Listing] {
        Array(store.listings.filter {
            $0.id != listing.id && $0.mode == listing.mode && floor($0.beds) == floor(listing.beds) && abs($0.price - listing.price) <= listing.price * 0.25
        }.prefix(4))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Space.l) {
                #if os(iOS)
                TabView {
                    ForEach(listing.photos.isEmpty ? [""] : listing.photos, id: \.self) { p in
                        Photo(url: p.isEmpty ? nil : p, width: 1200, at: (listing.lat, listing.lng)).frame(maxWidth: .infinity).clipped()
                    }
                }
                .tabViewStyle(.page)
                .frame(height: 280)
                #else
                Photo(url: listing.photos.first, width: 1200, at: (listing.lat, listing.lng)).aspectRatio(16.0 / 9.0, contentMode: .fit).clipped()
                #endif

                VStack(alignment: .leading, spacing: Space.s) {
                    Text(listing.priceText).font(.largeTitle.bold())
                    if let was = listing.priceWas, was > listing.price {
                        Text("Dropped \((was - listing.price).formatted(.currency(code: listing.currency).precision(.fractionLength(0))))").font(.subheadline.weight(.semibold)).foregroundStyle(Color.accentColor)
                    }
                    if listing.deal >= 5 {
                        Text("\(listing.deal)% under typical for its size nearby").font(.subheadline.weight(.semibold)).foregroundStyle(.green)
                    }
                    Text(listing.statsText).font(.title3).foregroundStyle(.secondary)
                    Text(listing.address ?? listing.city ?? "")
                    ForEach([listing.perAreaText, listing.mortgageText].compactMap { $0 }, id: \.self) {
                        Text($0).font(.subheadline).foregroundStyle(.secondary)
                    }
                    if let days = listing.listedDaysAgo {
                        Text(days == 0 ? "Listed today" : days == 1 ? "Listed yesterday" : "Listed \(days) days ago").font(.footnote).foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, Space.margin)

                if let h = listing.priceHistory, h.count > 1 {
                    PriceHistory(points: h, currency: listing.currency).padding(.horizontal, Space.margin)
                }
                WalkSection(lat: listing.lat, lng: listing.lng).padding(.horizontal, Space.margin)

                Map(initialPosition: .region(.init(center: .init(latitude: listing.lat, longitude: listing.lng),
                                                   span: .init(latitudeDelta: 0.02, longitudeDelta: 0.02)))) {
                    Marker(listing.priceText, coordinate: .init(latitude: listing.lat, longitude: listing.lng)).tint(Color.accentColor)
                }
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: Space.grouped, style: .continuous))
                .padding(.horizontal, Space.margin)
                .allowsHitTesting(false)

                if let link = listing.url.flatMap(URL.init) {
                    Link(destination: link) {
                        Text("View original listing").frame(maxWidth: .infinity, minHeight: Space.control)
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.capsule)
                    .padding(.horizontal, Space.margin)
                }

                if !similar.isEmpty {
                    Text("Similar homes").font(.title2.weight(.semibold)).padding(.horizontal, Space.margin).padding(.top, Space.l)
                    LazyVStack(spacing: Space.l) {
                        ForEach(similar) { l in
                            NavigationLink(value: l) { ListingCard(listing: l) }.buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Space.margin)
                }
            }
            .padding(.bottom, Space.l)
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            if let link = listing.url.flatMap(URL.init) {
                ShareLink(item: link) { Image(systemName: "square.and.arrow.up") }.accessibilityLabel("Share")
            }
            Button { store.toggle(listing); Task { await auth.saveFavorites(store.saved.map(\.id)) } } label: {
                Image(systemName: store.isSaved(listing) ? "heart.fill" : "heart")
            }
            .accessibilityLabel(store.isSaved(listing) ? "Remove from saved" : "Save")
        }
    }
}

struct SavedView: View {
    @Environment(Store.self) private var store

    var body: some View {
        Group {
            if store.saved.isEmpty {
                ContentUnavailableView("Nothing saved", systemImage: "heart", description: Text("Tap the heart on a home to keep it here."))
            } else {
                ScrollView {
                    LazyVStack(spacing: Space.l) {
                        ForEach(store.saved) { l in
                            NavigationLink(value: l) { ListingCard(listing: l) }.buttonStyle(.plain)
                        }
                    }
                    .padding(Space.margin)
                }
            }
        }
        .navigationTitle("Saved")
    }
}
