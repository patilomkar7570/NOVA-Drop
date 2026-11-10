import React, { createContext, useContext, useState, useEffect } from 'react';
import { FileItem, HistoryItem, SessionData, SystemStatusData } from '../types/index.js';
import * as api from '../services/api.js';
import { wsClient } from '../services/websocket.js';

interface TransferContextType {
  activeSession: SessionData | null;
  activeSessionRole: 'sender' | 'receiver' | null;
  activeSessionToken: string | null;
  files: FileItem[];
  systemStatus: SystemStatusData | null;
  history: HistoryItem[];
  isWsConnected: boolean;
  refreshSystemStatus: () => Promise<void>;
  refreshHistory: () => Promise<void>;
  setSession: (session: SessionData | null, role: 'sender' | 'receiver' | null, token: string | null) => void;
  updateFiles: (updater: (prev: FileItem[]) => FileItem[]) => void;
  clearSession: () => void;
}

const TransferContext = createContext<TransferContextType>({
  activeSession: null,
  activeSessionRole: null,
  activeSessionToken: null,
  files: [],
  systemStatus: null,
  history: [],
  isWsConnected: false,
  refreshSystemStatus: async () => {},
  refreshHistory: async () => {},
  setSession: () => {},
  updateFiles: () => {},
  clearSession: () => {},
});

export const TransferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [activeSessionRole, setActiveSessionRole] = useState<'sender' | 'receiver' | null>(null);
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const refreshSystemStatus = async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to load system status:', err);
    }
  };

  const refreshHistory = async () => {
    try {
      const res = await api.getHistory();
      setHistory(res.records);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  useEffect(() => {
    refreshSystemStatus();
    refreshHistory();

    const interval = setInterval(() => {
      refreshSystemStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Listen to WebSocket connection state
  useEffect(() => {
    const unsubConnect = wsClient.on('connected', () => setIsWsConnected(true));
    const unsubDisconnect = wsClient.on('disconnected', () => setIsWsConnected(false));

    return () => {
      unsubConnect();
      unsubDisconnect();
    };
  }, []);

  const setSession = (
    session: SessionData | null,
    role: 'sender' | 'receiver' | null,
    token: string | null
  ) => {
    setActiveSession(session);
    setActiveSessionRole(role);
    setActiveSessionToken(token);
    if (!session) {
      wsClient.disconnect();
    }
  };

  const clearSession = () => {
    setActiveSession(null);
    setActiveSessionRole(null);
    setActiveSessionToken(null);
    setFiles([]);
    wsClient.disconnect();
    refreshSystemStatus();
    refreshHistory();
  };

  const updateFiles = (updater: (prev: FileItem[]) => FileItem[]) => {
    setFiles(updater);
  };

  return (
    <TransferContext.Provider
      value={{
        activeSession,
        activeSessionRole,
        activeSessionToken,
        files,
        systemStatus,
        history,
        isWsConnected,
        refreshSystemStatus,
        refreshHistory,
        setSession,
        updateFiles,
        clearSession,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
};

export const useTransfers = () => useContext(TransferContext);
