import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "data", "tsuri-navi.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (db) return db;

	const dir = path.dirname(DB_PATH);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	db = new Database(DB_PATH);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	runMigrations(db);

	return db;
}

function runMigrations(database: Database.Database): void {
	const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of files) {
		const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
		try {
			database.exec(sql);
		} catch (e) {
			// ALTER TABLE ADD COLUMN is not idempotent in SQLite; ignore duplicate column errors
			if (!(e instanceof Error) || !e.message.includes("duplicate column name")) {
				throw e;
			}
		}
	}
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
