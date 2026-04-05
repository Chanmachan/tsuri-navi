# iOS App Architecture

## システム全体図

```text
[Swift iOS App (SwiftUI, iOS 17+)]
        │
        │ HTTP/JSON (URLSession)
        │
[Next.js バックエンド on サブ機サーバー]
        │
        ├─ API Routes（既存）
        ├─ node-cron バッチ（毎朝データ取得・スコア計算）
        └─ SQLite DB（スコア・天気・潮汐キャッシュ）
```

iOS アプリはバックエンドを変更せず API を消費する。
ただし、釣り場詳細用に `GET /api/spots/[id]` を新規追加する（現在は PATCH/DELETE のみ）。

---

## iOS アプリ構成

```text
TsuriNavi/
├── App/
│   └── TsuriNaviApp.swift          # エントリーポイント、起動時通知スケジュール
│
├── Views/
│   ├── HomeView.swift              # 釣り場一覧 + 週間カレンダー
│   ├── SpotDetailView.swift        # 詳細（スコア・タイドグラフ・天気テーブル）
│   ├── SearchView.swift            # 距離検索
│   ├── MapView.swift               # MapKit マップ
│   └── SettingsView.swift          # サーバーURL・自宅位置・通知設定
│
├── ViewModels/
│   ├── HomeViewModel.swift
│   ├── SpotDetailViewModel.swift
│   ├── SearchViewModel.swift
│   └── MapViewModel.swift
│
├── Services/
│   ├── APIClient.swift             # URLSession ラッパー、全 API 呼び出し
│   └── NotificationService.swift  # ローカル通知スケジューリング
│
├── Models/                         # Codable structs（API レスポンスと1対1）
│   ├── Spot.swift
│   ├── SpotDetail.swift
│   ├── SearchResult.swift
│   └── Settings.swift
│
└── Utilities/
    └── AppSettings.swift           # UserDefaults ラッパー（サーバーURL等）
```

---

## 技術スタック

| レイヤー | 技術 | 選定理由 |
|---|---|---|
| UI | SwiftUI | iOS 17+ 対象、宣言的 UI |
| 非同期 | async/await + URLSession | 外部依存なし |
| グラフ | Swift Charts | iOS 16+ 標準、タイドグラフに使用 |
| 地図 | MapKit | 標準、無料 |
| 通知 | UserNotifications | ローカル通知（APNs 不要） |
| 設定永続化 | UserDefaults | サーバー URL・自宅位置の保存 |
| 状態管理 | @Observable (iOS 17) | ViewModelパターン |

---

## API エンドポイント対応表

| 画面 | メソッド | エンドポイント | 内容 |
|---|---|---|---|
| ホーム | GET | `/api/spots` | 釣り場一覧 + 今日のスコア |
| 詳細 | GET | `/api/spots/[id]` | 釣り場情報 + 今日の詳細データ ※新規追加 |
| 詳細（週間） | GET | `/api/spots/[id]/scores` | 週間スコア |
| 検索 | GET | `/api/search?date=&maxDistanceKm=` | 距離ベース検索 |
| 釣り場作成 | POST | `/api/spots` | 新規釣り場追加 |
| 釣り場更新 | PATCH | `/api/spots/[id]` | 名前・タイプ変更 / お気に入りトグル |
| 釣り場削除 | DELETE | `/api/spots/[id]` | 削除 |
| 設定取得 | GET | `/api/settings` | 自宅位置・通知設定 |
| 設定保存 | POST | `/api/settings` | 自宅位置・通知設定更新 |

### 新規追加: `GET /api/spots/[id]`

釣り場詳細画面に必要なデータを一括返却する。

```json
{
  "spot": { "id": 1, "name": "久ノ浜漁港", "latitude": 37.07, "longitude": 140.99, "type": "漁港", "prefecture": "福島県", "is_favorite": 0 },
  "dailyScore": { "score": 72, "label": "○", "bestHour": 5, "breakdown": {...} },
  "hourlyScores": [{ "hour": 0, "score": 45, "best_time_flag": 0 }, ...],
  "weather": [{ "hour": 0, "temperature": 12.5, "windSpeed": 3.2, "windDirection": 180, "waveHeight": 0.8, "tideLevel": 120, "tideType": "満潮", ... }],
  "weeklyScores": [{ "date": "2026-04-05", "score": 72, "label": "○" }, ...]
}
```

---

## ローカル通知フロー

```
アプリ起動
    │
    ├─ GET /api/spots（全釣り場 + 今日のスコア）
    ├─ GET /api/spots/[id]/scores（各釣り場の週間スコア）
    │
    └─ NotificationService.schedule()
           ├─ スコア ◎ (80+) の日付・釣り場を抽出
           ├─ 前日 18:00 に UNTimeIntervalNotificationTrigger をセット
           └─ 既存の pending notifications をリセットしてから再スケジュール
```

---

## データフロー（釣り場詳細画面）

```
SpotDetailView
    │ onAppear / 日付変更
    ▼
SpotDetailViewModel.load(spotId, date)
    ├─ GET /api/spots/[id]?date={date}
    └─ データ受け取り → @Published プロパティ更新
            │
            ├─ ScoreBreakdownSection（スコア内訳）
            ├─ HourlyScoreChart（時間帯スコアバー）
            ├─ TideChartView（Swift Charts）
            ├─ WeatherTableView
            └─ FishRecommendationSection
```

---

## バックエンド追加対応

iOS 対応のためバックエンドへの追加変更：

### 1. `GET /api/spots/[id]` エンドポイント追加
- 釣り場情報 + 当日の詳細データ（dailyScore, hourlyScores, weather, weeklyScores）を一括返却
- クエリパラメータ `date=YYYY-MM-DD`（省略時は今日）

### 2. CORS 設定（必要な場合）
- サブ機で運用中であれば同一オリジン問題は発生しない
- ただし iOS シミュレーターからアクセスする際に CORS が必要になる場合あり
- `next.config.ts` に `headers()` を追加して対応

---

## 開発環境

| 項目 | 内容 |
|---|---|
| Xcode | 16 以上 |
| iOS Deployment Target | 17.0 |
| Swift | 6.0 |
| 実機デプロイ | Xcode 無料プロビジョニング（7日ごと再サイン必要） |
| バックエンド接続 | 自宅 LAN: `http://192.168.x.x:3002` |
