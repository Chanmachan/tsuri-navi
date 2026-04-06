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

    var availableDates: [String] {
        (0..<8).compactMap {
            DateUtils.jstCalendar.date(byAdding: .day, value: $0, to: Date())
                .map { DateUtils.isoFormatter.string(from: $0) }
        }
    }
}
