import CoreLocation

// One-shot "where am I": asks for When In Use, takes a single coarse fix and names it.
@MainActor
final class Locator: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var waiting: CheckedContinuation<CLLocation?, Never>?

    // True when the person has said no (or it is restricted), so the UI can say so plainly.
    var denied: Bool { [.denied, .restricted].contains(manager.authorizationStatus) }

    // The raw fix, or nil when location is off or no fix came.
    func fix() async -> CLLocation? {
        guard waiting == nil else { return nil }
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
        return await withCheckedContinuation { c in
            waiting = c
            proceed()
        }
    }

    func current() async -> Place? {
        guard let loc = await fix(), let mark = try? await CLGeocoder().reverseGeocodeLocation(loc).first else { return nil }
        let town = mark.locality ?? mark.name ?? "Current location"
        let detail = [mark.administrativeArea, mark.country].compactMap { $0 }.joined(separator: ", ")
        return Place(name: town, detail: detail, lat: loc.coordinate.latitude, lng: loc.coordinate.longitude, countryCode: mark.isoCountryCode ?? "US")
    }

    private func proceed() {
        switch manager.authorizationStatus {
        case .notDetermined: manager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse: manager.requestLocation()
        default: finish(nil)
        }
    }

    private func finish(_ loc: CLLocation?) {
        waiting?.resume(returning: loc)
        waiting = nil
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in if self.waiting != nil, self.manager.authorizationStatus != .notDetermined { self.proceed() } }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let first = locations.first
        Task { @MainActor in self.finish(first) }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(nil) }
    }
}
