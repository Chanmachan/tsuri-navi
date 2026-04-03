import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH =
	process.env.DB_PATH ?? path.join(process.cwd(), "data", "tsuri-navi.db");

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
	const migrationsDir = path.join(
		path.dirname(new URL(import.meta.url).pathname),
		"migrations",
	);

	const files = fs
		.readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of files) {
		const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
		database.exec(sql);
	}
}

export function closeDb(): void {
	if (db) {
		db.close();
		db = null;
	}
}
