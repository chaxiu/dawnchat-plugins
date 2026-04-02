import type { ViewStateSummarySchema } from "./manifest";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function matchesSchemaType(expectedType: unknown, value: unknown): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainRecord(value);
    default:
      return true;
  }
}

export function validateViewStateSummary(
  schema: ViewStateSummarySchema,
  summary: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  if (!isPlainRecord(summary)) {
    return ["state summary must be an object"];
  }

  const properties = isPlainRecord(schema.properties) ? schema.properties : {};
  const requiredFields = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  for (const requiredField of requiredFields) {
    if (!(requiredField in summary) || summary[requiredField] === undefined) {
      errors.push(`missing required field: ${requiredField}`);
    }
  }

  for (const [fieldName, fieldValue] of Object.entries(summary)) {
    const propertySchema = properties[fieldName];
    if (!isPlainRecord(propertySchema)) {
      continue;
    }
    if (!matchesSchemaType(propertySchema.type, fieldValue)) {
      errors.push(
        `invalid field type for ${fieldName}: expected ${String(propertySchema.type)}`
      );
    }
  }

  return errors;
}

export function assertValidViewStateSummary(
  viewId: string,
  schema: ViewStateSummarySchema,
  summary: Record<string, unknown>
): void {
  const errors = validateViewStateSummary(schema, summary);
  if (errors.length === 0) {
    return;
  }

  throw new Error(
    `Invalid state summary for ${viewId}: ${errors.join("; ")}`
  );
}
