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
        let requestedDate = selectedDate
        isLoading = true
        defer {
            if requestedDate == selectedDate { isLoading = false }
        }
        error = nil
        do {
            let loadedSpots = try await api.fetchSpots(date: requestedDate)
            guard requestedDate == selectedDate else { return }
            spots = loadedSpots
            if settings.notificationsEnabled {
                await NotificationService.shared.resetAndReschedule(api: api, spots: loadedSpots)
            }
        } catch {
            guard requestedDate == selectedDate else { return }
            self.error = error.localizedDescription
        }
    }

    func selectDate(_ date: String) async {
        guard date != selectedDate else { return }
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

