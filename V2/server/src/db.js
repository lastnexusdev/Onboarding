const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || './data/onboarding.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initialize() {
  db.exec(`
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
    );

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
      Progress INTEGER NOT NULL DEFAULT 0,
      UploadToken TEXT UNIQUE,
      RowColor TEXT DEFAULT NULL,

      -- Checklist: Pre-Installation
      ConfirmContactInfo INTEGER NOT NULL DEFAULT 0,
      ReviewRequirements INTEGER NOT NULL DEFAULT 0,
      ScheduleAppointment INTEGER NOT NULL DEFAULT 0,

      -- Checklist: Download
      DownloadSoftware INTEGER NOT NULL DEFAULT 0,
      InformClient INTEGER NOT NULL DEFAULT 0,
      StartInstallation INTEGER NOT NULL DEFAULT 0,

      -- Checklist: Setup
      EnterUserID INTEGER NOT NULL DEFAULT 0,
      ConfigureSettings INTEGER NOT NULL DEFAULT 0,
      ManageUserAccounts INTEGER NOT NULL DEFAULT 0,

      -- Checklist: Testing
      RunSoftware INTEGER NOT NULL DEFAULT 0,
      ProvideWalkthrough INTEGER NOT NULL DEFAULT 0,
      DemonstrateTasks INTEGER NOT NULL DEFAULT 0,

      -- Checklist: Data Conversion
      VerifyPlanData INTEGER NOT NULL DEFAULT 0,
      ExecuteConversion INTEGER NOT NULL DEFAULT 0,
      VerifyIntegrity INTEGER NOT NULL DEFAULT 0,
      TransferSetupData INTEGER NOT NULL DEFAULT 0,

      -- Checklist: Final Steps
      ContactSupport INTEGER NOT NULL DEFAULT 0,
      OfferResources INTEGER NOT NULL DEFAULT 0,
      ProvideTrainingInfo INTEGER NOT NULL DEFAULT 0,
      ScheduleFollowUp INTEGER NOT NULL DEFAULT 0,

      -- Conditional Checklist
      InstalledNewVersion INTEGER NOT NULL DEFAULT 0,
      CompleteBankEnrollment INTEGER NOT NULL DEFAULT 0,

      -- Status Flags
      Completed INTEGER NOT NULL DEFAULT 0,
      CompletedUntilNewVersion INTEGER NOT NULL DEFAULT 0,
      Stalled INTEGER NOT NULL DEFAULT 0,
      Cancelled INTEGER NOT NULL DEFAULT 0,

      CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS OnboardingDetails (
      DetailID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL REFERENCES Onboarding(ClientID) ON DELETE CASCADE,
      FirstCallout TEXT DEFAULT NULL,
      FollowUpCalls TEXT DEFAULT NULL,
      Notes TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS OnboardingHistory (
      HistoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL,
      ActionType TEXT NOT NULL,
      ActionDetails TEXT NOT NULL DEFAULT '',
      EditedBy INTEGER REFERENCES Users(UserID) ON DELETE SET NULL,
      DateEdited TEXT NOT NULL DEFAULT (datetime('now'))
    );

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
    );

    CREATE TABLE IF NOT EXISTS CustomPackages (
      PackageID INTEGER PRIMARY KEY AUTOINCREMENT,
      PackageName TEXT NOT NULL UNIQUE,
      Programs TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS AdminSettings (
      SettingName TEXT PRIMARY KEY,
      SettingValue TEXT NOT NULL DEFAULT '',
      UserID INTEGER REFERENCES Users(UserID) ON DELETE SET NULL,
      UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Notifications (
      NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL,
      TechID INTEGER REFERENCES Users(UserID) ON DELETE CASCADE,
      Message TEXT NOT NULL DEFAULT '',
      Date TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS LastAssignedTech (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID INTEGER NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE
    );
  `);

  // Seed default admin user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get();
  if (userCount.count === 0) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare(`
      INSERT INTO Users (Username, Password, FirstName, LastName, Email, Role, Department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin', hash, 'System', 'Admin', 'admin@taxware.com', 'admin', 1);
    console.log('Default admin user created (username: admin, password: admin)');
  }

  // Seed default settings if none exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM AdminSettings').get();
  if (settingsCount.count === 0) {
    db.prepare(`INSERT INTO AdminSettings (SettingName, SettingValue) VALUES (?, ?)`).run('NewSoftwareRelease', '0');
    db.prepare(`INSERT INTO AdminSettings (SettingName, SettingValue) VALUES (?, ?)`).run('DefaultReadyToCall', '0');
  }
}

initialize();

module.exports = db;
