-- Migration 003: Add tide_cycle column to weather_cache
-- Stores daily tide cycle (e.g. "大潮", "中潮", "小潮", "長潮", "若潮")

ALTER TABLE weather_cache ADD COLUMN tide_cycle TEXT;
