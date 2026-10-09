import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { DatabaseManager } from '../core/storage/database';
import { AdaptiveDiagnosisEngine } from '../core/diagnosis/engine';
import { AdaptiveTransportSelector } from '../core/routing/selector';
import { ConfigParser } from '../core/engines/config-parser';
import { ExperimentalTransportEvaluator } from '../core/experimental/transport-eval';
import { EventBus } from '../core/events/event-bus';
import { ProxyProfile } from '../types';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  const db = DatabaseManager.getInstance();
  const diagnosisEngine = AdaptiveDiagnosisEngine.getInstance();
  const transportSelector = AdaptiveTransportSelector.getInstance();
  const eventBus = EventBus.getInstance();

  // Forward events to renderer
  eventBus.on('app-event', (event) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.EVENT_PUSH, event);
    }
  });

  eventBus.on('connection-state-changed', (state) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.STATE_PUSH, state);
    }
  });

  // Diagnosis
  ipcMain.handle(IPC_CHANNELS.RUN_DIAGNOSIS, async () => {
    return await diagnosisEngine.runFullDiagnosis();
  });

  // Connection
  ipcMain.handle(IPC_CHANNELS.CONNECT, async (_e, profileId?: string) => {
    return await transportSelector.smartConnect(profileId);
  });

  ipcMain.handle(IPC_CHANNELS.DISCONNECT, async () => {
    await transportSelector.disconnect(true);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_CONNECTION_STATE, async () => {
    return transportSelector.getConnectionState();
  });

  // Profiles
  ipcMain.handle(IPC_CHANNELS.GET_PROFILES, async () => {
    return db.getAllProfiles();
  });

  ipcMain.handle(IPC_CHANNELS.ADD_PROFILE, async (_e, profile: ProxyProfile) => {
    db.saveProfile(profile);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_PROFILE, async (_e, profileId: string) => {
    db.deleteProfile(profileId);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.PARSE_CONFIG, async (_e, input: string) => {
    return ConfigParser.parse(input);
  });

  ipcMain.handle(IPC_CHANNELS.EXPORT_CONFIG_URI, async (_e, profile: ProxyProfile) => {
    return ConfigParser.toUri(profile);
  });

  // Storage & History
  ipcMain.handle(IPC_CHANNELS.GET_HISTORY, async () => {
    return db.getHistory();
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return db.getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_SETTING, async (_e, key: string, value: any) => {
    db.saveSetting(key, value);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.GET_EVENTS, async () => {
    return db.getEvents();
  });

  // Experimental & Specs
  ipcMain.handle(IPC_CHANNELS.GET_EXPERIMENTAL_STATS, async () => {
    return ExperimentalTransportEvaluator.getExperimentalStats();
  });

  ipcMain.handle(IPC_CHANNELS.GET_PROTOCOL_MATRIX, async () => {
    return ExperimentalTransportEvaluator.getProtocolsMatrix();
  });

  // Window Controls
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow.close();
  });
}
