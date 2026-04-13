# ADR 0001: 技術スタック選定

- Status: Accepted
- Date: 2026-04-03
- Last-validated: 2026-04-13

## Context

tsuri-naviは海釣り向けの個人用ナビアプリ。以下の要件を満たす技術スタックを選定する必要がある。

- ランニングコスト ¥0
- iPhoneでアプリっぽく使える
- プッシュ通知対応
- サブ機サーバーでバックエンド稼働
- App Store公開は不要

## Decision

### プラットフォーム: PWA（Next.js）

**却下した選択肢:**
- Swift（ネイティブiOS）: UXは最良だが、無料Apple IDだと証明書が7日で失効し毎週再ビルドが必要。Developer Program($99/年)はコスト方針に反する。

**採用理由:**
- ホーム画面追加でアプリライクなUX
- App Store審査不要
- iOS 16.4+でプッシュ通知対応
- 1つのコードベースでPC/モバイル両対応
- 後からSwiftネイティブへの移行余地あり

### フロントエンド: Next.js + TypeScript + Tailwind CSS

- App Routerで最新のReactパターンを活用
- Tailwindで高速なUI構築
- Rechartsでタイドグラフ描画
- Leaflet + OpenStreetMapで地図表示（無料）

### バックエンド: Next.js API Routes or Hono（Node.js）

- フロントと同一リポジトリで管理可能
- Honoは軽量で高速、サブ機の負荷を最小化
- 最終選定は実装開始時に決定

### DB: SQLite

- サーバーレスで設定不要、ファイル1つで完結
- 個人用途にはPostgreSQLはオーバースペック
- better-sqlite3（Node.js）で同期的に高速アクセス

### テスト: Vitest

- Next.js/TypeScriptとの親和性が高い
- Jestより高速

## Consequences

- PWAのプッシュ通知はiOS 16.4+かつホーム画面追加が前提条件
- iOSではBackground Sync非対応のため、データ更新はサーバー側バッチで補う
- SQLiteは同時書き込みに弱いが、個人利用なので問題なし