import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProxyProfile, AppSettings, LiveEvent } from '../../types';
import { CredentialVault } from '../security/credential-vault';

export interface ConnectionHistoryRecord {
  id: string;
  profileId: string | null;
  profileName: string | null;
  protocol: string | null;
  connectedAt: number;
  disconnectedAt: number;
  durationSeconds: number;
  bytesUploaded: number;
  bytesDownloaded: number;
  avgPingMs: number;
  disconnectReason: string;
}

/**
 * Safe SQLite Database Manager
 * Uses WebAssembly SQLite (sql.js) with atomic disk syncing, automated schema migrations,
 * corruption detection, and automatic backup restoration.
 */
export class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private backupPath: string;
  private isInitialized = false;

  private constructor() {
    const dataDir = path.join(os.homedir(), '.rahgozar');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'rahgozar.db');
    this.backupPath = path.join(dataDir, 'rahgozar.db.bak');
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized && this.db) return;

    const SQL = await initSqlJs();
    let loadedFromDisk = false;

    // 1. Try to load existing primary db file
    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
        // Verify integrity
        this.db.exec('PRAGMA schema_version;');
        loadedFromDisk = true;
      } catch (err) {
        console.error('Primary database corrupted. Attempting backup restore...', err);
        if (fs.existsSync(this.backupPath)) {
          try {
            const backupBuffer = fs.readFileSync(this.backupPath);
            this.db = new SQL.Database(backupBuffer);
            loadedFromDisk = true;
          } catch (bakErr) {
            console.error('Backup also corrupted, creating fresh database...', bakErr);
          }
        }
      }
    }

    if (!loadedFromDisk || !this.db) {
      this.db = new SQL.Database();
    }

    // 2. Run migrations
    this.runMigrations();

    // 3. Save initial snapshot
    this.persistToDisk();
    this.isInitialized = true;
  }

  /**
   * Versioned database migrations
   */
  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      );
    `);

    const result = this.db.exec('SELECT MAX(version) as current_version FROM schema_migrations;');
    let currentVersion = 0;
    if (result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] !== null) {
      currentVersion = Number(result[0].values[0][0]);
    }

    // Migration 1: Base Tables
    if (currentVersion < 1) {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          protocol TEXT NOT NULL,
          category TEXT NOT NULL,
          server TEXT NOT NULL,
          port INTEGER NOT NULL,
          encrypted_payload TEXT NOT NULL,
          is_builtin INTEGER DEFAULT 0,
          ping_ms INTEGER DEFAULT -1,
          last_tested INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          success_rate REAL DEFAULT 100.0,
          raw_uri TEXT,
          created_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS connection_history (
          id TEXT PRIMARY KEY,
          profile_id TEXT,
          profile_name TEXT,
          protocol TEXT,
          connected_at INTEGER NOT NULL,
          disconnected_at INTEGER NOT NULL,
          duration_seconds INTEGER NOT NULL,
          bytes_uploaded INTEGER NOT NULL,
          bytes_downloaded INTEGER NOT NULL,
          avg_ping_ms INTEGER NOT NULL,
          disconnect_reason TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS events_log (
          id TEXT PRIMARY KEY,
          timestamp INTEGER NOT NULL,
          level TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          explanation_simple TEXT,
          explanation_detailed TEXT,
          explanation_expert TEXT,
          action_taken TEXT,
          user_remedy TEXT
        );

        INSERT INTO schema_migrations (version, applied_at) VALUES (1, ${Date.now()});
      `);
      currentVersion = 1;
    }
  }

  /**
   * Atomically flushes in-memory SQLite database to disk with backup copy
   */
  public persistToDisk(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tmpPath = `${this.dbPath}.tmp`;

      // 1. Write to tmp file
      fs.writeFileSync(tmpPath, buffer);

      // 2. Backup current db if exists
      if (fs.existsSync(this.dbPath)) {
        try {
          fs.copyFileSync(this.dbPath, this.backupPath);
        } catch {
          // Ignore copy failures
        }
      }

      // 3. Atomic rename
      fs.renameSync(tmpPath, this.dbPath);
    } catch (err) {
      console.error('Failed to persist SQLite database to disk:', err);
    }
  }

  // --- Profiles Repository ---

  public getAllProfiles(): ProxyProfile[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY created_at DESC;');
    const profiles: ProxyProfile[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, any>;
      try {
        const decryptedPayload = JSON.parse(CredentialVault.decrypt(row.encrypted_payload));
        profiles.push({
          id: row.id,
          name: row.name,
          protocol: row.protocol,
          category: row.category,
          server: row.server,
          port: row.port,
          isBuiltin: Boolean(row.is_builtin),
          pingMs: row.ping_ms,
          lastTested: row.last_tested,
          failureCount: row.failure_count,
          successRate: row.success_rate,
          rawUri: row.raw_uri,
          createdAt: row.created_at,
          ...decryptedPayload,
        });
      } catch (err) {
        console.error('Error decrypting profile payload:', row.id, err);
      }
    }
    stmt.free();
    return profiles;
  }

  public saveProfile(profile: ProxyProfile): void {
    if (!this.db) return;
    const { id, name, protocol, category, server, port, isBuiltin, pingMs, lastTested, failureCount, successRate, rawUri, createdAt, ...sensitiveFields } = profile;

    const encryptedPayload = CredentialVault.encrypt(JSON.stringify(sensitiveFields));

    this.db.run(
      `INSERT OR REPLACE INTO profiles 
       (id, name, protocol, category, server, port, encrypted_payload, is_builtin, ping_ms, last_tested, failure_count, success_rate, raw_uri, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        protocol,
        category,
        server,
        port,
        encryptedPayload,
        isBuiltin ? 1 : 0,
        pingMs || -1,
        lastTested || 0,
        failureCount || 0,
        successRate || 100.0,
        rawUri || '',
        createdAt || Date.now(),
      ]
    );
    this.persistToDisk();
  }

  public updateProfileStats(id: string, pingMs: number, success: boolean): void {
    if (!this.db) return;
    const profile = this.getAllProfiles().find(p => p.id === id);
    if (!profile) return;

    const newFailureCount = success ? 0 : (profile.failureCount + 1);
    const newSuccessRate = success
      ? Math.min(100, profile.successRate * 0.9 + 10)
      : Math.max(0, profile.successRate * 0.9);

    this.db.run(
      `UPDATE profiles SET ping_ms = ?, last_tested = ?, failure_count = ?, success_rate = ? WHERE id = ?`,
      [pingMs, Date.now(), newFailureCount, Number(newSuccessRate.toFixed(1)), id]
    );
    this.persistToDisk();
  }

  public deleteProfile(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM profiles WHERE id = ?', [id]);
    this.persistToDisk();
  }

  // --- Connection History Repository ---

  public addHistory(record: ConnectionHistoryRecord): void {
    if (!this.db) return;
    this.db.run(
      `INSERT INTO connection_history 
       (id, profile_id, profile_name, protocol, connected_at, disconnected_at, duration_seconds, bytes_uploaded, bytes_downloaded, avg_ping_ms, disconnect_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.profileId,
        record.profileName,
        record.protocol,
        record.connectedAt,
        record.disconnectedAt,
        record.durationSeconds,
        record.bytesUploaded,
        record.bytesDownloaded,
        record.avgPingMs,
        record.disconnectReason,
      ]
    );
    this.persistToDisk();
  }

  public getHistory(limit = 50): ConnectionHistoryRecord[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM connection_history ORDER BY connected_at DESC LIMIT ?;');
    stmt.bind([limit]);
    const history: ConnectionHistoryRecord[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, any>;
      history.push({
        id: row.id,
        profileId: row.profile_id,
        profileName: row.profile_name,
        protocol: row.protocol,
        connectedAt: row.connected_at,
        disconnectedAt: row.disconnected_at,
        durationSeconds: row.duration_seconds,
        bytesUploaded: row.bytes_uploaded,
        bytesDownloaded: row.bytes_downloaded,
        avgPingMs: row.avg_ping_ms,
        disconnectReason: row.disconnect_reason,
      });
    }
    stmt.free();
    return history;
  }

  // --- Settings Repository ---

  public getSettings(): AppSettings {
    const defaultSettings: AppSettings = {
      routingMode: 'system-proxy',
      autoSelectBest: true,
      autoDiagnosisOnConnect: true,
      healthCheckIntervalSeconds: 20,
      httpProxyPort: 2080,
      socksProxyPort: 2081,
      enableDnsHijack: true,
      upstreamDns: 'https://1.1.1.1/dns-query',
      theme: 'dark',
      language: 'fa',
      killSwitch: false,
      minimizeToTray: true,
      startWithWindows: false,
    };

    if (!this.db) return defaultSettings;

    try {
      const stmt = this.db.prepare('SELECT key, value FROM settings;');
      const custom: Record<string, any> = {};
      while (stmt.step()) {
        const row = stmt.getAsObject() as { key: string; value: string };
        try {
          custom[row.key] = JSON.parse(row.value);
        } catch {
          custom[row.key] = row.value;
        }
      }
      stmt.free();
      return { ...defaultSettings, ...custom };
    } catch {
      return defaultSettings;
    }
  }

  public saveSetting(key: string, value: any): void {
    if (!this.db) return;
    this.db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);',
      [key, JSON.stringify(value)]
    );
    this.persistToDisk();
  }

  // --- Live Events Log Repository ---

  public addEvent(event: LiveEvent): void {
    if (!this.db) return;
    this.db.run(
      `INSERT INTO events_log 
       (id, timestamp, level, category, title, explanation_simple, explanation_detailed, explanation_expert, action_taken, user_remedy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.timestamp,
        event.level,
        event.category,
        event.title,
        event.explanationSimple,
        event.explanationDetailed,
        event.explanationExpert,
        event.actionTaken || '',
        event.userRemedy || '',
      ]
    );
    this.persistToDisk();
  }

  public getEvents(limit = 100): LiveEvent[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM events_log ORDER BY timestamp DESC LIMIT ?;');
    stmt.bind([limit]);
    const events: LiveEvent[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as Record<string, any>;
      events.push({
        id: row.id,
        timestamp: row.timestamp,
        level: row.level,
        category: row.category,
        title: row.title,
        explanationSimple: row.explanation_simple,
        explanationDetailed: row.explanation_detailed,
        explanationExpert: row.explanation_expert,
        actionTaken: row.action_taken,
        userRemedy: row.user_remedy,
      });
    }
    stmt.free();
    return events;
  }
}
