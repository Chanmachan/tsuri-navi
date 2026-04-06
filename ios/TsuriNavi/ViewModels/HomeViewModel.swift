import Foundation

@Observable
@MainActor
final class HomeViewModel {
    var spots: [SpotWithScore] = []
    var selectedDate: String = DateUtils.todayJST()
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
            spots = try await api.fetchSpots(date: selectedDate)
            if settings.notificationsEnabled {
                await NotificationService.shared.resetAndReschedule(api: api, spots: spots)
            }
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func selectDate(_ date: String) async {
        selectedDate = date
        await load()
    }

    func toggleFavorite(spot: SpotWithScore) async {
        do {
            _ = try await api.toggleFavorite(id: spot.id)
        } catch {
            self.error = error.localizedDescription
        }
        await load()
    }
}

