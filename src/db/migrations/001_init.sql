-- Migration 001: Initial schema

-- 釣り場マスタ
CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('漁港', '磯', 'サーフ', '堤防', 'その他')),
  prefecture TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_preset INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 魚種×季節マスタ
CREATE TABLE IF NOT EXISTS fish_seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fish_name TEXT NOT NULL,
  region TEXT NOT NULL,
  month_start INTEGER NOT NULL CHECK (month_start BETWEEN 1 AND 12),
  month_end INTEGER NOT NULL CHECK (month_end BETWEEN 1 AND 12),
  fishing_method TEXT NOT NULL,
  bait TEXT,
  notes TEXT
);

-- 天気・潮汐キャッシュ
CREATE TABLE IF NOT EXISTS weather_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  weather_code INTEGER,
  temperature REAL,
  wind_speed REAL,
  wind_direction REAL,
  precipitation REAL,
  pressure REAL,
  wave_height REAL,
  swell_height REAL,
  tide_level REAL,
  tide_type TEXT CHECK (tide_type IN ('満潮', '干潮', NULL)),
  tide_cycle TEXT,
  sunrise TEXT,
  sunset TEXT,
  moon_age REAL,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (spot_id, date, hour)
);

-- スコア
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spot_id INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  hour INTEGER CHECK (hour BETWEEN 0 AND 23),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  score_breakdown TEXT NOT NULL DEFAULT '{}',
  best_time_flag INTEGER NOT NULL DEFAULT 0,
  calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (spot_id, date, hour)
);

-- ユーザー設定
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  home_latitude REAL,
  home_longitude REAL,
  notification_enabled INTEGER NOT NULL DEFAULT 0,
  notification_timing TEXT NOT NULL DEFAULT '2days_before',
  score_weights TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Default user settings row
INSERT OR IGNORE INTO user_settings (id) VALUES (1);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weather_cache_spot_date ON weather_cache (spot_id, date);
CREATE INDEX IF NOT EXISTS idx_scores_spot_date ON scores (spot_id, date);
CREATE INDEX IF NOT EXISTS idx_scores_date_score ON scores (date, score DESC);
