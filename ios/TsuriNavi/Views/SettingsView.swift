import SwiftUI
import CoreLocation

struct SettingsView: View {
    @Environment(AppSettings.self) private var settings
    @State private var serverURLInput = ""
    @State private var homeLatInput = ""
    @State private var homeLngInput = ""
    @State private var locationManager = CLLocationManager()
    @State private var isFetchingLocation = false

    var body: some View {
        @Bindable var s = settings
        NavigationStack {
            Form {
                Section("サーバー接続") {
                    HStack {
                        Text("URL")
                        TextField("http://192.168.1.x:3000", text: $serverURLInput)
                            .keyboardType(.URL)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                }

                Section("自宅位置") {
                    HStack {
                        Text("緯度")
                        TextField("37.0", text: $homeLatInput)
                            .keyboardType(.decimalPad)
                    }
                    HStack {
                        Text("経度")
                        TextField("140.0", text: $homeLngInput)
                            .keyboardType(.decimalPad)
                    }
                    Button(action: fetchCurrentLocation) {
                        if isFetchingLocation {
                            ProgressView()
                        } else {
                            Label("現在地を取得", systemImage: "location.fill")
                        }
                    }
                }

                Section("通知") {
                    Toggle("ローカル通知", isOn: $s.notificationsEnabled)
                }

                Section {
                    Button("保存") { saveSettings() }
                        .frame(maxWidth: .infinity, alignment: .center)
                }
            }
            .navigationTitle("設定")
            .onAppear { loadCurrentValues() }
        }
    }

    private func loadCurrentValues() {
        serverURLInput = settings.serverURL
        homeLatInput = settings.homeLat.map { String($0) } ?? ""
        homeLngInput = settings.homeLng.map { String($0) } ?? ""
    }

    private func saveSettings() {
        if !serverURLInput.isEmpty {
            settings.serverURL = serverURLInput.trimmingCharacters(in: .whitespaces)
        }
        settings.homeLat = homeLatInput.isEmpty ? nil : Double(homeLatInput)
        settings.homeLng = homeLngInput.isEmpty ? nil : Double(homeLngInput)
    }

    private func fetchCurrentLocation() {
        isFetchingLocation = true
        let delegate = LocationDelegate {
            coord in
            homeLatInput = String(format: "%.6f", coord.latitude)
            homeLngInput = String(format: "%.6f", coord.longitude)
            isFetchingLocation = false
        } onFailure: {
            isFetchingLocation = false
        }
        locationManager.delegate = delegate
        locationManager.requestWhenInUseAuthorization()
        locationManager.requestLocation()
        // retain delegate
        objc_setAssociatedObject(locationManager, "delegate", delegate, .OBJC_ASSOCIATION_RETAIN)
    }
}

private final class LocationDelegate: NSObject, CLLocationManagerDelegate {
    let onLocation: (CLLocationCoordinate2D) -> Void
    let onFailure: () -> Void

    init(onLocation: @escaping (CLLocationCoordinate2D) -> Void, onFailure: @escaping () -> Void) {
        self.onLocation = onLocation
        self.onFailure = onFailure
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let loc = locations.first { onLocation(loc.coordinate) }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        onFailure()
    }
}
