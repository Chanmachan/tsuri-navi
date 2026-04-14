import SwiftUI

struct HomeView: View {
    @Environment(HomeViewModel.self) private var vm
    @State private var spotToDelete: SpotWithScore?

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.spots.isEmpty {
                    ProgressView("読み込み中…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = vm.error {
                    ContentUnavailableView(error, systemImage: "wifi.slash")
                } else {
                    spotList
                }
            }
            .navigationTitle("釣りナビ")
            .refreshable { await vm.load() }
        }
        .task { await vm.load() }
        .confirmationDialog(
            "\(spotToDelete?.name ?? "")を削除しますか？",
            isPresented: Binding(get: { spotToDelete != nil }, set: { if !$0 { spotToDelete = nil } }),
            titleVisibility: .visible
        ) {
            Button("削除", role: .destructive) {
                if let spot = spotToDelete {
                    spotToDelete = nil
                    Task { await vm.deleteSpot(id: spot.id) }
                }
            }
        }
    }

    private var spotList: some View {
        List {
            Section {
                HomeDatePicker(
                    selectedDate: vm.selectedDate,
                    onSelect: { date in Task { await vm.selectDate(date) } }
                )
                .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
                .listRowBackground(Color.clear)
            }

            Section {
                ForEach(vm.spots) { spot in
                    NavigationLink(destination: SpotDetailView(
                        spotId: spot.id,
                        spotName: spot.name,
                        initialDate: vm.selectedDate
                    )) {
                        SpotRowView(spot: spot, onToggleFavorite: { await vm.toggleFavorite(spot: spot) })
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            spotToDelete = spot
                        } label: {
                            Label("削除", systemImage: "trash")
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Spot Row

struct SpotRowView: View {
    let spot: SpotWithScore
    let onToggleFavorite: () async -> Void

    var body: some View {
        HStack(spacing: 14) {
            ScoreBadge(
                label: spot.todayScore?.label ?? "-",
                score: spot.todayScore?.score ?? 0
            )

            VStack(alignment: .leading, spacing: 3) {
                Text(spot.name)
                    .font(.headline)
                    .foregroundStyle(.primary)

                if let score = spot.todayScore {
                    HStack(spacing: 8) {
                        Text("\(score.score)点")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.scoreColor(for: score.label))
                        if let best = score.bestHour {
                            Label("ベスト \(best)時", systemImage: "clock")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                } else {
                    Text("データなし")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer(minLength: 0)

            Button {
                Task { await onToggleFavorite() }
            } label: {
                Image(systemName: spot.isFavorite == 1 ? "star.fill" : "star")
                    .font(.system(size: 18))
                    .foregroundStyle(spot.isFavorite == 1 ? Color.appleBlue : Color(.systemGray3))
                    .contentTransition(.symbolEffect(.replace))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Home Date Picker

struct HomeDatePicker: View {
    let selectedDate: String
    let onSelect: (String) -> Void

    @ScaledMetric(relativeTo: .body) private var circleSize: CGFloat = 36

    private var dates: [String] { DateUtils.next7Days() }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 2) {
                ForEach(dates, id: \.self) { date in
                    let isSelected = date == selectedDate
                    Button { onSelect(date) } label: {
                        VStack(spacing: 4) {
                            Text(dayOfWeek(date))
                                .font(.caption2.weight(.medium))
                                .foregroundStyle(isSelected ? Color.appleBlue : .secondary)
                            Text(DateUtils.dayNumber(date))
                                .font(.body.weight(isSelected ? .semibold : .regular))
                                .foregroundStyle(isSelected ? .white : .primary)
                                .frame(width: circleSize, height: circleSize)
                                .background(
                                    Circle()
                                        .fill(isSelected ? Color.appleBlue : Color.clear)
                                )
                        }
                        .frame(minWidth: 44)
                        .padding(.vertical, 4)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .animation(.easeInOut(duration: 0.15), value: isSelected)
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func dayOfWeek(_ dateStr: String) -> String { DateUtils.dayOfWeek(dateStr) }
}

// MARK: - Score Badge

struct ScoreBadge: View {
    let label: String
    let score: Int
    var compact: Bool = false

    @ScaledMetric(relativeTo: .title2) private var normalSize: CGFloat = 46
    @ScaledMetric(relativeTo: .subheadline) private var compactSize: CGFloat = 30

    var body: some View {
        let size = compact ? compactSize : normalSize
        ZStack {
            Circle()
                .fill(Color.scoreColor(for: label))
            Text(label)
                .font(compact ? .caption.weight(.bold) : .title2.weight(.bold))
                .foregroundStyle(Color.scoreTextColor(for: label))
        }
        .frame(width: size, height: size)
    }
}
