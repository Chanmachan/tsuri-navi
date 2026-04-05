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
                if vm.pendingCoordinate == nil {
                    longPressHint
                }
            }
            .navigationTitle("マップ")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await vm.load() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .sheet(isPresented: $showAddSpotSheet, onDismiss: {
                // シートを閉じたとき仮ピンをクリア（追加失敗 or キャンセル）
                if vm.pendingCoordinate != nil {
                    vm.pendingCoordinate = nil
                }
            }) {
                addSpotSheet
            }
        }
        .task { await vm.load() }
    }

    // MARK: - Long-press hint

    private var longPressHint: some View {
        Label("地図を長押しで釣り場を追加", systemImage: "hand.tap.fill")
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
                // 取得座標の確認（読み取り専用）
                if let coord = vm.pendingCoordinate {
                    Section("取得した座標") {
                        LabeledContent("緯度", value: String(format: "%.5f", coord.latitude))
                        LabeledContent("経度", value: String(format: "%.5f", coord.longitude))
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
                            // 追加成功時のみシートを閉じる
                            if vm.error == nil {
                                showAddSpotSheet = false
                                newSpotName = ""
                                newSpotPrefecture = ""
                            }
                        }
                    }
                    .disabled(newSpotName.isEmpty || newSpotPrefecture.isEmpty)
                }
            }
        }
        .presentationDetents([.medium])
    }
}
