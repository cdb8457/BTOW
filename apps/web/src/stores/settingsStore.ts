import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppSettings {
  // Appearance
  messageDisplay: 'cozy' | 'compact';
  showAvatars: boolean;
  showTimestamps: boolean;
  fontSize: 14 | 15 | 16 | 18;

  // Notifications
  notificationsEnabled: boolean;
  notifyOnMention: boolean;
  notifyOnDM: boolean;
  notifyOnAllMessages: boolean;
  notificationSound: boolean;

  // Voice
  inputDevice: string;
  outputDevice: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;

  // Actions
  setMessageDisplay: (val: AppSettings['messageDisplay']) => void;
  setShowAvatars: (val: boolean) => void;
  setShowTimestamps: (val: boolean) => void;
  setFontSize: (val: AppSettings['fontSize']) => void;
  setNotificationsEnabled: (val: boolean) => void;
  setNotifyOnMention: (val: boolean) => void;
  setNotifyOnDM: (val: boolean) => void;
  setNotifyOnAllMessages: (val: boolean) => void;
  setNotificationSound: (val: boolean) => void;
  setInputVolume: (val: number) => void;
  setOutputVolume: (val: number) => void;
  setNoiseSuppression: (val: boolean) => void;
  setEchoCancellation: (val: boolean) => void;
}

export const useSettingsStore = create<AppSettings>()(
  persist(
    (set) => ({
      messageDisplay: 'cozy',
      showAvatars: true,
      showTimestamps: true,
      fontSize: 15,
      notificationsEnabled: false,
      notifyOnMention: true,
      notifyOnDM: true,
      notifyOnAllMessages: false,
      notificationSound: true,
      inputDevice: 'default',
      outputDevice: 'default',
      inputVolume: 100,
      outputVolume: 100,
      noiseSuppression: true,
      echoCancellation: true,

      setMessageDisplay: (val) => set({ messageDisplay: val }),
      setShowAvatars: (val) => set({ showAvatars: val }),
      setShowTimestamps: (val) => set({ showTimestamps: val }),
      setFontSize: (val) => set({ fontSize: val }),
      setNotificationsEnabled: (val) => set({ notificationsEnabled: val }),
      setNotifyOnMention: (val) => set({ notifyOnMention: val }),
      setNotifyOnDM: (val) => set({ notifyOnDM: val }),
      setNotifyOnAllMessages: (val) => set({ notifyOnAllMessages: val }),
      setNotificationSound: (val) => set({ notificationSound: val }),
      setInputVolume: (val) => set({ inputVolume: val }),
      setOutputVolume: (val) => set({ outputVolume: val }),
      setNoiseSuppression: (val) => set({ noiseSuppression: val }),
      setEchoCancellation: (val) => set({ echoCancellation: val }),
    }),
    { name: 'btow-settings' }
  )
);
