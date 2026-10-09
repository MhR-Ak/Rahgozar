export const IPC_CHANNELS = {
  // Diagnosis
  RUN_DIAGNOSIS: 'diagnosis:run',

  // Connection & Routing
  CONNECT: 'connection:connect',
  DISCONNECT: 'connection:disconnect',
  GET_CONNECTION_STATE: 'connection:get-state',

  // Profiles
  GET_PROFILES: 'profiles:get-all',
  ADD_PROFILE: 'profiles:add',
  DELETE_PROFILE: 'profiles:delete',
  PARSE_CONFIG: 'profiles:parse',
  EXPORT_CONFIG_URI: 'profiles:export-uri',

  // Storage & History
  GET_HISTORY: 'storage:get-history',
  GET_SETTINGS: 'storage:get-settings',
  SAVE_SETTING: 'storage:save-setting',
  GET_EVENTS: 'storage:get-events',

  // Experimental & Specs
  GET_EXPERIMENTAL_STATS: 'experimental:get-stats',
  GET_PROTOCOL_MATRIX: 'experimental:get-matrix',

  // Window Controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Streams / Push Notifications
  EVENT_PUSH: 'stream:event',
  STATE_PUSH: 'stream:state',
} as const;
