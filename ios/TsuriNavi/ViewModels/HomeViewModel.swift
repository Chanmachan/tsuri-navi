import Foundation

@Observable
final class HomeViewModel {
    var spots: [SpotWithScore] = []
    var isLoading = false
    var error: String?

    private let api: APIClient
    private let settings: AppSettings

    init(api: APIClient, settings: AppSettings) {
        self.api = api
        self.settings = settings
    }

    func load() async {
        isLoading = true
        error = nil
        do {
            spots = try await api.fetchSpots()
            if settings.notificationsEnabled {
                await NotificationService.shared.resetAndReschedule(api: api, spots: spots)
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func toggleFavorite(spot: SpotWithScore) async {
        _ = try? await api.toggleFavorite(id: spot.id)
        await load()
    }
}
