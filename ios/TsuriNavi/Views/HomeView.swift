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
        List(vm.spots) { spot in
            NavigationLink(destination: SpotDetailView(spotId: spot.id, spotName: spot.name)) {
                SpotRowView(spot: spot, onToggleFavorite: { await vm.toggleFavorite(spot: spot) })
            }
        }
    }
}

struct SpotRowView: View {
    let spot: SpotWithScore
    let onToggleFavorite: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(spot.name)
                    .font(.headline)
                Spacer()
                Button {
                    Task { await onToggleFavorite() }
                } label: {
                    Image(systemName: spot.isFavorite == 1 ? "star.fill" : "star")
                        .foregroundStyle(.yellow)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: 12) {
                if let score = spot.todayScore {
                    ScoreBadge(label: score.label, score: score.score)
                    if let best = score.bestHour {
                        Text("ベスト \(best)時")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Text("データなし")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // weeklyScores はリストAPIには含まれないため非表示
        }
        .padding(.vertical, 4)
    }
}

struct WeeklyCalendarRow: View {
    let scores: [WeeklyScore]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(scores) { ws in
                    VStack(spacing: 2) {
                        Text(shortDate(ws.date))
                            .font(.system(size: 9))
                            .foregroundStyle(.secondary)
                        ScoreBadge(label: ws.label, score: ws.score, compact: true)
                    }
                }
            }
        }
    }

    private func shortDate(_ date: String) -> String {
        let parts = date.split(separator: "-")
        guard parts.count == 3 else { return date }
        return "\(parts[1])/\(parts[2])"
    }
}

struct ScoreBadge: View {
    let label: String
    let score: Int
    var compact: Bool = false

    var color: Color {
        switch label {
        case "◎": return .green
        case "○": return .blue
        case "△": return .yellow
        default: return .red
        }
    }

    var body: some View {
        Text(label)
            .font(compact ? .system(size: 12, weight: .bold) : .headline)
            .frame(width: compact ? 22 : 32, height: compact ? 22 : 32)
            .background(color.opacity(0.2))
            .foregroundStyle(color)
            .clipShape(RoundedRectangle(cornerRadius: 4))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(color.opacity(0.5), lineWidth: 1))
    }
}
