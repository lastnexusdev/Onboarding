import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

export async function initDb() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      UserID INTEGER PRIMARY KEY AUTOINCREMENT,
      Username TEXT UNIQUE NOT NULL,
      Password TEXT NOT NULL,
      FirstName TEXT NOT NULL,
      LastName TEXT NOT NULL,
      Email TEXT,
      Role TEXT NOT NULL CHECK(Role IN ('admin', 'sales', 'tech')),
      Department INTEGER NOT NULL,
      Spanish INTEGER DEFAULT 0,
      StartHour TEXT DEFAULT '08:00',
      EndHour TEXT DEFAULT '17:00'
    );

    CREATE TABLE IF NOT EXISTS Onboarding (
      ClientID TEXT PRIMARY KEY,
      DateAdded TEXT,
      ClientName TEXT NOT NULL,
      AssignedTech INTEGER,
      SalesRep INTEGER,
      Email TEXT,
      PhoneNumber TEXT,
      PreviousSoftware TEXT,
      ConvertionNeeded TEXT DEFAULT 'No',
      Spanish TEXT DEFAULT 'No',
      BankEnrollment TEXT DEFAULT 'No',
      Package TEXT,
      ReadyToCall INTEGER DEFAULT 0,
      UploadToken TEXT,
      Progress REAL DEFAULT 0,
      Completed INTEGER DEFAULT 0,
      CompletedUntilNewVersion INTEGER DEFAULT 0,
      Cancelled INTEGER DEFAULT 0,
      Stalled INTEGER DEFAULT 0,
      RowColor TEXT,
      ConfirmContactInfo INTEGER DEFAULT 0,
      ReviewRequirements INTEGER DEFAULT 0,
      ScheduleAppointment INTEGER DEFAULT 0,
      DownloadSoftware INTEGER DEFAULT 0,
      InformClient INTEGER DEFAULT 0,
      StartInstallation INTEGER DEFAULT 0,
      EnterUserID INTEGER DEFAULT 0,
      ConfigureSettings INTEGER DEFAULT 0,
      ManageUserAccounts INTEGER DEFAULT 0,
      RunSoftware INTEGER DEFAULT 0,
      ProvideWalkthrough INTEGER DEFAULT 0,
      DemonstrateTasks INTEGER DEFAULT 0,
      ContactSupport INTEGER DEFAULT 0,
      OfferResources INTEGER DEFAULT 0,
      ProvideTrainingInfo INTEGER DEFAULT 0,
      ScheduleFollowUp INTEGER DEFAULT 0,
      VerifyPlanData INTEGER DEFAULT 0,
      ExecuteConversion INTEGER DEFAULT 0,
      VerifyIntegrity INTEGER DEFAULT 0,
      TransferSetupData INTEGER DEFAULT 0,
      CompleteBankEnrollment INTEGER DEFAULT 0,
      InstalledNewVersion INTEGER DEFAULT 0,
      FOREIGN KEY (AssignedTech) REFERENCES Users(UserID),
      FOREIGN KEY (SalesRep) REFERENCES Users(UserID)
    );

    CREATE TABLE IF NOT EXISTS OnboardingDetails (
      DetailID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT UNIQUE,
      FirstCallout TEXT,
      FollowUpCalls TEXT,
      Notes TEXT,
      FOREIGN KEY (ClientID) REFERENCES Onboarding(ClientID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS OnboardingHistory (
      HistoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL,
      ActionType TEXT NOT NULL,
      ActionDetails TEXT,
      EditedBy TEXT,
      CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ClientID) REFERENCES Onboarding(ClientID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Notification (
      NotificationID INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT NOT NULL,
      TechID INTEGER,
      Message TEXT,
      Date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ClientID) REFERENCES Onboarding(ClientID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS EntitledPrograms (
      ClientID TEXT PRIMARY KEY,
      prog_1040 INTEGER DEFAULT 0,
      prog_Depreciation INTEGER DEFAULT 0,
      prog_Proforma INTEGER DEFAULT 0,
      prog_1120 INTEGER DEFAULT 0,
      prog_1120S INTEGER DEFAULT 0,
      prog_1065 INTEGER DEFAULT 0,
      prog_1041 INTEGER DEFAULT 0,
      prog_706Estate INTEGER DEFAULT 0,
      prog_709Gift INTEGER DEFAULT 0,
      prog_990Exempt INTEGER DEFAULT 0,
      prog_DocArk INTEGER DEFAULT 0,
      prog_1099Acc INTEGER DEFAULT 0,
      FOREIGN KEY (ClientID) REFERENCES Onboarding(ClientID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS CustomPackages (
      PackageID INTEGER PRIMARY KEY AUTOINCREMENT,
      PackageName TEXT UNIQUE NOT NULL,
      PackageDescription TEXT,
      Programs TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      Setting_Name TEXT PRIMARY KEY,
      Setting_Value TEXT,
      UserID INTEGER
    );

    CREATE TABLE IF NOT EXISTS LastAssignedTech (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS UploadedFiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ClientID TEXT,
      OriginalName TEXT,
      StoredPath TEXT,
      UploadedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ClientID) REFERENCES Onboarding(ClientID) ON DELETE CASCADE
    );
  `);

  const admin = await db.get('SELECT UserID FROM Users WHERE Username = ?', 'admin');
  if (!admin) {
    const hash = await bcrypt.hash('admin123!', 10);
    await db.run(
      `INSERT INTO Users (Username, Password, FirstName, LastName, Email, Role, Department)
       VALUES (?, ?, ?, ?, ?, 'admin', 0)`,
      'admin', hash, 'System', 'Admin', 'admin@local'
    );
  }

  const defaults = [
    ['NewSoftwareRelease', '0'],
    ['DefaultReadyToCall', '1'],
  ];
  for (const [name, val] of defaults) {
    await db.run(
      'INSERT OR IGNORE INTO admin_settings (Setting_Name, Setting_Value, UserID) VALUES (?, ?, 1)',
      name,
      val
    );
  }
}
