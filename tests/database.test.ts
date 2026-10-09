import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseManager } from '../electron/core/storage/database';
import { ProxyProfile } from '../src/types';

describe('DatabaseManager & Storage Unit Tests', () => {
  let db: DatabaseManager;

  beforeEach(async () => {
    db = DatabaseManager.getInstance();
    await db.initialize();
  });

  it('initializes database and creates default settings', () => {
    const settings = db.getSettings();
    expect(settings).toBeDefined();
    expect(settings.httpProxyPort).toBe(2080);
    expect(settings.routingMode).toBe('system-proxy');
  });

  it('can save, retrieve, and delete proxy profiles with encrypted fields', () => {
    const sampleProfile: ProxyProfile = {
      id: 'test-db-profile-1',
      name: 'آزمون سرور مخفی',
      protocol: 'vless',
      category: 'vps',
      server: '10.20.30.40',
      port: 443,
      uuid: '99887766-5544-3322-1100-aabbccddeeff',
      security: 'reality',
      sni: 'apple.com',
      publicKey: 'my_secret_reality_key',
      failureCount: 0,
      successRate: 100,
      createdAt: Date.now(),
    };

    db.saveProfile(sampleProfile);

    const allProfiles = db.getAllProfiles();
    const retrieved = allProfiles.find((p) => p.id === sampleProfile.id);

    expect(retrieved).toBeDefined();
    if (retrieved) {
      expect(retrieved.name).toBe('آزمون سرور مخفی');
      expect(retrieved.server).toBe('10.20.30.40');
      expect(retrieved.uuid).toBe('99887766-5544-3322-1100-aabbccddeeff');
      expect(retrieved.publicKey).toBe('my_secret_reality_key');
    }

    // Delete
    db.deleteProfile(sampleProfile.id);
    const afterDelete = db.getAllProfiles().find((p) => p.id === sampleProfile.id);
    expect(afterDelete).toBeUndefined();
  });

  it('records connection history and allows retrieval', () => {
    const historyId = 'hist-' + Date.now();
    db.addHistory({
      id: historyId,
      profileId: 'test-db-profile-1',
      profileName: 'سرور آزمایشی',
      protocol: 'vless',
      connectedAt: Date.now() - 60000,
      disconnectedAt: Date.now(),
      durationSeconds: 60,
      bytesUploaded: 10240,
      bytesDownloaded: 20480,
      avgPingMs: 65,
      disconnectReason: 'درخواست کاربر',
    });

    const records = db.getHistory(10);
    const added = records.find((r) => r.id === historyId);
    expect(added).toBeDefined();
    if (added) {
      expect(added.profileName).toBe('سرور آزمایشی');
      expect(added.durationSeconds).toBe(60);
      expect(added.bytesDownloaded).toBe(20480);
    }
  });
});
