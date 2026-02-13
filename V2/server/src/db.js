const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || './data/onboarding.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Compatibility wrapper around sql.js to match better-sqlite3 API
// so all route files work unchanged.
class DatabaseWrapper {
  constructor(sqlDb) {
    this._db = sqlDb;
    this._saveTimer = null;
  }

  _scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._saveToDisk();
    }, 100);
  }

  _saveToDisk() {
    const data = this._db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }

  _rowsToObjects(stmt) {
    const cols = stmt.getColumnNames();
    const results = [];
    while (stmt.step()) {
      const row = stmt.get();
      const obj = {};
      for (let i = 0; i < cols.length; i++) {
        obj[cols[i]] = row[i];
      }
      results.push(obj);
    }
    stmt.free();
    return results;
  }

  exec(sql) {
    this._db.run(sql);
    this._scheduleSave();
  }

  pragma(str) {
    try {
      this._db.run(`PRAGMA ${str}`);
    } catch {
      // Ignore pragma errors (WAL not supported in sql.js)
    }
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        let stmt;
        try {
          stmt = self._db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const row = stmt.get();
            const obj = {};
            for (let i = 0; i < cols.length; i++) {
              obj[cols[i]] = row[i];
            }
            stmt.free();
            return obj;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          if (stmt) try { stmt.free(); } catch {}
          throw e;
        }
      },

      all(...params) {
        let stmt;
        try {
          stmt = self._db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          const results = [];
          const cols = stmt.getColumnNames();
          while (stmt.step()) {
            const row = stmt.get();
            const obj = {};
            for (let i = 0; i < cols.length; i++) {
              obj[cols[i]] = row[i];
            }
            results.push(obj);
          }
          stmt.free();
          return results;
        } catch (e) {
          if (stmt) try { stmt.free(); } catch {}
          throw e;
        }
      },

      run(...params) {
        self._db.run(sql, params);
        self._scheduleSave();
        const changes = self._db.getRowsModified();
        // Get last insert rowid
        let lastInsertRowid = 0;
        try {
          const ridStmt = self._db.prepare('SELECT last_insert_rowid() as id');
          if (ridStmt.step()) {
            lastInsertRowid = ridStmt.get()[0];
          }
          ridStmt.free();
        } catch {}
        return { changes, lastInsertRowid };
      },
    };
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self._db.run('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._db.run('COMMIT');
        self._scheduleSave();
        return result;
      } catch (e) {
        self._db.run('ROLLBACK');
        throw e;
      }
    };
  }
}

// Async init - the module exports a promise that resolves to the db wrapper
let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  dbInstance = new DatabaseWrapper(sqlDb);
  dbInstance.pragma('foreign_keys = ON');

  // Run schema creation
  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS Users (
      UserID INTEGER PRIMARY KEY AUTOINCREMENT,
      Username TEXT UNIQUE NOT NULL,
      Password TEXT NOT NULL,
      FirstName TEXT NOT NULL DEFAULT '',
      LastName TEXT NOT NULL DEFAULT '',
      Email TEXT NOT NULL DEFAULT '',
      Role TEXT NOT NULL CHECK(Role IN ('admin', 'sales', 'tech')) DEFAULT 'tech',
      Department INTEGER NOT NULL DEFAULT 2,
      Spanish INTEGER NOT NULL DEFAULT 0,
      StartHour TEXT NOT NULL DEFAULT '08:00',
      EndHour TEXT NOT NULL DEFAULT '17:00',
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS Onboarding (
      ClientID TEXT PRIMARY KEY,
      ClientName TEXT NOT NULL,
      DateAdded TEXT NOT NULL DEFAULT (date('now')),
      AssignedTech INTEGER REFERENCES Users(UserID) ON DELETE SET NULL,
      SalesRep INTEGER REFERENCES Users(UserID) ON DELETE SET NULL,
      Email TEXT NOT NULL DEFAULT '',
      PhoneNumber TEXT NOT NULL DEFAULT '',
      PreviousSoftware TEXT NOT NULL DEFAULT '',
      Package TEXT NOT NULL DEFAULT 'Individual',
      ConversionNeeded INTEGER NOT NULL DEFAULT 0,
      Spanish INTEGER NOT NULL DEFAULT 0,
      BankEnrollment INTEGER NOT NULL DEFAULT 0,
      ReadyToCall INTEGER NOT NULL DEFAULT 0,
      CalledPaygo INTEGER NOT NULL DEFAULT 0,
      Progress INTEGER NOT NULL DEFAULT 0,
      UploadToken TEXT UNIQUE,
      RowColor TEXT DEFAULT NULL,
      ConfirmContactInfo INTEGER NOT NULL DEFAULT 0,
      ReviewRequirements INTEGER NOT NULL DEFAULT 0,
      ScheduleAppointment INTEGER NOT NULL DEFAULT 0,
      DownloadSoftware INTEGER NOT NULL DEFAULT 0,
      InformClient INTEGER NOT NULL DEFAULT 0,
      StartInstallation INTEGER NOT NULL DEFAULT 0,
      EnterUserID INTEGER NOT NULL DEFAULT 0,
      ConfigureSettings INTEGER NOT NULL DEFAULT 0,
      ManageUserAccounts INTEGER NOT NULL DEFAULT 0,
      RunSoftware INTEGER NOT NULL DEFAULT 0,
      ProvideWalkthrough INTEGER NOT NULL DEFAULT 0,
      DemonstrateTasks INTEGER NOT NULL DEFAULT 0,
      VerifyPlanData INTEGER NOT NULL DEFAULT 0,
      ExecuteConversion INTEGER NOT NULL DEFAULT 0,
      VerifyIntegrity INTEGER NOT NULL DEFAULT 0,
      TransferSetupData INTEGER NOT NULL DEFAULT 0,
      ContactSupport INTEGER NOT NULL DEFAULT 0,
      OfferResources INTEGER NOT NULL DEFAULT 0,
      ProvideTrainingInfo INTEGER NOT NULL DEFAULT 0,
      ScheduleFollowUp INTEGER NOT NULL DEFAULT 0,
      InstalledNewVersion INTEGER NOT NULL DEFAULT 0,
      CompleteBankEnrollment INTEGER NOT NULL DEFAULT 0,
      Completed INTEGER NOT NULL DEFAULT 0,
      CompletedUntilNewVersion INTEGER NOT NULL DEFAULT 0,
      Stalled INTEGER NOT NULL DEFAULT 0,
      Cancelled INTEGER NOT NULL DEFAULT 0,
      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS OnboardingDetails (
      DetailID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL REFERENCES Onboarding(ClientID) ON DELETE CASCADE,
      FirstCallout TEXT DEFAULT NULL,
      FollowUpCalls TEXT DEFAULT NULL,
      Notes TEXT DEFAULT NULL
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS OnboardingHistory (
      HistoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL,
      ActionType TEXT NOT NULL,
      ActionDetails TEXT NOT NULL DEFAULT '',
      EditedBy INTEGER REFERENCES Users(UserID) ON DELETE SET NULL,
      DateEdited TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS EntitledPrograms (
      ClientID TEXT PRIMARY KEY REFERENCES Onboarding(ClientID) ON DELETE CASCADE,
      prog_1040 INTEGER NOT NULL DEFAULT 0,
      prog_Depreciation INTEGER NOT NULL DEFAULT 0,
      prog_Proforma INTEGER NOT NULL DEFAULT 0,
      prog_1120 INTEGER NOT NULL DEFAULT 0,
      prog_1120S INTEGER NOT NULL DEFAULT 0,
      prog_1065 INTEGER NOT NULL DEFAULT 0,
      prog_1041 INTEGER NOT NULL DEFAULT 0,
      prog_706Estate INTEGER NOT NULL DEFAULT 0,
      prog_709Gift INTEGER NOT NULL DEFAULT 0,
      prog_990Exempt INTEGER NOT NULL DEFAULT 0,
      prog_DocArk INTEGER NOT NULL DEFAULT 0,
      prog_1099Acc INTEGER NOT NULL DEFAULT 0
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS CustomPackages (
      PackageID INTEGER PRIMARY KEY AUTOINCREMENT,
      PackageName TEXT NOT NULL UNIQUE,
      Programs TEXT NOT NULL DEFAULT '[]'
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS AdminSettings (
      SettingName TEXT PRIMARY KEY,
      SettingValue TEXT NOT NULL DEFAULT '',
      UserID INTEGER REFERENCES Users(UserID) ON DELETE SET NULL,
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS Notifications (
      NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL,
      TechID INTEGER REFERENCES Users(UserID) ON DELETE CASCADE,
      Message TEXT NOT NULL DEFAULT '',
      Date TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  dbInstance._db.run(`
    CREATE TABLE IF NOT EXISTS LastAssignedTech (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID INTEGER NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE
    )
  `);

  // Seed default admin user if none exist
  const userCount = dbInstance.prepare('SELECT COUNT(*) as count FROM Users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    dbInstance.prepare(
      'INSERT INTO Users (Username, Password, FirstName, LastName, Email, Role, Department) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run('admin', hash, 'System', 'Admin', 'admin@taxware.com', 'admin', 1);
    console.log('Default admin user created (username: admin, password: admin)');
  }

  // Seed default settings if none exist
  const settingsCount = dbInstance.prepare('SELECT COUNT(*) as count FROM AdminSettings').get();
  if (settingsCount.count === 0) {
    dbInstance.prepare('INSERT INTO AdminSettings (SettingName, SettingValue) VALUES (?, ?)').run('NewSoftwareRelease', '0');
    dbInstance.prepare('INSERT INTO AdminSettings (SettingName, SettingValue) VALUES (?, ?)').run('DefaultReadyToCall', '0');
    dbInstance.prepare('INSERT INTO AdminSettings (SettingName, SettingValue) VALUES (?, ?)').run('MaxUploadSizeGB', '15');
  }

  // Migrations: add columns that may not exist in older databases
  try { dbInstance._db.run('ALTER TABLE Onboarding ADD COLUMN CalledPaygo INTEGER NOT NULL DEFAULT 0'); } catch {}
  try { dbInstance.prepare("INSERT OR IGNORE INTO AdminSettings (SettingName, SettingValue) VALUES ('MaxUploadSizeGB', '15')").run(); } catch {}

  dbInstance._saveToDisk();
  console.log('Database initialized at', dbPath);

  return dbInstance;
}

module.exports = { getDb };
