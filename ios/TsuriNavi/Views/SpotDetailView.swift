import SwiftUI
import Charts

struct SpotDetailView: View {
    let spotId: Int
    let spotName: String
    var initialDate: String? = nil

    @State private var vm: SpotDetailViewModel?
    @Environment(APIClient.self) private var api

    var body: some View {
        ScrollView {
            if let vm {
                if vm.isLoading {
                    ProgressView().padding(.top, 60)
                } else if let detail = vm.detail {
                    VStack(spacing: 16) {
                        WeeklyCalendarSection(
                            scores: detail.weeklyScores,
                            selectedDate: vm.selectedDate,
                            onSelect: { date in Task { await vm.selectDate(date, spotId: spotId) } }
                        )

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
                    .padding(.vertical, 16)
                } else if let error = vm.error {
                    ContentUnavailableView(error, systemImage: "wifi.slash")
                        .padding(.top, 60)
                }
            } else {
                ProgressView().padding(.top, 60)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(spotName)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            let newVM = SpotDetailViewModel(api: api)
            if let initialDate { newVM.selectedDate = initialDate }
            vm = newVM
            await newVM.load(spotId: spotId)
        }
    }
}

// MARK: - Weekly Calendar

struct WeeklyCalendarSection: View {
    let scores: [WeeklyScore]
    let selectedDate: String
    let onSelect: (String) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(scores) { ws in
                    Button { onSelect(ws.date) } label: {
                        VStack(spacing: 6) {
                            Text(shortDate(ws.date))
                                .font(.caption2)
                                .foregroundStyle(
                                    ws.date == selectedDate ? Color.oceanPrimary : Color.secondary
                                )
                            ScoreBadge(label: ws.label, score: ws.score, compact: true)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 8)
                        .background(
                            ws.date == selectedDate
                                ? Color.oceanPrimary.opacity(0.1)
                                : Color.clear
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay {
                            if ws.date == selectedDate {
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.oceanPrimary.opacity(0.3), lineWidth: 1)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    private func shortDate(_ date: String) -> String {
        let parts = date.split(separator: "-")
        guard parts.count == 3 else { return date }
        return "\(parts[1])/\(parts[2])"
    }
}

// MARK: - Score Header

struct ScoreHeaderSection: View {
    let daily: DailyScore

    var scoreColor: Color { Color.scoreColor(for: daily.label) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center, spacing: 20) {
                ZStack {
                    Circle()
                        .fill(scoreColor.opacity(0.1))
                    Text(daily.label)
                        .font(.system(size: 52, weight: .bold))
                        .foregroundStyle(scoreColor)
                }
                .frame(width: 88, height: 88)

                VStack(alignment: .leading, spacing: 6) {
                    Text("\(daily.score)点")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(scoreColor)
                    if let best = daily.bestHour {
                        Label("ベスト \(best):00", systemImage: "clock.fill")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 0)
            }

            if let b = daily.breakdown {
                Divider()
                BreakdownView(breakdown: b)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Breakdown Bars

struct BreakdownView: View {
    let breakdown: ScoreBreakdown

    var items: [(String, Double?)] {
        [("潮", breakdown.tide), ("風", breakdown.wind), ("波", breakdown.wave),
         ("天気", breakdown.weather), ("マズメ", breakdown.mazume),
         ("気圧", breakdown.pressure), ("月齢", breakdown.moon)]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            ForEach(items, id: \.0) { name, val in
                if let val {
                    HStack(spacing: 8) {
                        Text(name)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(width: 40, alignment: .leading)
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color(.systemGray5))
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.oceanPrimary.opacity(0.7))
                                    .frame(width: geo.size.width * min(max(val / 100, 0), 1))
                            }
                        }
                        .frame(height: 6)
                        Text(String(format: "%.0f", val))
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(width: 24, alignment: .trailing)
                    }
                }
            }
        }
    }
}

// MARK: - Hourly Score Chart

struct HourlyScoreSection: View {
    let scores: [HourlyScore]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("時間帯スコア", systemImage: "chart.bar.fill")
                .font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .bottom, spacing: 6) {
                    ForEach(scores, id: \.hour) { s in
                        VStack(spacing: 4) {
                            if s.bestTimeFlag == 1 {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 9))
                                    .foregroundStyle(.yellow)
                            }
                            RoundedRectangle(cornerRadius: 4)
                                .fill(barColor(s.score).opacity(s.bestTimeFlag == 1 ? 1.0 : 0.7))
                                .frame(width: 22, height: max(4, CGFloat(s.score) * 0.72))
                            Text("\(s.hour)")
                                .font(.system(size: 9))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .frame(height: 100)
                .padding(.vertical, 4)
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func barColor(_ score: Int) -> Color {
        if score >= 80 { return Color.scoreColor(for: "◎") }
        if score >= 60 { return Color.scoreColor(for: "○") }
        if score >= 40 { return Color.scoreColor(for: "△") }
        return Color.scoreColor(for: "×")
    }
}

// MARK: - Tide Chart

struct TideChartSection: View {
    let weather: [HourlyWeather]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("タイドグラフ", systemImage: "water.waves")
                .font(.headline)
            Chart {
                ForEach(weather) { w in
                    if let tide = w.tideLevel {
                        AreaMark(
                            x: .value("時刻", w.hour),
                            y: .value("潮位", tide)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.oceanPrimary.opacity(0.25), Color.oceanPrimary.opacity(0.05)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        .interpolationMethod(.catmullRom)
                        LineMark(
                            x: .value("時刻", w.hour),
                            y: .value("潮位", tide)
                        )
                        .foregroundStyle(Color.oceanPrimary)
                        .interpolationMethod(.catmullRom)
                        .lineStyle(StrokeStyle(lineWidth: 2))
                    }
                }
                if let sunrise = sunriseHour {
                    RuleMark(x: .value("日の出", sunrise))
                        .foregroundStyle(Color.orange.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .annotation(position: .top) {
                            Image(systemName: "sunrise.fill")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                }
                if let sunset = sunsetHour {
                    RuleMark(x: .value("日の入り", sunset))
                        .foregroundStyle(Color.purple.opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
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
                    AxisGridLine().foregroundStyle(Color(.systemGray5))
                }
            }
            .frame(height: 160)
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var sunriseHour: Int? {
        weather.first(where: { $0.sunrise != nil })?.hour
    }
    private var sunsetHour: Int? {
        weather.first(where: { $0.sunset != nil })?.hour
    }
}

// MARK: - Weather Table

struct WeatherTableSection: View {
    let weather: [HourlyWeather]

    private let filteredWeather: [HourlyWeather]

    init(weather: [HourlyWeather]) {
        self.weather = weather
        self.filteredWeather = weather.filter { $0.hour % 3 == 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("天気・風・波", systemImage: "wind")
                .font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    headerRow
                    ForEach(Array(filteredWeather.enumerated()), id: \.offset) { idx, w in
                        dataRow(w, isEven: idx % 2 == 1)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var headerRow: some View {
        HStack(spacing: 0) {
            cell("時刻",   width: 44, isHeader: true)
            cell("気温",   width: 54, isHeader: true)
            cell("風速",   width: 60, isHeader: true)
            cell("波高",   width: 54, isHeader: true)
            cell("潮位",   width: 54, isHeader: true)
            cell("潮回り", width: 64, isHeader: true)
        }
        .background(Color.oceanPrimary.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func dataRow(_ w: HourlyWeather, isEven: Bool) -> some View {
        HStack(spacing: 0) {
            cell("\(w.hour):00", width: 44)
            cell(w.temperature.map { String(format: "%.1f°", $0) } ?? "-", width: 54)
            cell(w.windSpeed.map    { String(format: "%.1fm/s", $0) } ?? "-", width: 60)
            cell(w.waveHeight.map  { String(format: "%.1fm", $0) } ?? "-", width: 54)
            cell(w.tideLevel.map   { "\(Int($0))cm" } ?? "-", width: 54)
            cell(w.tideCycle ?? "-", width: 64)
        }
        .background(isEven ? Color(.systemGray6) : Color.clear)
    }

    private func cell(_ text: String, width: CGFloat, isHeader: Bool = false) -> some View {
        Text(text)
            .font(isHeader ? .caption.weight(.semibold) : .caption)
            .foregroundStyle(isHeader ? Color.oceanDeep : Color.primary)
            .frame(width: width, alignment: .center)
            .padding(.vertical, 6)
    }
}

// MARK: - Fish Recommendations

struct FishSection: View {
    let fish: [FishRecommendation]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("今の時期に狙える魚", systemImage: "fish.fill")
                .font(.headline)
            VStack(spacing: 8) {
                ForEach(fish) { f in
                    HStack(alignment: .center, spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.oceanAccent.opacity(0.1))
                            Image(systemName: "fish.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(Color.oceanAccent)
                        }
                        .frame(width: 40, height: 40)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(f.fish)
                                .font(.subheadline.weight(.semibold))
                            Text("仕掛: \(f.method)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("餌: \(f.bait)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(10)
                    .background(Color.oceanAccent.opacity(0.05))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
