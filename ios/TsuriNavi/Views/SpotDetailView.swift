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
                    VStack(spacing: 12) {
                        WeeklyCalendarSection(
                            scores: detail.weeklyScores,
                            selectedDate: vm.selectedDate,
                            onSelect: { date in Task { await vm.selectDate(date, spotId: spotId) } }
                        )

                        if let daily = detail.dailyScore {
                            ScoreHeroSection(daily: daily)
                                .padding(.horizontal, 16)
                        }

                        if !detail.hourlyScores.isEmpty {
                            HourlyScoreSection(scores: detail.hourlyScores)
                                .padding(.horizontal, 16)
                        }

                        if !detail.weather.isEmpty {
                            TideChartSection(weather: detail.weather)
                                .padding(.horizontal, 16)
                        }

                        if !detail.weather.isEmpty {
                            WeatherTableSection(weather: detail.weather)
                                .padding(.horizontal, 16)
                        }

                        if !detail.fish.isEmpty {
                            FishSection(fish: detail.fish)
                                .padding(.horizontal, 16)
                        }
                    }
                    .padding(.vertical, 12)
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

    @ScaledMetric(relativeTo: .body) private var circleSize: CGFloat = 36

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 2) {
                ForEach(scores) { ws in
                    let isSelected = ws.date == selectedDate
                    Button { onSelect(ws.date) } label: {
                        VStack(spacing: 4) {
                            Text(dayOfWeek(ws.date))
                                .font(.caption2.weight(.medium))
                                .tracking(-0.1)
                                .foregroundStyle(isSelected ? Color.appleBlue : .secondary)

                            Text(dayNumber(ws.date))
                                .font(.body.weight(isSelected ? .semibold : .regular))
                                .foregroundStyle(isSelected ? .white : .primary)
                                .frame(width: circleSize, height: circleSize)
                                .background(
                                    Circle()
                                        .fill(isSelected ? Color.appleBlue : Color.clear)
                                )

                            Text(ws.label)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Color.scoreColor(for: ws.label))
                        }
                        .frame(minWidth: 44)
                        .padding(.vertical, 4)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .animation(.easeInOut(duration: 0.15), value: isSelected)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.vertical, 4)
    }

    private func dayNumber(_ date: String) -> String { DateUtils.dayNumber(date) }
    private func dayOfWeek(_ date: String) -> String { DateUtils.dayOfWeek(date) }
}

// MARK: - Score Hero

struct ScoreHeroSection: View {
    let daily: DailyScore

    @ScaledMetric(relativeTo: .largeTitle) private var heroFontSize: CGFloat = 80
    @ScaledMetric(relativeTo: .title) private var scoreFontSize: CGFloat = 34

    var scoreColor: Color { Color.scoreColor(for: daily.label) }

    var body: some View {
        VStack(spacing: 0) {
            // Hero
            VStack(spacing: 10) {
                Text(daily.label)
                    .font(.system(size: heroFontSize, weight: .bold))
                    .foregroundStyle(scoreColor)

                HStack(spacing: 20) {
                    Text("\(daily.score)点")
                        .font(.system(size: scoreFontSize, weight: .semibold))
                        .tracking(-0.5)
                        .foregroundStyle(.primary)

                    if let best = daily.bestHour {
                        Label("\(best):00 ベスト", systemImage: "clock.fill")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 28)

            if let b = daily.breakdown {
                Divider()
                BreakdownView(breakdown: b)
                    .padding(16)
            }
        }
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
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
        VStack(alignment: .leading, spacing: 6) {
            ForEach(items, id: \.0) { name, val in
                if let val {
                    HStack(spacing: 10) {
                        Text(name)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(width: 40, alignment: .leading)
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color(.systemFill))
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(Color.appleBlue.opacity(0.85))
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
                .font(.subheadline.weight(.semibold))
                .tracking(-0.2)
                .foregroundStyle(.primary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .bottom, spacing: 5) {
                    ForEach(scores, id: \.hour) { s in
                        VStack(spacing: 3) {
                            if s.bestTimeFlag == 1 {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 8))
                                    .foregroundStyle(Color.appleBlue)
                            }
                            RoundedRectangle(cornerRadius: 3)
                                .fill(s.bestTimeFlag == 1
                                      ? barColor(s.score)
                                      : barColor(s.score).opacity(0.45))
                                .frame(width: 22, height: max(4, min(CGFloat(s.score), 100) * 0.72))
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
        .clipShape(RoundedRectangle(cornerRadius: 14))
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
                .font(.subheadline.weight(.semibold))
                .tracking(-0.2)
                .foregroundStyle(.primary)

            Chart {
                ForEach(weather) { w in
                    if let tide = w.tideLevel {
                        AreaMark(
                            x: .value("時刻", w.hour),
                            y: .value("潮位", tide)
                        )
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.appleBlue.opacity(0.20), Color.appleBlue.opacity(0.02)],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                        .interpolationMethod(.catmullRom)
                        LineMark(
                            x: .value("時刻", w.hour),
                            y: .value("潮位", tide)
                        )
                        .foregroundStyle(Color.appleBlue)
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
                    AxisGridLine().foregroundStyle(Color(.systemFill))
                }
            }
            .frame(height: 160)
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
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
                .font(.subheadline.weight(.semibold))
                .tracking(-0.2)
                .foregroundStyle(.primary)

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
        .clipShape(RoundedRectangle(cornerRadius: 14))
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
        .background(Color(.tertiarySystemFill))
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
        .background(isEven ? Color(.systemFill) : Color.clear)
    }

    private func cell(_ text: String, width: CGFloat, isHeader: Bool = false) -> some View {
        Text(text)
            .font(isHeader ? .caption.weight(.semibold) : .caption)
            .foregroundStyle(isHeader ? .primary : .secondary)
            .frame(width: width, alignment: .center)
            .padding(.vertical, 7)
    }
}

// MARK: - Fish Recommendations

struct FishSection: View {
    let fish: [FishRecommendation]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("今の時期に狙える魚", systemImage: "fish.fill")
                .font(.subheadline.weight(.semibold))
                .tracking(-0.2)
                .foregroundStyle(.primary)

            VStack(spacing: 8) {
                ForEach(fish) { f in
                    HStack(alignment: .center, spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color(.tertiarySystemFill))
                            Image(systemName: "fish.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(Color.appleBlue)
                        }
                        .frame(width: 40, height: 40)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(f.fish)
                                .font(.subheadline.weight(.semibold))
                                .tracking(-0.2)
                            Text("仕掛: \(f.method)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                            Text("餌: \(f.bait)")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(12)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}
