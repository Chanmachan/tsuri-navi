import Foundation

enum DateUtils {
    static let jst = TimeZone(identifier: "Asia/Tokyo")!

    static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = jst
        return f
    }()

    static let dayOfWeekFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "E"
        f.locale = Locale(identifier: "ja_JP")
        f.timeZone = jst
        return f
    }()

    static let jstCalendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = jst
        return c
    }()

    static func todayJST() -> String {
        isoFormatter.string(from: Date())
    }

    static func nextDays(count: Int) -> [String] {
        let base = jstCalendar.startOfDay(for: Date())
        return (0..<count).compactMap { offset in
            jstCalendar.date(byAdding: .day, value: offset, to: base)
                .map { isoFormatter.string(from: $0) }
        }
    }

    static func next7Days() -> [String] { nextDays(count: 7) }

    static func dayOfWeek(_ dateStr: String) -> String {
        guard let date = isoFormatter.date(from: dateStr) else { return "" }
        return dayOfWeekFormatter.string(from: date)
    }

    static func shortMonthDay(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        guard parts.count == 3 else { return dateStr }
        return "\(parts[1])/\(parts[2])"
    }
}
