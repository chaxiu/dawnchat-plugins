export interface AssistantChatSavedConfigSummary {
  provider: string;
  modelId: string;
}

/** Localized / product strings for AssistantChatChrome (hosts supply). */
export interface AssistantChatChromeLabels {
  toolbarTitle: string;
  providerReadyTitle: string;
  providerNotReadyTitle: string;
  settingsAriaLabel: string;
  settingsDialogAriaLabel: string;
  settingsEyebrow: string;
  settingsTitle: string;
  statusReady: string;
  statusNeedsKey: string;
  sectionSaved: string;
  sectionProvider: string;
  sectionConversation: string;
  lastStopPrefix: string;
  composerPlaceholder: string;
  send: string;
  sending: string;
  clearChat: string;
  copyDebugLogs: string;
  saveLocally: string;
  resetDraft: string;
  clearSaved: string;
  /** Collapsed mobile sheet: control to expand full chat (e.g. chevron). */
  expandSheetAriaLabel: string;
  /** Placeholder for the single-line dock input (may match composer). */
  mobileDockPlaceholder: string;
}
