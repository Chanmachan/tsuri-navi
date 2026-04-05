import Foundation

@Observable
@MainActor
final class AppSettings {
    private let defaults = UserDefaults.standard

    private enum Keys {
        static let serverURL = "serverURL"
        static let homeLat = "homeLat"
        static let homeLng = "homeLng"
        static let notificationsEnabled = "notificationsEnabled"
    }

    var serverURL: String {
        get { defaults.string(forKey: Keys.serverURL) ?? "http://192.168.1.1:3000" }
        set { defaults.set(newValue, forKey: Keys.serverURL) }
    }

    var homeLat: Double? {
        get {
            let v = defaults.double(forKey: Keys.homeLat)
            return v == 0 ? nil : v
        }
        set { defaults.set(newValue, forKey: Keys.homeLat) }
    }

    var homeLng: Double? {
        get {
            let v = defaults.double(forKey: Keys.homeLng)
            return v == 0 ? nil : v
        }
        set { defaults.set(newValue, forKey: Keys.homeLng) }
    }

    var notificationsEnabled: Bool {
        get { defaults.object(forKey: Keys.notificationsEnabled) as? Bool ?? true }
        set { defaults.set(newValue, forKey: Keys.notificationsEnabled) }
    }
}
