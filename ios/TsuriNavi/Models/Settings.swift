import Foundation

struct UserSettings: Codable {
    var serverURL: String
    var homeLat: Double?
    var homeLng: Double?
    var notificationsEnabled: Bool
}
