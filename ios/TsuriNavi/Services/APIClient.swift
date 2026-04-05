import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case httpError(Int, String?)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "サーバーURLが無効です"
        case .httpError(_, let message?):
            return message
        case .httpError(let code, nil):
            return "HTTP エラー \(code)"
        case .decodingError(let e):
            return "Decode error: \(e.localizedDescription)"
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
            throw parseHTTPError(data, statusCode: http.statusCode)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    private func parseHTTPError(_ data: Data, statusCode: Int) -> APIError {
        struct ErrorBody: Decodable { let error: String }
        if let body = try? decoder.decode(ErrorBody.self, from: data) {
            return APIError.httpError(statusCode, localizedServerError(body.error))
        }
        return APIError.httpError(statusCode, nil)
    }

    private func localizedServerError(_ key: String) -> String {
        switch key {
        case "home_location_not_set":
            return "自宅位置が未設定です。「設定」タブで登録してください。"
        default:
            return key
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

    func search(date: String, maxDistanceKm: Int) async throws -> [SearchResult] {
        let query: [String: String] = [
            "date": date,
            "maxDistanceKm": "\(maxDistanceKm)"
        ]
        // /api/search returns a plain array (not wrapped in { results: [] })
        // Home location is read from server-side DB settings, not query params
        return try await get("/api/search", query: query)
    }

    func toggleFavorite(id: Int) async throws -> Bool {
        let url = try url("/api/spots/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["action": "toggle_favorite"])
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw parseHTTPError(data, statusCode: http.statusCode)
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
            throw parseHTTPError(data, statusCode: http.statusCode)
        }
        return try decoder.decode(Spot.self, from: data)
    }

    func deleteSpot(id: Int) async throws {
        let url = try url("/api/spots/\(id)")
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.httpError(http.statusCode, nil)
        }
    }
}
