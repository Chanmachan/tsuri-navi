import SwiftUI

struct HomeView: View {
    @Environment(HomeViewModel.self) private var vm

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
    }

    private var spotList: some View {
        List {
            Section {
                HomeDatePicker(
                    selectedDate: vm.selectedDate,
                    onSelect: { date in Task { await vm.selectDate(date) } }
                )
                .listRowInsets(EdgeInsets(top: 8, leading: 12, bottom: 8, trailing: 12))
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
        HStack(spacing: 12) {
            ScoreBadge(
                label: spot.todayScore?.label ?? "-",
                score: spot.todayScore?.score ?? 0
            )

            VStack(alignment: .leading, spacing: 4) {
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
                    .foregroundStyle(spot.isFavorite == 1 ? Color.yellow : Color(.systemGray3))
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

    private var dates: [String] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return (0..<7).compactMap { offset in
            Calendar.current.date(byAdding: .day, value: offset, to: Date())
                .map { formatter.string(from: $0) }
        }
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(dates, id: \.self) { date in
                    Button { onSelect(date) } label: {
                        VStack(spacing: 4) {
                            Text(dayOfWeek(date))
                                .font(.system(size: 10))
                                .foregroundStyle(date == selectedDate ? Color.oceanPrimary : .secondary)
                            Text(shortDate(date))
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(date == selectedDate ? Color.oceanPrimary : .primary)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(date == selectedDate ? Color.oceanPrimary.opacity(0.12) : Color.clear)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(date == selectedDate ? Color.oceanPrimary.opacity(0.4) : Color.clear, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func shortDate(_ date: String) -> String {
        let parts = date.split(separator: "-")
        guard parts.count == 3 else { return date }
        return "\(parts[1])/\(parts[2])"
    }

    private func dayOfWeek(_ dateStr: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        guard let date = formatter.date(from: dateStr) else { return "" }
        let dayFormatter = DateFormatter()
        dayFormatter.dateFormat = "E"
        dayFormatter.locale = Locale(identifier: "ja_JP")
        dayFormatter.timeZone = TimeZone(identifier: "Asia/Tokyo")
        return dayFormatter.string(from: date)
    }
}

// MARK: - Score Badge

struct ScoreBadge: View {
    let label: String
    let score: Int
    var compact: Bool = false

    var scoreColor: Color { .scoreColor(for: label) }

    var body: some View {
        ZStack {
            Circle()
                .fill(scoreColor.opacity(0.12))
            Circle()
                .stroke(scoreColor.opacity(0.3), lineWidth: compact ? 1 : 1.5)
            Text(label)
                .font(.system(size: compact ? 11 : 20, weight: .bold))
                .foregroundStyle(scoreColor)
        }
        .frame(width: compact ? 28 : 44, height: compact ? 28 : 44)
    }
}
