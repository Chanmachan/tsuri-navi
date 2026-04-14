import SwiftUI
import MapKit

struct SearchView: View {
    @State private var vm: SearchViewModel
    @State private var displayMode: DisplayMode = .list
    @State private var cameraPosition: MapCameraPosition = .region(
        MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 36.5, longitude: 136.0),
            span: MKCoordinateSpan(latitudeDelta: 10, longitudeDelta: 10)
        )
    )

    private enum DisplayMode { case list, map }

    init(vm: SearchViewModel) {
        _vm = State(initialValue: vm)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterPanel

                if vm.isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = vm.error {
                    ContentUnavailableView(error, systemImage: "magnifyingglass")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.results.isEmpty {
                    ContentUnavailableView(
                        "結果なし",
                        systemImage: "magnifyingglass",
                        description: Text("条件を変えて再検索してください")
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    switch displayMode {
                    case .list: resultList
                    case .map: resultMap
                    }
                }
            }
            .navigationTitle("検索")
            .background(Color(.systemGroupedBackground))
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Picker("", selection: $displayMode) {
                        Image(systemName: "list.bullet").tag(DisplayMode.list)
                        Image(systemName: "map").tag(DisplayMode.map)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 80)
                    .disabled(vm.results.isEmpty)
                }
            }
        }
        .onChange(of: vm.results) { _, results in
            cameraPosition = fitCamera(to: results)
        }
    }

    // MARK: - Filter Panel

    private var filterPanel: some View {
        VStack(spacing: 16) {
            HStack {
                Label("日付", systemImage: "calendar")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Picker("日付", selection: Binding(
                    get: { vm.selectedDate },
                    set: { vm.selectedDate = $0 }
                )) {
                    ForEach(vm.availableDates, id: \.self) { date in
                        Text(date).tag(date)
                    }
                }
                .pickerStyle(.menu)
                .tint(.oceanPrimary)
            }

            VStack(alignment: .leading, spacing: 8) {
                Label("最大距離: \(vm.maxDistanceKm)km", systemImage: "location.circle")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Slider(
                    value: Binding(
                        get: { Double(vm.maxDistanceKm) },
                        set: { vm.maxDistanceKm = Int($0) }
                    ),
                    in: 10...500,
                    step: 10
                )
                .tint(.oceanPrimary)
            }

            Button(action: { Task { await vm.search() } }) {
                Label("この条件で検索", systemImage: "magnifyingglass")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.oceanPrimary)
            .controlSize(.large)
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
    }

    // MARK: - Result List

    private var resultList: some View {
        List(vm.results) { result in
            NavigationLink(destination: SpotDetailView(spotId: result.id, spotName: result.name)) {
                SearchResultRow(result: result)
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Result Map

    private var resultMap: some View {
        Map(position: $cameraPosition) {
            ForEach(vm.results) { result in
                Annotation(result.name, coordinate: CLLocationCoordinate2D(
                    latitude: result.latitude, longitude: result.longitude
                )) {
                    NavigationLink(destination: SpotDetailView(spotId: result.id, spotName: result.name)) {
                        scorePin(label: result.label ?? "?")
                    }
                }
            }
        }
        .mapStyle(.standard)
    }

    // MARK: - Helpers

    private func scorePin(label: String) -> some View {
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

    private func fitCamera(to results: [SearchResult]) -> MapCameraPosition {
        guard !results.isEmpty else {
            return .region(MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 36.5, longitude: 136.0),
                span: MKCoordinateSpan(latitudeDelta: 10, longitudeDelta: 10)
            ))
        }
        let lats = results.map(\.latitude)
        let lons = results.map(\.longitude)
        let minLat = lats.min() ?? 36.5
        let maxLat = lats.max() ?? 36.5
        let minLon = lons.min() ?? 136.0
        let maxLon = lons.max() ?? 136.0
        return .region(MKCoordinateRegion(
            center: CLLocationCoordinate2D(
                latitude: (minLat + maxLat) / 2,
                longitude: (minLon + maxLon) / 2
            ),
            span: MKCoordinateSpan(
                latitudeDelta: max(maxLat - minLat, 0.2) * 1.5,
                longitudeDelta: max(maxLon - minLon, 0.2) * 1.5
            )
        ))
    }
}

// MARK: - Search Result Row

struct SearchResultRow: View {
    let result: SearchResult

    var body: some View {
        HStack(spacing: 12) {
            ScoreBadge(label: result.label ?? "?", score: result.score ?? 0)

            VStack(alignment: .leading, spacing: 4) {
                Text(result.name)
                    .font(.headline)

                HStack(spacing: 8) {
                    Label(
                        String(format: "%.1fkm", result.distanceKm),
                        systemImage: "location"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    Text(result.prefecture)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let best = result.bestHour {
                    Label("ベスト \(best):00", systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer(minLength: 0)

            if let score = result.score {
                Text("\(score)点")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.scoreColor(for: result.label ?? ""))
            }
        }
        .padding(.vertical, 2)
    }
}
