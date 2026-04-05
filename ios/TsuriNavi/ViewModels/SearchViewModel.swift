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
        self.selectedDate = todayJST()
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
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return (0..<8).compactMap {
            Calendar.current.date(byAdding: .day, value: $0, to: Date())
                .map { formatter.string(from: $0) }
        }
    }

    private func todayJST() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return formatter.string(from: Date())
    }
}
