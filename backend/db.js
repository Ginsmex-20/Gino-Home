const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { dbPath } = require('./config');

// Verzeichnis anlegen falls nötig (z.B. userData in Electron)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    phone TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'general',
    avatar TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo',
    priority TEXT DEFAULT 'medium',
    type TEXT DEFAULT 'general',
    due_date DATE,
    assignee_id INTEGER REFERENCES users(id),
    group_id INTEGER REFERENCES groups(id),
    budget REAL DEFAULT 0,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS finance_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'other',
    date DATE DEFAULT (date('now')),
    description TEXT,
    group_id INTEGER REFERENCES groups(id),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company TEXT,
    amount REAL DEFAULT 0,
    billing_cycle TEXT DEFAULT 'monthly',
    start_date DATE,
    end_date DATE,
    category TEXT DEFAULT 'other',
    status TEXT DEFAULT 'active',
    notes TEXT,
    document_id INTEGER,
    group_id INTEGER REFERENCES groups(id),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    size INTEGER DEFAULT 0,
    mimetype TEXT,
    category TEXT DEFAULT 'other',
    description TEXT,
    group_id INTEGER REFERENCES groups(id),
    uploaded_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vault_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    email TEXT,
    username TEXT,
    password_encrypted TEXT,
    website TEXT,
    category TEXT DEFAULT 'other',
    notes TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    all_day INTEGER DEFAULT 0,
    color TEXT DEFAULT '#f97316',
    group_id INTEGER REFERENCES groups(id),
    created_by INTEGER REFERENCES users(id),
    task_id INTEGER REFERENCES tasks(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS document_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '📁',
    color TEXT DEFAULT '#f97316',
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, created_by, group_id)
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    lender TEXT,
    type TEXT DEFAULT 'loan',
    total_amount REAL NOT NULL,
    remaining_amount REAL,
    monthly_rate REAL DEFAULT 0,
    interest_rate REAL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    notes TEXT,
    group_id INTEGER REFERENCES groups(id),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS grocery_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant TEXT NOT NULL,
    date DATE NOT NULL,
    total_amount REAL NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS grocery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER REFERENCES grocery_receipts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price REAL DEFAULT 0,
    quantity REAL DEFAULT 1
  );
`);

// Migrations for existing databases
try { db.exec(`ALTER TABLE groups ADD COLUMN invite_code TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN apple_id TEXT`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email'`); } catch {}
// Debt management fields
try { db.exec(`ALTER TABLE loans ADD COLUMN reference_number TEXT`); } catch {}
try { db.exec(`ALTER TABLE loans ADD COLUMN creditor TEXT`); } catch {}
// Access control
try { db.exec(`ALTER TABLE users ADD COLUMN force_password_change INTEGER DEFAULT 0`); } catch {}
try { db.exec(`ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1`); } catch {}

// Generate invite codes for groups that don't have one
const groupsWithoutCode = db.prepare('SELECT id FROM groups WHERE invite_code IS NULL').all();
for (const g of groupsWithoutCode) {
  db.prepare('UPDATE groups SET invite_code = ? WHERE id = ?')
    .run(crypto.randomBytes(4).toString('hex').toUpperCase(), g.id);
}

module.exports = db;
