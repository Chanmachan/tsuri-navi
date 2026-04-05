import Foundation

@Observable
@MainActor
final class SpotDetailViewModel {
    var detail: SpotDetail?
    var selectedDate: String = ""
    var isLoading = false
    var error: String?

    private let api: APIClient

    init(api: APIClient) {
        self.api = api
        self.selectedDate = todayJST()
    }

    func load(spotId: Int) async {
        isLoading = true
        error = nil
        do {
            detail = try await api.fetchSpotDetail(id: spotId, date: selectedDate)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func selectDate(_ date: String, spotId: Int) async {
        selectedDate = date
        await load(spotId: spotId)
    }

    private func todayJST() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return formatter.string(from: Date())
    }
}
