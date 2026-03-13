import { Capacitor } from '@capacitor/core';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

export const getCurrentPlatform = (): string => Capacitor.getPlatform();

export const isPluginAvailable = (pluginKey: string): boolean => Capacitor.isPluginAvailable(pluginKey);

export const normalizeErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
};
