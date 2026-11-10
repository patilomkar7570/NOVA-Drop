import os from 'os';
import path from 'path';
import { ServerSettings } from './types/index.js';
import { getLocalIpAddress } from './utils/network.js';

export const LOCAL_IP = getLocalIpAddress();

export const CONFIG: ServerSettings & { localIp: string } = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || (process.env.NODE_ENV === 'test' ? '127.0.0.1' : '0.0.0.0'),
  localIp: LOCAL_IP,
  tempDirectory: process.env.NOVA_TEMP_DIR || path.join(os.tmpdir(), 'nova-drop-temp'),
  autoCleanupOnFinish: true,
  sessionTimeoutMinutes: 15,
  historyEnabled: true,
  historyRetentionDays: 30,
};

export const APP_VERSION = '1.0.0';
export const PRODUCT_NAME = 'NOVA Drop';
export const TAGLINE = 'Your files. Your devices. Your network.';
