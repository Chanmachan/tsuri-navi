import SwiftUI
import MapKit

struct TsuriMapView: View {
    @State private var vm: MapViewModel
    @State private var showAddSpotSheet = false
    @State private var newSpotName = ""
    @State private var newSpotType = "漁港"
    @State private var newSpotPrefecture = ""

    private let spotTypes = ["漁港", "磯", "サーフ", "堤防", "その他"]

    init(vm: MapViewModel) {
        _vm = State(initialValue: vm)
    }

    var body: some View {
        NavigationStack {
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
            }
            .mapStyle(.standard)
            .onTapGesture { _ in } // prevent accidental navigation
            .overlay(alignment: .topTrailing) {
                if vm.isLoading { ProgressView().padding() }
            }
            .navigationTitle("マップ")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await vm.load() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .sheet(isPresented: $showAddSpotSheet) {
                addSpotSheet
            }
        }
        .task { await vm.load() }
    }

    private func scorePin(spot: SpotWithScore) -> some View {
        let label = spot.todayScore?.label ?? "?"
        let color: Color = {
            switch label {
            case "◎": return .green
            case "○": return .blue
            case "△": return .yellow
            default: return .red
            }
        }()
        return ZStack {
            Circle()
                .fill(color.opacity(0.85))
                .frame(width: 32, height: 32)
            Text(label)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    private var addSpotSheet: some View {
        NavigationStack {
            Form {
                TextField("釣り場名", text: $newSpotName)
                Picker("タイプ", selection: $newSpotType) {
                    ForEach(spotTypes, id: \.self) { Text($0) }
                }
                TextField("都道府県", text: $newSpotPrefecture)
            }
            .navigationTitle("釣り場を追加")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { showAddSpotSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("追加") {
                        Task {
                            await vm.addSpot(name: newSpotName, type: newSpotType, prefecture: newSpotPrefecture)
                            showAddSpotSheet = false
                            newSpotName = ""
                            newSpotPrefecture = ""
                        }
                    }
                    .disabled(newSpotName.isEmpty || newSpotPrefecture.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
