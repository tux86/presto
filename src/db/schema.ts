/**
 * Schema migrations, applied in order and tracked by SQLite's `user_version`.
 *
 * Append to this array; never edit an entry that has shipped. Each entry runs
 * inside a transaction, so a failing migration leaves the file untouched.
 */
export const MIGRATIONS: string[] = [
  /* 1 */ `
    CREATE TABLE company (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      address     TEXT,
      businessId  TEXT,
      isDefault   INTEGER NOT NULL DEFAULT 0,
      createdAt   TEXT NOT NULL
    );

    CREATE TABLE client (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      email           TEXT,
      phone           TEXT,
      address         TEXT,
      businessId      TEXT,
      color           TEXT,
      currency        TEXT NOT NULL,
      holidayCountry  TEXT NOT NULL,
      createdAt       TEXT NOT NULL
    );

    CREATE TABLE mission (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      clientId   TEXT NOT NULL REFERENCES client(id)  ON DELETE RESTRICT,
      companyId  TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
      dailyRate  REAL,
      startDate  TEXT,
      endDate    TEXT,
      isActive   INTEGER NOT NULL DEFAULT 1,
      createdAt  TEXT NOT NULL
    );

    CREATE INDEX mission_clientId  ON mission(clientId);
    CREATE INDEX mission_companyId ON mission(companyId);

    -- days and dayNotes are sparse JSON maps keyed by day-of-month. Nothing
    -- queries across individual days, so a column beats 31 rows per report.
    CREATE TABLE report (
      id              TEXT PRIMARY KEY,
      missionId       TEXT NOT NULL REFERENCES mission(id) ON DELETE RESTRICT,
      year            INTEGER NOT NULL,
      month           INTEGER NOT NULL,
      status          TEXT NOT NULL DEFAULT 'draft',
      dailyRate       REAL,
      holidayCountry  TEXT NOT NULL,
      days            TEXT NOT NULL DEFAULT '{}',
      dayNotes        TEXT NOT NULL DEFAULT '{}',
      note            TEXT,
      privateNote     TEXT,
      createdAt       TEXT NOT NULL,
      updatedAt       TEXT NOT NULL,
      UNIQUE (missionId, year, month)
    );

    CREATE INDEX report_year_month ON report(year, month);
  `,
];
