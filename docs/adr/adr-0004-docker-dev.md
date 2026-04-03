# ADR 0003: Docker開発環境の採用

- Status: Accepted
- Date: 2026-04-03
- Last-validated: 2026-04-03

## Context

開発環境をホストマシンに直接構築すると、Node.js・SQLite・OSRMなどの依存がローカル環境を汚す。また、サブ機サーバーへのデプロイ時に環境差異が問題になりうる。

## Decision

Docker Compose で開発環境を構築する。

### 構成

| コンテナ | 役割 |
|---|---|
| app | Next.js アプリ（フロントエンド + API Routes） |
| osrm | OSRM ルート計算サーバー（日本地図データ） |

- SQLiteはファイルDBなのでappコンテナ内で完結（専用コンテナ不要）
- 開発時はホストのソースコードをボリュームマウントしてホットリロード
- 本番（サブ機）でも同じDocker Composeで起動

### 開発フロー
- `docker compose up` で開発環境が立ち上がる
- `docker compose exec app npm run dev` などでコマンド実行
- Claude Codeもコンテナ内で作業可能（ボリュームマウント経由）

**却下した選択肢:**
- ホスト直接インストール: 環境を汚す、サブ機との差異が生じる
- devcontainer: VS Code前提になる。Claude Code中心の開発には不要

## Consequences

- Dockerのインストールがホストマシンに必要（唯一の依存）
- 開発環境とサブ機サーバーの構成が同一になり、デプロイが容易
- OSRMコンテナは日本地図データのダウンロード・前処理に初回のみ時間がかかる
- ホットリロードはボリュームマウントで対応（macOSではファイル監視のパフォーマンスに注意）