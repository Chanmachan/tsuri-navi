import SwiftUI
import MapKit
import CoreLocation

// MARK: - Coordinate Source

private enum CoordinateSource {
    case none
    case longPress
    case searchResult
}

// MARK: - Search result model

private struct SpotCandidate: Identifiable {
    let id = UUID()
    let name: String
    let coordinate: CLLocationCoordinate2D
    let prefecture: String
    let subtitle: String
}

struct TsuriMapView: View {
    @State private var vm: MapViewModel
    @State private var showAddSpotSheet = false
    @State private var newSpotName = ""
    @State private var newSpotType = "漁港"
    @State private var newSpotPrefecture = ""

    // Name search
    @State private var searchQuery = ""
    @State private var searchResults: [SpotCandidate] = []
    @State private var isSearching = false
    @State private var coordinateSource: CoordinateSource = .none
    @State private var searchTask: Task<Void, Never>?

    private let spotTypes = ["漁港", "磯", "サーフ", "堤防", "その他"]

    init(vm: MapViewModel) {
        _vm = State(initialValue: vm)
    }

    var body: some View {
        NavigationStack {
            MapReader { proxy in
                Map {
                    ForEach(vm.spots) { spot in
                        Annotation(spot.name, coordinate: CLLocationCoordinate2D(
                            latitude: spot.latitude, longitude: spot.longitude
                        )) {
                            NavigationLink(destination: SpotDetailView(spotId: spot.id, spotName: spot.name)) {
                                scorePin(spot: spot)
                            }
                        }
                    }

                    if let coord = vm.pendingCoordinate {
                        Annotation("新しい釣り場", coordinate: coord) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 32))
                                .foregroundStyle(Color.appleBlue)
                                .shadow(color: Color.appleBlue.opacity(0.3), radius: 4, x: 0, y: 2)
                        }
                    }
                }
                .mapStyle(.standard)
                .onTapGesture { }
                .gesture(
                    LongPressGesture(minimumDuration: 0.5)
                        .sequenced(before: DragGesture(minimumDistance: 0))
                        .onEnded { value in
                            switch value {
                            case .second(true, let drag):
                                if let location = drag?.location,
                                   let coordinate = proxy.convert(location, from: .local) {
                                    vm.pendingCoordinate = coordinate
                                    vm.error = nil
                                    coordinateSource = .longPress
                                    showAddSpotSheet = true
                                }
                            default:
                                break
                            }
                        }
                )
            }
            .overlay(alignment: .topTrailing) {
                if vm.isLoading { ProgressView().padding() }
            }
            .overlay(alignment: .bottom) {
                if !showAddSpotSheet {
                    longPressHint
                }
            }
            .navigationTitle("マップ")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { Task { await vm.load() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        vm.pendingCoordinate = nil
                        vm.error = nil
                        coordinateSource = .none
                        showAddSpotSheet = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showAddSpotSheet, onDismiss: {
                vm.pendingCoordinate = nil
                vm.addSucceeded = false
                coordinateSource = .none
                searchQuery = ""
                searchResults = []
                isSearching = false
                searchTask?.cancel()
            }) {
                addSpotSheet
            }
        }
        .task { await vm.load() }
    }

    // MARK: - Long-press hint

    private var longPressHint: some View {
        Label("長押しまたは「+」で釣り場を追加", systemImage: "hand.tap.fill")
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.regularMaterial, in: Capsule())
            .padding(.bottom, 12)
    }

    // MARK: - Score pin

    private func scorePin(spot: SpotWithScore) -> some View {
        let label = spot.todayScore?.label ?? "?"
        let color = Color.scoreColor(for: label)
        return ZStack {
            Circle()
                .fill(color)
                .frame(width: 34, height: 34)
            Text(label)
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.scoreTextColor(for: label))
        }
        .shadow(color: color.opacity(0.35), radius: 4, x: 0, y: 2)
    }

    // MARK: - Add spot sheet

    private var addSpotSheet: some View {
        NavigationStack {
            Form {
                Section("名称で検索") {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.secondary)
                        TextField("例：狐崎、富岡", text: $searchQuery)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                    Text("「\(newSpotType)」を付けて検索します")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if isSearching {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("検索中…")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        ForEach(searchResults) { candidate in
                            Button {
                                applyCandidate(candidate)
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(candidate.name)
                                        .font(.subheadline)
                                        .foregroundStyle(.primary)
                                    if !candidate.subtitle.isEmpty {
                                        Text(candidate.subtitle)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section("座標") {
                    switch coordinateSource {
                    case .none:
                        Label("未設定（名称検索か地図の長押しで設定）", systemImage: "location.slash")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    case .longPress:
                        if let coord = vm.pendingCoordinate {
                            LabeledContent("緯度", value: String(format: "%.5f", coord.latitude))
                            LabeledContent("経度", value: String(format: "%.5f", coord.longitude))
                            Label("地図の長押しで取得", systemImage: "hand.tap.fill")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    case .searchResult:
                        if let coord = vm.pendingCoordinate {
                            LabeledContent("緯度", value: String(format: "%.5f", coord.latitude))
                            LabeledContent("経度", value: String(format: "%.5f", coord.longitude))
                            Label("検索結果から取得", systemImage: "magnifyingglass")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("釣り場情報") {
                    TextField("釣り場名", text: $newSpotName)
                    Picker("タイプ", selection: $newSpotType) {
                        ForEach(spotTypes, id: \.self) { Text($0) }
                    }
                    TextField("都道府県", text: $newSpotPrefecture)
                }

                if let error = vm.error {
                    Section {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("釣り場を追加")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") {
                        showAddSpotSheet = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("追加") {
                        Task {
                            await vm.addSpot(
                                name: newSpotName,
                                type: newSpotType,
                                prefecture: newSpotPrefecture
                            )
                            if vm.addSucceeded {
                                showAddSpotSheet = false
                                newSpotName = ""
                                newSpotPrefecture = ""
                            }
                        }
                    }
                    .disabled(
                        newSpotName.isEmpty ||
                        newSpotPrefecture.isEmpty ||
                        vm.pendingCoordinate == nil
                    )
                }
            }
            .onChange(of: searchQuery) { _, newValue in
                scheduleSearch(query: newValue)
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Search

    private func scheduleSearch(query: String) {
        searchTask?.cancel()
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else {
            searchResults = []
            isSearching = false
            return
        }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await performSearch(query: query)
        }
    }

    private func performSearch(query: String) async {
        isSearching = true
        let suffix = query.contains(newSpotType) ? "" : " \(newSpotType)"
        let keyword = "\(query)\(suffix)"

        // Nominatim（OSM）と Apple Maps を並列実行し、OSM 結果を優先表示
        async let nominatim = searchNominatim(query: keyword)
        async let apple = searchAppleMaps(keyword: "\(keyword) 日本")
        let (osmResults, appleResults) = await (nominatim, apple)

        // 重複を除いてマージ（OSM 優先、Apple は補完）
        var seen = Set<String>()
        var merged: [SpotCandidate] = []
        for c in osmResults + appleResults {
            let key = "\(String(format: "%.3f", c.coordinate.latitude)),\(String(format: "%.3f", c.coordinate.longitude))"
            if seen.insert(key).inserted {
                merged.append(c)
            }
        }
        searchResults = Array(merged.prefix(6))
        isSearching = false
    }

    private func searchAppleMaps(keyword: String) async -> [SpotCandidate] {
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = keyword
        request.resultTypes = [.pointOfInterest, .address]
        guard let response = try? await MKLocalSearch(request: request).start() else { return [] }
        return response.mapItems.prefix(6).map { item in
            let parts = [item.placemark.administrativeArea, item.placemark.locality]
                .compactMap { $0 }
            return SpotCandidate(
                name: item.name ?? keyword,
                coordinate: item.placemark.coordinate,
                prefecture: item.placemark.administrativeArea ?? "",
                subtitle: parts.joined(separator: " ")
            )
        }
    }

    private func searchNominatim(query: String) async -> [SpotCandidate] {
        var components = URLComponents(string: "https://nominatim.openstreetmap.org/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "format", value: "json"),
            URLQueryItem(name: "limit", value: "6"),
            URLQueryItem(name: "countrycodes", value: "jp"),
            URLQueryItem(name: "addressdetails", value: "1"),
            URLQueryItem(name: "accept-language", value: "ja"),
        ]
        guard let url = components.url else { return [] }
        var urlRequest = URLRequest(url: url)
        urlRequest.setValue("TsuriNavi/1.0 (fishing spot app)", forHTTPHeaderField: "User-Agent")
        guard let (data, _) = try? await URLSession.shared.data(for: urlRequest) else { return [] }

        struct Hit: Decodable {
            let name: String           // トップレベルの施設名
            let lat: String
            let lon: String
            let address: Addr?
            struct Addr: Decodable {
                let province: String?  // 日本の都道府県は "province" キー
                let city: String?
                let town: String?
                let village: String?
            }
        }

        guard let hits = try? JSONDecoder().decode([Hit].self, from: data) else { return [] }
        return hits.compactMap { hit in
            guard let lat = Double(hit.lat), let lon = Double(hit.lon) else { return nil }
            let prefecture = hit.address?.province ?? ""
            let locality = hit.address?.city ?? hit.address?.town ?? hit.address?.village ?? ""
            let subtitle = [prefecture, locality].filter { !$0.isEmpty }.joined(separator: " ")
            return SpotCandidate(
                name: hit.name,
                coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lon),
                prefecture: prefecture,
                subtitle: subtitle
            )
        }
    }

    private func applyCandidate(_ candidate: SpotCandidate) {
        newSpotName = candidate.name
        newSpotPrefecture = candidate.prefecture
        vm.pendingCoordinate = candidate.coordinate
        vm.error = nil
        coordinateSource = .searchResult
        searchResults = []
        searchQuery = ""
    }
}
