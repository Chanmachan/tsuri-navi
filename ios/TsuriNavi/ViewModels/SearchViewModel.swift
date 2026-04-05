import Foundation

@Observable
final class SearchViewModel {
    var results: [SearchResult] = []
    var selectedDate: String = ""
    var maxDistanceKm: Int = 50
    var isLoading = false
    var error: String?

    private let api: APIClient
    private let settings: AppSettings

    init(api: APIClient, settings: AppSettings) {
        self.api = api
        self.settings = settings
        self.selectedDate = todayJST()
    }

    func search() async {
        guard let lat = settings.homeLat, let lng = settings.homeLng else {
            error = "自宅位置が設定されていません"
            return
        }
        isLoading = true
        error = nil
        do {
            results = try await api.search(
                date: selectedDate,
                maxDistanceKm: maxDistanceKm,
                homeLat: lat,
                homeLng: lng
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
