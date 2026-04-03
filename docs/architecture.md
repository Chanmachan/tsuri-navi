# Architecture

## システム概要

```
[iPhone (PWA)]
        │ HTTPS
        │
[Docker Compose on サブ機サーバー]
        │
        ├─ [app コンテナ]
        │     ├─ [Scheduler / Batch]
        │     │     └─ node-cron: 毎朝データ取得 → スコア計算 → DB保存
        │     │
        │     ├─ [Data Collector]
        │     │     ├─ Open-Meteo API（天気・風・波・気圧）
        │     │     └─ tide736.net API（潮汐・満干潮時刻・潮回り）
        │     │
        │     ├─ [Score Engine]
        │     │     └─ 潮回り・風速・波高・天気・マズメ・気圧・月齢 → 100点スコア算出
        │     │
        │     ├─ [Push Notifier]
        │     │     └─ web-push: 好条件の釣り場を事前通知
        │     │
        │     ├─ [API Server]
        │     │     └─ Next.js API Routes or Hono: フロントエンドへのデータ提供
        │     │
        │     └─ [DB (SQLite)]
        │           ├─ 釣り場マスタ（緯度経度、名称、タイプ）
        │           ├─ 魚種×季節マスタ（地域×月×魚種×釣り方×餌）
        │           ├─ 天気・潮汐キャッシュ（7日分）
        │           └─ ユーザー設定（お気に入り、通知設定、自宅位置）
        │
        └─ [osrm コンテナ]
              └─ OSRM: 自宅→釣り場の車ルート・所要時間
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js（App Router）+ TypeScript + Tailwind CSS |
| PWA | next-pwa（ホーム画面追加でアプリ化、プッシュ通知） |
| チャート | Recharts（タイドグラフ） |
| 地図 | Leaflet + OpenStreetMap |
| バックエンド | Next.js API Routes or Hono（Node.js） |
| DB | SQLite（better-sqlite3） |
| スケジューラ | node-cron |
| プッシュ通知 | web-push（Web Push API） |
| ルート計算 | OSRM（セルフホスト） |
| 天気・海況API | Open-Meteo（無料、キー不要） |
| 潮汐API | tide736.net（無料、サポートなし） |
| テスト | Vitest |
| インフラ | Docker Compose（開発・本番共通） |

## Docker構成

| コンテナ | ベースイメージ | 役割 |
|---|---|---|
| app | node:20-slim | Next.jsアプリ（フロントエンド + API Routes + node-cron + web-push） |
| osrm | osrm/osrm-backend | ルート計算サーバー（日本地図データ） |

- 開発時はソースコードをボリュームマウントしてホットリロード
- SQLiteはappコンテナ内でファイルDB（ボリュームで永続化）
- サブ機サーバーでも同じDocker Composeで起動（開発＝本番の構成一致）
- ホストマシンへの依存はDockerのみ（Node.js等のローカルインストール不要）

## データフロー

1. node-cronが毎朝（例：5:00）バッチを起動
2. Data Collectorが登録全ポイントの天気・海況・潮汐データを取得しDBにキャッシュ
3. Score Engineが全ポイント×7日分×24時間のスコアを計算しDBに保存
4. 通知条件を満たすポイントがあればPush Notifierが通知送信
5. ユーザーがPWAを開くと、API ServerがDBから計算済みスコアを返却
6. 検索時はOSRMで距離計算し、スコアと組み合わせてランキング表示

## 外部API

### Open-Meteo（天気・海況）
- Weather API: `https://api.open-meteo.com/v1/forecast`
- Marine API: `https://marine-api.open-meteo.com/v1/marine`
- 無料、キー不要、1日10,000リクエストまで

### tide736.net（潮汐）
- `https://api.tide736.net/get_tide.php`
- 無料、サポートなし
- バックアップ: TideCheck（50req/日無料）

### OSRM（ルート計算）
- osrmコンテナでセルフホスト
- 日本地図データ（OpenStreetMap）を前処理して利用

## DB スキーマ（概要）

### 釣り場マスタ
- id, name, latitude, longitude, type（漁港/磯/サーフ等）, prefecture, is_favorite, is_preset

### 魚種×季節マスタ
- id, fish_name, region, month_start, month_end, fishing_method, bait, notes

### 天気・潮汐キャッシュ
- id, spot_id, date, hour, weather_code, temperature, wind_speed, wind_direction, precipitation, pressure, wave_height, swell_height, tide_level, tide_type, sunrise, sunset, moon_age

### スコア
- id, spot_id, date, hour, score, score_breakdown（JSON）, best_time_flag

### ユーザー設定
- id, home_latitude, home_longitude, notification_enabled, notification_timing, score_weights（JSON）