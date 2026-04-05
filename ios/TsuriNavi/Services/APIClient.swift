import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case httpError(Int)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid server URL"
        case .httpError(let code): return "HTTP error \(code)"
        case .decodingError(let e): return "Decode error: \(e.localizedDescription)"
        }
    }
}

@Observable
@MainActor
final class APIClient {
    private let settings: AppSettings
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    init(settings: AppSettings) {
        self.settings = settings
    }

    private func url(_ path: String, query: [String: String] = [:]) throws -> URL {
        guard var components = URLComponents(string: settings.serverURL + path) else {
            throw APIError.invalidURL
        }
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        guard let url = components.url else { throw APIError.invalidURL }
        return url
    }

    private func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        let url = try url(path, query: query)
        let (data, response) = try await URLSession.shared.data(from: url)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.httpError(http.statusCode)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Endpoints

    func fetchSpots() async throws -> [SpotWithScore] {
        return try await get("/api/spots")
    }

    func fetchSpotDetail(id: Int, date: String? = nil) async throws -> SpotDetail {
        var query: [String: String] = [:]
        if let date { query["date"] = date }
        return try await get("/api/spots/\(id)", query: query)
    }

    func search(date: String, maxDistanceKm: Int, homeLat: Double, homeLng: Double) async throws -> [SearchResult] {
        let query: [String: String] = [
            "date": date,
            "maxDistanceKm": "\(maxDistanceKm)",
            "lat": "\(homeLat)",
            "lng": "\(homeLng)"
        ]
        let response: SearchResponse = try await get("/api/search", query: query)
        return response.results
    }

    func toggleFavorite(id: Int) async throws -> Bool {
        let url = try url("/api/spots/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["action": "toggle_favorite"])
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.httpError(http.statusCode)
        }
        struct ToggleResponse: Decodable { let is_favorite: Int }
        let result = try decoder.decode(ToggleResponse.self, from: data)
        return result.is_favorite == 1
    }

    func addSpot(name: String, latitude: Double, longitude: Double, type: String, prefecture: String) async throws -> Spot {
        let url = try url("/api/spots")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = [
            "name": name, "latitude": latitude,
            "longitude": longitude, "type": type, "prefecture": prefecture
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.httpError(http.statusCode)
        }
        return try decoder.decode(Spot.self, from: data)
    }

    func deleteSpot(id: Int) async throws {
        let url = try url("/api/spots/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.httpError(http.statusCode)
        }
    }
}
