import Foundation

struct SearchResult: Codable, Identifiable {
    let id: Int
    let name: String
    let latitude: Double
    let longitude: Double
    let type: String
    let prefecture: String
    let isFavorite: Int
    let distanceKm: Double
    let score: Int
    let label: String
    let bestHour: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, latitude, longitude, type, prefecture, score, label
        case isFavorite = "is_favorite"
        case distanceKm = "distanceKm"
        case bestHour = "bestHour"
    }
}

struct SearchResponse: Codable {
    let results: [SearchResult]
}
