import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels';
import {
  DiagnosisResult,
  ProxyProfile,
  ActiveConnection,
  AppSettings,
  LiveEvent,
  ExperimentalTransportStats,
} from '../src/types';

export interface RahgozarApi {
  runDiagnosis: () => Promise<DiagnosisResult>;
  connect: (profileId?: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  getConnectionState: () => Promise<ActiveConnection>;

  getProfiles: () => Promise<ProxyProfile[]>;
  addProfile: (profile: ProxyProfile) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<boolean>;
  parseConfig: (input: string) => Promise<{ success: boolean; profile?: ProxyProfile; error?: string }>;
  exportConfigUri: (profile: ProxyProfile) => Promise<string>;

  getHistory: () => Promise<any[]>;
  getSettings: () => Promise<AppSettings>;
  saveSetting: (key: string, value: any) => Promise<boolean>;
  getEvents: () => Promise<LiveEvent[]>;

  getExperimentalStats: () => Promise<ExperimentalTransportStats>;
  getProtocolMatrix: () => Promise<any[]>;

  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  onEvent: (callback: (event: LiveEvent) => void) => () => void;
  onStateChange: (callback: (state: ActiveConnection) => void) => () => void;
}

const api: RahgozarApi = {
  runDiagnosis: () => ipcRenderer.invoke(IPC_CHANNELS.RUN_DIAGNOSIS),
  connect: (profileId?: string) => ipcRenderer.invoke(IPC_CHANNELS.CONNECT, profileId),
  disconnect: () => ipcRenderer.invoke(IPC_CHANNELS.DISCONNECT),
  getConnectionState: () => ipcRenderer.invoke(IPC_CHANNELS.GET_CONNECTION_STATE),

  getProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILES),
  addProfile: (profile: ProxyProfile) => ipcRenderer.invoke(IPC_CHANNELS.ADD_PROFILE, profile),
  deleteProfile: (profileId: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PROFILE, profileId),
  parseConfig: (input: string) => ipcRenderer.invoke(IPC_CHANNELS.PARSE_CONFIG, input),
  exportConfigUri: (profile: ProxyProfile) => ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CONFIG_URI, profile),

  getHistory: () => ipcRenderer.invoke(IPC_CHANNELS.GET_HISTORY),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSetting: (key: string, value: any) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTING, key, value),
  getEvents: () => ipcRenderer.invoke(IPC_CHANNELS.GET_EVENTS),

  getExperimentalStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_EXPERIMENTAL_STATS),
  getProtocolMatrix: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROTOCOL_MATRIX),

  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),

  onEvent: (callback: (event: LiveEvent) => void) => {
    const subscription = (_e: any, value: LiveEvent) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.EVENT_PUSH, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENT_PUSH, subscription);
  },

  onStateChange: (callback: (state: ActiveConnection) => void) => {
    const subscription = (_e: any, value: ActiveConnection) => callback(value);
    ipcRenderer.on(IPC_CHANNELS.STATE_PUSH, subscription);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STATE_PUSH, subscription);
  },
};

contextBridge.exposeInMainWorld('rahgozarApi', api);
