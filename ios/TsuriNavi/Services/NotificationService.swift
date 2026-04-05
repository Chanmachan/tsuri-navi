import Foundation
import UserNotifications

final class NotificationService {
    static let shared = NotificationService()
    private init() {}

    func requestAuthorization() async -> Bool {
        let center = UNUserNotificationCenter.current()
        let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        return granted
    }

    /// 既存の通知をリセットして、◎(80点以上)の釣り場の前日18:00に通知をスケジュール
    /// - Parameters:
    ///   - spotId: 釣り場ID
    ///   - spotName: 釣り場名
    ///   - weeklyScores: 7日分スコア
    func scheduleNotifications(spotId: Int, spotName: String, weeklyScores: [WeeklyScore]) async {
        let center = UNUserNotificationCenter.current()
        let calendar = Calendar.current
        let today = Date()

        for ws in weeklyScores {
            guard ws.score >= 80 else { continue }
            guard let targetDate = parseDate(ws.date) else { continue }

            guard let prevDay = calendar.date(byAdding: .day, value: -1, to: targetDate) else { continue }
            var components = calendar.dateComponents([.year, .month, .day], from: prevDay)
            components.hour = 18
            components.minute = 0

            guard let fireDate = calendar.date(from: components), fireDate > today else { continue }

            let content = UNMutableNotificationContent()
            content.title = "明日の釣りが好条件です"
            content.body = "\(spotName) が好条件です（◎ \(ws.score)点）"
            content.sound = .default

            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let id = "spot-\(spotId)-\(ws.date)"
            let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
            try? await center.add(request)
        }
    }

    func resetAndReschedule(api: APIClient, spots: [SpotWithScore]) async {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        await withTaskGroup(of: Void.self) { group in
            for spot in spots {
                group.addTask {
                    guard let detail = try? await api.fetchSpotDetail(id: spot.id) else { return }
                    await self.scheduleNotifications(
                        spotId: spot.id,
                        spotName: spot.name,
                        weeklyScores: detail.weeklyScores
                    )
                }
            }
        }
    }

    private func parseDate(_ string: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return formatter.date(from: string)
    }
}
