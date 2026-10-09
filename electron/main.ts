import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { DatabaseManager } from './core/storage/database';
import { WindowsProxyManager } from './core/proxy/windows-proxy';
import { registerIpcHandlers } from './ipc/handlers';
import { ProxyProfile } from '../src/types';

// Disable hardware acceleration issues on specific VMs if needed
// app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    frame: false, // Custom frameless title bar
    title: 'رهگذر - دسترسی آزاد و هوشمند به اینترنت',
    backgroundColor: '#080b12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Strict Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' data: https://cdn.jsdelivr.net; img-src 'self' data: https:; connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:* https:;"
        ],
      },
    });
  });

  // Register IPC handlers
  registerIpcHandlers(mainWindow);

  // Load URL
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // 1. Initialize SQLite Database
    const db = DatabaseManager.getInstance();
    await db.initialize();

    // 2. Seed initial vetted profiles if empty
    seedInitialProfiles(db);

    // 3. Create main window
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

// Cleanup on quit
app.on('before-quit', () => {
  try {
    WindowsProxyManager.getInstance().restoreOriginalProxySync();
  } catch (err) {
    console.error('Error during shutdown proxy restoration:', err);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function seedInitialProfiles(db: DatabaseManager) {
  const existing = db.getAllProfiles();
  if (existing.length === 0) {
    const defaultProfiles: ProxyProfile[] = [
      {
        id: 'builtin-tor-snowflake',
        name: 'پل تور Snowflake (بدون VPS - جهانی)',
        protocol: 'tor',
        category: 'no-vps',
        server: '127.0.0.1',
        port: 9050,
        torBridgeType: 'snowflake',
        torBridgeString: 'bridge snowflake 192.0.2.3:1 2B280B23E1107BB62B72614776F1E274DD9C0A0C',
        isBuiltin: true,
        failureCount: 0,
        successRate: 98,
        createdAt: Date.now(),
      },
      {
        id: 'builtin-vless-reality-template',
        name: 'سرور اختصاصی VLESS Reality (پیش‌فرض)',
        protocol: 'vless',
        category: 'vps',
        server: 'de.gateway.example.com',
        port: 443,
        uuid: 'a68ef30f-2f83-4a57-b08e-8a16dbd78fa1',
        security: 'reality',
        sni: 'www.microsoft.com',
        publicKey: '6XzM_o52q2Yj_aXpU1Z_Y68E8F30F2F834A57B08E8A',
        shortId: '6ba85b54',
        fingerprint: 'chrome',
        transport: 'tcp',
        isBuiltin: true,
        failureCount: 0,
        successRate: 95,
        createdAt: Date.now() - 1000,
      },
      {
        id: 'builtin-hysteria2-template',
        name: 'سرور پرسرعت Hysteria 2 (UDP Brutal)',
        protocol: 'hysteria2',
        category: 'vps',
        server: 'nl.fastroute.example.com',
        port: 8443,
        password: 'sample_secure_hysteria_pass',
        security: 'tls',
        sni: 'nl.fastroute.example.com',
        transport: 'quic',
        isBuiltin: true,
        failureCount: 0,
        successRate: 92,
        createdAt: Date.now() - 2000,
      }
    ];

    for (const p of defaultProfiles) {
      db.saveProfile(p);
    }
  }
}
