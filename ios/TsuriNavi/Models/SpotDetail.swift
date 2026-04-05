import Foundation

struct DailyScore: Codable {
    let score: Int
    let label: String
    let bestHour: Int?
    let breakdown: ScoreBreakdown?

    enum CodingKeys: String, CodingKey {
        case score, label, breakdown
        case bestHour = "bestHour"
    }
}

struct ScoreBreakdown: Codable {
    let tide: Double?
    let wind: Double?
    let wave: Double?
    let weather: Double?
    let mazume: Double?
    let pressure: Double?
    let moon: Double?
}

struct WeeklyScore: Codable, Identifiable {
    var id: String { date }
    let date: String
    let score: Int
    let label: String
}

struct HourlyScore: Codable {
    let hour: Int
    let score: Int
    let bestTimeFlag: Int

    enum CodingKeys: String, CodingKey {
        case hour, score
        case bestTimeFlag = "best_time_flag"
    }
}

struct HourlyWeather: Codable, Identifiable {
    var id: Int { hour }
    let hour: Int
    let temperature: Double?
    let windSpeed: Double?
    let windDirection: Int?
    let waveHeight: Double?
    let tideLevel: Double?
    let tideType: String?
    let weatherCode: Int?
    let precipitation: Double?
    let pressure: Double?
    let sunrise: String?
    let sunset: String?

    enum CodingKeys: String, CodingKey {
        case hour, temperature, precipitation, pressure, sunrise, sunset
        case windSpeed    = "wind_speed"
        case windDirection = "wind_direction"
        case waveHeight   = "wave_height"
        case tideLevel    = "tide_level"
        case tideType     = "tide_type"
        case weatherCode  = "weather_code"
    }
}

struct FishRecommendation: Codable, Identifiable {
    var id: String { fish }
    let fish: String
    let method: String
    let bait: String
    let note: String?
}

struct SpotDetail: Codable {
    let spot: Spot
    let dailyScore: DailyScore?
    let hourlyScores: [HourlyScore]
    let weather: [HourlyWeather]
    let weeklyScores: [WeeklyScore]
    let fish: [FishRecommendation]

    enum CodingKeys: String, CodingKey {
        case spot, fish
        case dailyScore = "dailyScore"
        case hourlyScores = "hourlyScores"
        case weather, weeklyScores
    }
}
