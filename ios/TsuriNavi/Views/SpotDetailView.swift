import SwiftUI
import Charts

struct SpotDetailView: View {
    let spotId: Int
    let spotName: String

    @State private var vm: SpotDetailViewModel?
    @Environment(APIClient.self) private var api

    var body: some View {
        ScrollView {
            if let vm {
                if vm.isLoading {
                    ProgressView().padding(.top, 40)
                } else if let detail = vm.detail {
                    VStack(alignment: .leading, spacing: 20) {
                        WeeklyCalendarSection(
                            scores: detail.weeklyScores,
                            selectedDate: vm.selectedDate,
                            onSelect: { date in Task { await vm.selectDate(date, spotId: spotId) } }
                        )
                        .padding(.horizontal)

                        if let daily = detail.dailyScore {
                            ScoreHeaderSection(daily: daily)
                                .padding(.horizontal)
                        }

                        if !detail.hourlyScores.isEmpty {
                            HourlyScoreSection(scores: detail.hourlyScores)
                                .padding(.horizontal)
                        }

                        if !detail.weather.isEmpty {
                            TideChartSection(weather: detail.weather)
                                .padding(.horizontal)
                        }

                        if !detail.weather.isEmpty {
                            WeatherTableSection(weather: detail.weather)
                                .padding(.horizontal)
                        }

                        if !detail.fish.isEmpty {
                            FishSection(fish: detail.fish)
                                .padding(.horizontal)
                        }
                    }
                    .padding(.vertical)
                } else if let error = vm.error {
                    ContentUnavailableView(error, systemImage: "wifi.slash")
                        .padding(.top, 40)
                }
            } else {
                ProgressView().padding(.top, 40)
            }
        }
        .navigationTitle(spotName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            let newVM = SpotDetailViewModel(api: api)
            vm = newVM
            await newVM.load(spotId: spotId)
        }
    }
}

// MARK: - Sub sections

struct WeeklyCalendarSection: View {
    let scores: [WeeklyScore]
    let selectedDate: String
    let onSelect: (String) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(scores) { ws in
                    Button { onSelect(ws.date) } label: {
                        VStack(spacing: 4) {
                            Text(shortDate(ws.date))
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            ScoreBadge(label: ws.label, score: ws.score)
                        }
                        .padding(6)
                        .background(ws.date == selectedDate ? Color.skyBlue.opacity(0.15) : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
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

struct ScoreHeaderSection: View {
    let daily: DailyScore

    var color: Color {
        switch daily.label {
        case "◎": return .green
        case "○": return .blue
        case "△": return .yellow
        default: return .red
        }
    }

    var body: some View {
        HStack(alignment: .center, spacing: 20) {
            Text(daily.label)
                .font(.system(size: 72, weight: .bold))
                .foregroundStyle(color)

            VStack(alignment: .leading, spacing: 4) {
                Text("\(daily.score)点")
                    .font(.title)
                    .bold()
                if let best = daily.bestHour {
                    Text("ベストタイム \(best):00")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let b = daily.breakdown {
                    BreakdownView(breakdown: b)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct BreakdownView: View {
    let breakdown: ScoreBreakdown

    var items: [(String, Double?)] {
        [("潮", breakdown.tide), ("風", breakdown.wind), ("波", breakdown.wave),
         ("天気", breakdown.weather), ("マズメ", breakdown.mazume),
         ("気圧", breakdown.pressure), ("月齢", breakdown.moon)]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(items, id: \.0) { name, val in
                if let val {
                    HStack(spacing: 4) {
                        Text(name)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(width: 36, alignment: .leading)
                        GeometryReader { geo in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(Color.blue.opacity(0.6))
                                .frame(width: geo.size.width * min(max(val / 100, 0), 1))
                        }
                        .frame(height: 6)
                        Text(String(format: "%.0f", val))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

struct HourlyScoreSection: View {
    let scores: [HourlyScore]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("時間帯スコア").font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .bottom, spacing: 4) {
                    ForEach(scores, id: \.hour) { s in
                        VStack(spacing: 2) {
                            if s.bestTimeFlag == 1 {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 8))
                                    .foregroundStyle(.yellow)
                            }
                            RoundedRectangle(cornerRadius: 3)
                                .fill(barColor(s.score).opacity(s.bestTimeFlag == 1 ? 1.0 : 0.6))
                                .frame(width: 20, height: CGFloat(s.score) * 0.6)
                            Text("\(s.hour)")
                                .font(.system(size: 9))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(height: 80)
            }
        }
    }

    private func barColor(_ score: Int) -> Color {
        if score >= 80 { return .green }
        if score >= 60 { return .blue }
        if score >= 40 { return .yellow }
        return .red
    }
}

struct TideChartSection: View {
    let weather: [HourlyWeather]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("タイドグラフ").font(.headline)
            Chart {
                ForEach(weather) { w in
                    if let tide = w.tideLevel {
                        LineMark(
                            x: .value("時刻", w.hour),
                            y: .value("潮位", tide)
                        )
                        .foregroundStyle(.blue)
                        .interpolationMethod(.catmullRom)
                    }
                }
                if let sunrise = sunriseHour {
                    RuleMark(x: .value("日の出", sunrise))
                        .foregroundStyle(.orange.opacity(0.6))
                        .annotation(position: .top) {
                            Image(systemName: "sunrise.fill")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                }
                if let sunset = sunsetHour {
                    RuleMark(x: .value("日の入り", sunset))
                        .foregroundStyle(.purple.opacity(0.6))
                        .annotation(position: .top) {
                            Image(systemName: "sunset.fill")
                                .font(.caption)
                                .foregroundStyle(.purple)
                        }
                }
            }
            .chartXAxis {
                AxisMarks(values: [0, 6, 12, 18, 23]) { v in
                    AxisValueLabel { Text("\(v.as(Int.self) ?? 0)時") }
                }
            }
            .frame(height: 160)
        }
    }

    private var sunriseHour: Int? {
        weather.first(where: { $0.sunrise != nil })?.hour
    }
    private var sunsetHour: Int? {
        weather.first(where: { $0.sunset != nil })?.hour
    }
}

struct WeatherTableSection: View {
    let weather: [HourlyWeather]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("天気・風・波").font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    headerRow
                    ForEach(weather.filter { $0.hour % 3 == 0 }) { w in
                        dataRow(w)
                        Divider()
                    }
                }
            }
        }
    }

    private var headerRow: some View {
        HStack(spacing: 0) {
            cell("時刻", width: 40, isHeader: true)
            cell("気温", width: 50, isHeader: true)
            cell("風速", width: 55, isHeader: true)
            cell("波高", width: 50, isHeader: true)
            cell("潮位", width: 50, isHeader: true)
            cell("潮回り", width: 60, isHeader: true)
        }
        .background(Color(.systemGray5))
    }

    private func dataRow(_ w: HourlyWeather) -> some View {
        HStack(spacing: 0) {
            cell("\(w.hour):00", width: 40)
            cell(w.temperature.map { String(format: "%.1f°", $0) } ?? "-", width: 50)
            cell(w.windSpeed.map { String(format: "%.1fm/s", $0) } ?? "-", width: 55)
            cell(w.waveHeight.map { String(format: "%.1fm", $0) } ?? "-", width: 50)
            cell(w.tideLevel.map { "\(Int($0))cm" } ?? "-", width: 50)
            cell(w.tideType ?? "-", width: 60)
        }
    }

    private func cell(_ text: String, width: CGFloat, isHeader: Bool = false) -> some View {
        Text(text)
            .font(isHeader ? .caption.bold() : .caption)
            .frame(width: width, alignment: .center)
            .padding(.vertical, 4)
    }
}

struct FishSection: View {
    let fish: [FishRecommendation]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("今の時期に狙える魚").font(.headline)
            ForEach(fish) { f in
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "fish.fill")
                        .foregroundStyle(.blue)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(f.fish).font(.subheadline).bold()
                        Text("仕掛: \(f.method)")
                            .font(.caption).foregroundStyle(.secondary)
                        Text("餌: \(f.bait)")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

private extension Color {
    static let skyBlue = Color(red: 0.0, green: 0.6, blue: 1.0)
}
