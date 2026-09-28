const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'urban-studios.db');
const db = new sqlite3.Database(dbPath);

function ensureBookingColumns() {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(bookings)', (error, columns) => {
      if (error) return reject(error);

      const existingColumns = new Set((columns || []).map((column) => column.name));
      const migrations = [];

      if (!existingColumns.has('phone')) {
        migrations.push('ALTER TABLE bookings ADD COLUMN phone TEXT');
      }

      if (!existingColumns.has('deposit_amount')) {
        migrations.push('ALTER TABLE bookings ADD COLUMN deposit_amount INTEGER');
      }

      if (!migrations.length) {
        return resolve();
      }

      let index = 0;
      const runNextMigration = () => {
        if (index >= migrations.length) return resolve();

        db.run(migrations[index], (migrationError) => {
          if (migrationError) return reject(migrationError);
          index += 1;
          runNextMigration();
        });
      };

      runNextMigration();
    });
  });
}

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT,
          service TEXT NOT NULL,
          preferred_date TEXT NOT NULL,
          deposit_amount INTEGER,
          details TEXT NOT NULL,
          status TEXT DEFAULT 'new',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (error) => {
        if (error) return reject(error);

        ensureBookingColumns()
          .then(() => {
            db.run(`
              CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT,
                phone TEXT,
                message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
              )
            `, (contactError) => {
              if (contactError) return reject(contactError);

              db.run(`
                CREATE TABLE IF NOT EXISTS campaigns (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  message TEXT NOT NULL,
                  recipients TEXT NOT NULL,
                  total_count INTEGER NOT NULL,
                  sent_count INTEGER NOT NULL,
                  failed_count INTEGER NOT NULL,
                  status TEXT DEFAULT 'sent',
                  created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
              `, (campaignError) => {
                if (campaignError) return reject(campaignError);
                resolve();
              });
            });
          })
          .catch(reject);
      });
    });
  });
}

module.exports = { db, initDb };
