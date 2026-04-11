/**
 * Config-driven settings fields for assistant chat chrome (provider / API forms).
 * Hosts pass `draftConfig: Record<string, unknown>` and optional `visibleWhen` per field.
 */

export type SettingsFieldGridColumn = "full";

export interface SettingsSelectField {
  kind: "select";
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  testId?: string;
  gridColumn?: SettingsFieldGridColumn;
  /** When false, field is not rendered */
  visibleWhen?: (draft: Record<string, unknown>) => boolean;
}

export interface SettingsTextField {
  kind: "text" | "password";
  key: string;
  label: string;
  placeholder?: string;
  gridColumn?: SettingsFieldGridColumn;
  visibleWhen?: (draft: Record<string, unknown>) => boolean;
}

export type SettingsField = SettingsSelectField | SettingsTextField;

export function isSettingsFieldVisible(field: SettingsField, draft: Record<string, unknown>): boolean {
  if (field.visibleWhen) {
    return field.visibleWhen(draft);
  }
  return true;
}
