const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

class Database {
    constructor() {
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(
                path.join(__dirname, 'godfactor.db'),
                sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Connected to SQLite database');
                        this.createTables().then(resolve).catch(reject);
                    }
                }
            );
        });
    }

    async createTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'believer' CHECK(role IN ('believer', 'admin')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME
            )`,

            `CREATE TABLE IF NOT EXISTS devotionals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                scripture TEXT NOT NULL,
                reflection TEXT NOT NULL,
                prayer TEXT NOT NULL,
                action_step TEXT NOT NULL,
                date DATE UNIQUE NOT NULL,
                scheduled BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            `CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                anonymous BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            `CREATE TABLE IF NOT EXISTS post_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                response_type TEXT CHECK(response_type IN ('praying', 'amen', 'thankyou')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id),
                FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            `CREATE TABLE IF NOT EXISTS testimonies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT CHECK(category IN ('salvation', 'healing', 'provision', 'peace', 'deliverance', 'other')),
                anonymous BOOLEAN DEFAULT 0,
                approved BOOLEAN DEFAULT 0,
                approved_by INTEGER,
                approved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (approved_by) REFERENCES users (id)
            )`,

            `CREATE TABLE IF NOT EXISTS prayers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                prayer_count INTEGER DEFAULT 0,
                answered BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            `CREATE TABLE IF NOT EXISTS prayer_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prayer_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(prayer_id, user_id),
                FOREIGN KEY (prayer_id) REFERENCES prayers (id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`
        ];

        for (const query of queries) {
            await this.runQuery(query);
        }
        await this.createDefaultAdmin();
        await this.seedInitialData();
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    allQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async createDefaultAdmin() {
        const adminExists = await this.getQuery("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await this.runQuery(
                "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                ['System Admin', 'admin@godfactor.app', hashedPassword, 'admin']
            );
            console.log('Default admin user created: admin@godfactor.app / admin123');
        }
    }

    async seedInitialData() {
        const devotionalCount = await this.getQuery("SELECT COUNT(*) as count FROM devotionals");
        if (devotionalCount.count === 0) {
            console.log('Seeding initial devotionals...');
            const seedDevotionals = require('./data/seed-devotionals');
            for (const devotional of seedDevotionals) {
                await this.runQuery(
                    `INSERT INTO devotionals (title, scripture, reflection, prayer, action_step, date) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [devotional.title, devotional.scripture, devotional.reflection, 
                     devotional.prayer, devotional.action_step, devotional.date]
                );
            }
        }

        const testimonyCount = await this.getQuery("SELECT COUNT(*) as count FROM testimonies");
        if (testimonyCount.count === 0) {
            console.log('Seeding sample testimonies...');
            const seedTestimonies = require('./data/seed-testimonies');
            for (const testimony of seedTestimonies) {
                await this.runQuery(
                    `INSERT INTO testimonies (user_id, title, content, category, anonymous, approved, approved_at) 
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [1, testimony.title, testimony.content, testimony.category, 
                     testimony.anonymous, 1]
                );
            }
        }

        const prayerCount = await this.getQuery("SELECT COUNT(*) as count FROM prayers");
        if (prayerCount.count === 0) {
            console.log('Seeding sample prayers...');
            const seedPrayers = require('./data/seed-prayers');
            for (const prayer of seedPrayers) {
                await this.runQuery(
                    `INSERT INTO prayers (user_id, content, prayer_count) VALUES (?, ?, ?)`,
                    [1, prayer.content, prayer.prayer_count]
                );
            }
        }
    }
}

module.exports = new Database();
