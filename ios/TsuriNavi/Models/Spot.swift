import Foundation

struct Spot: Codable, Identifiable {
    let id: Int
    let name: String
    let latitude: Double
    let longitude: Double
    let type: String
    let prefecture: String
    let isFavorite: Int

    enum CodingKeys: String, CodingKey {
        case id, name, latitude, longitude, type, prefecture
        case isFavorite = "is_favorite"
    }
}

/// /api/spots レスポンスの1件分（todayScore はキャメルケース）
struct SpotWithScore: Codable, Identifiable {
    let id: Int
    let name: String
    let latitude: Double
    let longitude: Double
    let type: String
    let prefecture: String
    let isFavorite: Int
    let todayScore: SpotListScore?

    enum CodingKeys: String, CodingKey {
        case id, name, latitude, longitude, type, prefecture
        case isFavorite = "is_favorite"
        case todayScore
    }
}

/// /api/spots リストに含まれる当日スコアのサマリー
struct SpotListScore: Codable {
    let score: Int
    let label: String
    let bestHour: Int?
}
