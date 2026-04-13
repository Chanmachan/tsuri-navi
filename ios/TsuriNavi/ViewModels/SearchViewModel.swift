import Foundation

@Observable
@MainActor
final class SearchViewModel {
    var results: [SearchResult] = []
    var selectedDate: String = ""
    var maxDistanceKm: Int = 50
    var isLoading = false
    var error: String?

    private let api: APIClient

    init(api: APIClient) {
        self.api = api
        self.selectedDate = DateUtils.todayJST()
    }

    func search() async {
        isLoading = true
        error = nil
        do {
            results = try await api.search(
                date: selectedDate,
                maxDistanceKm: maxDistanceKm
            )
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    var availableDates: [String] { DateUtils.nextDays(count: 8) }
}
