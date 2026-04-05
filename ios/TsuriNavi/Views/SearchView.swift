import SwiftUI
import MapKit

struct SearchView: View {
    @State private var vm: SearchViewModel

    init(vm: SearchViewModel) {
        _vm = State(initialValue: vm)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterPanel
                Divider()

                if vm.isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = vm.error {
                    ContentUnavailableView(error, systemImage: "magnifyingglass")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.results.isEmpty {
                    ContentUnavailableView("結果なし", systemImage: "magnifyingglass",
                                          description: Text("条件を変えて再検索してください"))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    resultList
                }
            }
            .navigationTitle("検索")
        }
    }

    private var filterPanel: some View {
        VStack(spacing: 12) {
            Picker("日付", selection: Binding(get: { vm.selectedDate }, set: { vm.selectedDate = $0 })) {
                ForEach(vm.availableDates, id: \.self) { date in
                    Text(date).tag(date)
                }
            }
            .pickerStyle(.menu)

            HStack {
                Text("距離: \(vm.maxDistanceKm)km")
                Slider(value: Binding(
                    get: { Double(vm.maxDistanceKm) },
                    set: { vm.maxDistanceKm = Int($0) }
                ), in: 10...500, step: 10)
            }

            Button(action: { Task { await vm.search() } }) {
                Label("検索", systemImage: "magnifyingglass")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    private var resultList: some View {
        List(vm.results) { result in
            NavigationLink(destination: SpotDetailView(spotId: result.id, spotName: result.name)) {
                SearchResultRow(result: result)
            }
        }
    }
}

struct SearchResultRow: View {
    let result: SearchResult

    var body: some View {
        HStack {
            ScoreBadge(label: result.label, score: result.score)
            VStack(alignment: .leading, spacing: 2) {
                Text(result.name).font(.headline)
                Text(String(format: "%.1fkm  %@", result.distanceKm, result.prefecture))
                    .font(.caption).foregroundStyle(.secondary)
                if let best = result.bestHour {
                    Text("ベスト \(best):00").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text("\(result.score)点").font(.subheadline).foregroundStyle(.secondary)
        }
    }
}
