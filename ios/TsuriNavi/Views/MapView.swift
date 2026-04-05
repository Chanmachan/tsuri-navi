import SwiftUI
import MapKit
import CoreLocation

// MARK: - Coordinate Source

private enum CoordinateSource {
    case none
    case longPress
    case searchResult
}

struct TsuriMapView: View {
    @State private var vm: MapViewModel
    @State private var showAddSpotSheet = false
    @State private var newSpotName = ""
    @State private var newSpotType = "漁港"
    @State private var newSpotPrefecture = ""

    // Name search
    @State private var searchQuery = ""
    @State private var searchResults: [MKMapItem] = []
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

                    // 長押し確定前の仮アノテーション
                    if let coord = vm.pendingCoordinate {
                        Annotation("新しい釣り場", coordinate: coord) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 32))
                                .foregroundStyle(Color.oceanPrimary)
                                .shadow(color: Color.oceanPrimary.opacity(0.4), radius: 4, x: 0, y: 2)
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
            Circle()
                .stroke(.white, lineWidth: 2)
                .frame(width: 34, height: 34)
            Text(label)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
        }
        .shadow(color: color.opacity(0.4), radius: 4, x: 0, y: 2)
    }

    // MARK: - Add spot sheet

    private var addSpotSheet: some View {
        NavigationStack {
            Form {
                // 名称検索セクション
                Section("名称で検索") {
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(.secondary)
                        TextField("例：狐崎、久ノ浜", text: $searchQuery)
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
                        ForEach(searchResults, id: \.self) { item in
                            Button {
                                applySearchResult(item)
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.name ?? "")
                                        .font(.subheadline)
                                        .foregroundStyle(.primary)
                                    Text(searchResultSubtitle(item))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                // 座標ステータスセクション
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
                            if vm.error == nil {
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

    // MARK: - Search helpers

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
        let keyword = "\(query)\(suffix) 日本"

        // Step 1: MKLocalSearch (POI + address)
        var items: [MKMapItem] = []
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = keyword
        request.resultTypes = [.pointOfInterest, .address]
        if let response = try? await MKLocalSearch(request: request).start() {
            items = Array(response.mapItems.prefix(6))
        }

        // Step 2: CLGeocoder フォールバック（小規模漁港など POI 未収録のケース）
        if items.isEmpty {
            let geocoder = CLGeocoder()
            if let placemarks = try? await geocoder.geocodeAddressString(keyword) {
                items = placemarks.prefix(6).compactMap { pm in
                    guard pm.location != nil else { return nil }
                    return MKMapItem(placemark: MKPlacemark(placemark: pm))
                }
            }
        }

        searchResults = items
        isSearching = false
    }

    private func applySearchResult(_ item: MKMapItem) {
        newSpotName = item.name ?? ""
        newSpotPrefecture = item.placemark.administrativeArea ?? ""
        vm.pendingCoordinate = item.placemark.coordinate
        vm.error = nil
        coordinateSource = .searchResult
        searchResults = []
        searchQuery = ""
    }

    private func searchResultSubtitle(_ item: MKMapItem) -> String {
        let parts = [
            item.placemark.administrativeArea,
            item.placemark.locality
        ].compactMap { $0 }
        return parts.joined(separator: " ")
    }
}
