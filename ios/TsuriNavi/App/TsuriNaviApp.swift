import SwiftUI

@main
struct TsuriNaviApp: App {
    private let settings = AppSettings()
    private let api: APIClient

    init() {
        api = APIClient(settings: settings)
    }

    var body: some Scene {
        WindowGroup {
            ContentView(settings: settings, api: api)
        }
    }
}

struct ContentView: View {
    let settings: AppSettings
    let api: APIClient

    @State private var homeVM: HomeViewModel
    @State private var mapVM: MapViewModel
    @State private var searchVM: SearchViewModel

    init(settings: AppSettings, api: APIClient) {
        self.settings = settings
        self.api = api
        _homeVM = State(initialValue: HomeViewModel(api: api, settings: settings))
        _mapVM = State(initialValue: MapViewModel(api: api))
        _searchVM = State(initialValue: SearchViewModel(api: api))
    }

    var body: some View {
        TabView {
            HomeView()
                .environment(homeVM)
                .tabItem { Label("ホーム", systemImage: "house.fill") }

            SearchView(vm: searchVM)
                .tabItem { Label("検索", systemImage: "magnifyingglass") }

            TsuriMapView(vm: mapVM)
                .tabItem { Label("マップ", systemImage: "map.fill") }

            SettingsView()
                .environment(settings)
                .tabItem { Label("設定", systemImage: "gearshape.fill") }
        }
        .tint(.appleBlue)
        .environment(api)
        .environment(settings)
    }
}
