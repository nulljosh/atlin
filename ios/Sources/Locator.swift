import CoreLocation

// One-shot "where am I": asks for When In Use, takes a single coarse fix and names it.
@MainActor
final class Locator: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var waiting: CheckedContinuation<CLLocation?, Never>?

    func current() async -> Place? {
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
        let fix: CLLocation? = await withCheckedContinuation { c in
            waiting = c
            proceed()
        }
        guard let fix, let mark = try? await CLGeocoder().reverseGeocodeLocation(fix).first else { return nil }
        let town = mark.locality ?? mark.name ?? "Current location"
        let detail = [mark.administrativeArea, mark.country].compactMap { $0 }.joined(separator: ", ")
        return Place(name: town, detail: detail, lat: fix.coordinate.latitude, lng: fix.coordinate.longitude, countryCode: mark.isoCountryCode ?? "US")
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
