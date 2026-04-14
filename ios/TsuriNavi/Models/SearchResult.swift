import Foundation

struct SearchResult: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let latitude: Double
    let longitude: Double
    let type: String
    let prefecture: String
    let isFavorite: Int
    let distanceKm: Double
    let score: Int?
    let label: String?
    let bestHour: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, latitude, longitude, type, prefecture
        case isFavorite = "is_favorite"
        case distanceKm, score, label, bestHour
    }
}
