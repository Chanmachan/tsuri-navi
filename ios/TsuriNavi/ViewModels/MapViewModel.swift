import Foundation
import MapKit

@Observable
@MainActor
final class MapViewModel {
    var spots: [SpotWithScore] = []
    var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 37.0, longitude: 140.0),
        span: MKCoordinateSpan(latitudeDelta: 5.0, longitudeDelta: 5.0)
    )
    var pendingCoordinate: CLLocationCoordinate2D?
    var isLoading = false
    var error: String?

    private let api: APIClient

    init(api: APIClient) {
        self.api = api
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            spots = try await api.fetchSpots()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func addSpot(name: String, type: String, prefecture: String) async {
        guard let coord = pendingCoordinate else { return }
        do {
            _ = try await api.addSpot(
                name: name, latitude: coord.latitude, longitude: coord.longitude,
                type: type, prefecture: prefecture
            )
            self.error = nil
            pendingCoordinate = nil
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func deleteSpot(id: Int) async {
        do {
            try await api.deleteSpot(id: id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}
