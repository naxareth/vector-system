// ---------------------------------------------------------------------------
// CSV Input Validation — Checkpoint #2 Security Mitigation
//
// Validates file format, sanitizes all CSV rows before processing.
// Prevents: formula injection, oversized payloads, malformed data.
//
// Schema-aware: accepts dynamic required headers so the CSV can match
// any credential template the registrar selects.
// ---------------------------------------------------------------------------

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum CSV file size in bytes (1 MB) */
export const MAX_CSV_SIZE_BYTES = 1 * 1024 * 1024;

/** Maximum number of rows allowed in a single CSV upload */
export const MAX_CSV_ROWS = 500;

/** Maximum cell length (characters) */
export const MAX_CELL_LENGTH = 500;

/** Allowed MIME types for CSV uploads */
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel', // some browsers report .csv as this
];

/**
 * Base headers always required regardless of schema.
 * student_id  → identifies the student in the DB
 * wallet_address → required for on-chain minting
 */
export const BASE_HEADERS = ['student_id', 'wallet_address'];

/**
 * Characters that trigger formula injection in spreadsheet software.
 * Cells starting with any of these characters will be prefixed with a
 * single-quote to neutralize them.
 */
const FORMULA_INJECTION_CHARS = ['=', '+', '-', '@', '\t', '\r'];

// ---------------------------------------------------------------------------
// CSV line parser — handles quoted fields (RFC 4180)
// ---------------------------------------------------------------------------

/**
 * Parse a single CSV line into an array of field values.
 * Handles double-quoted fields containing commas and escaped quotes.
 * e.g. `a,"b,c",d` → ['a', 'b,c', 'd']
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false; // closing quote
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current); // last field
  return fields;
}

// ---------------------------------------------------------------------------
// Zod schemas — base fields with strict validation
// ---------------------------------------------------------------------------

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;

/** Base row schema — validates the two identity fields */
export const BaseRowSchema = z.object({
  student_id: z.string().regex(uuidRegex, 'Must be a valid UUID v4'),
  wallet_address: z.string().regex(ethAddressRegex, 'Must be a valid Ethereum address (0x…40 hex chars)'),
});

// Legacy: full schema with skill_name for backward compatibility with tests
export const CsvRowSchema = BaseRowSchema.extend({
  skill_name: z.string().min(1, 'Skill name cannot be empty').max(MAX_CELL_LENGTH),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvValidationSuccess {
  ok: true;
  rows: Record<string, string>[];
  warnings: string[];
}

export interface CsvValidationError {
  ok: false;
  error: string;
  rowErrors?: { row: number; field: string; message: string }[];
}

export type CsvValidationResult = CsvValidationSuccess | CsvValidationError;

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize a single CSV cell value:
 * 1. Trim whitespace
 * 2. Strip null bytes
 * 3. Neutralize formula-injection characters by prepending a single-quote
 * 4. Truncate to MAX_CELL_LENGTH
 */
export function sanitizeCell(value: string): string {
  let sanitized = value.trim();

  // Strip null bytes (could bypass downstream parsing)
  sanitized = sanitized.replace(/\0/g, '');

  // Neutralize formula injection — prefix with single-quote
  if (sanitized.length > 0 && FORMULA_INJECTION_CHARS.includes(sanitized[0])) {
    sanitized = `'${sanitized}`;
  }

  // Enforce max length
  if (sanitized.length > MAX_CELL_LENGTH) {
    sanitized = sanitized.slice(0, MAX_CELL_LENGTH);
  }

  return sanitized;
}

// ---------------------------------------------------------------------------
// File-level validation
// ---------------------------------------------------------------------------

/**
 * Validate the CSV file metadata (MIME type + size).
 * Call this BEFORE reading the file content.
 */
export function validateCsvFile(
  mimeType: string,
  sizeBytes: number
): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type "${mimeType}". Only CSV files (text/csv) are accepted.`,
    };
  }

  if (sizeBytes > MAX_CSV_SIZE_BYTES) {
    const maxMB = (MAX_CSV_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxMB} MB.`,
    };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Content parsing & row-level validation
// ---------------------------------------------------------------------------

/**
 * Parse raw CSV text into validated, sanitized rows.
 *
 * @param csvText        - Raw CSV file content
 * @param requiredHeaders - Column headers required in this CSV.
 *                          Defaults to BASE_HEADERS + ['skill_name'] for backward compat.
 * @param schemaFields   - Optional list of dynamic schema field keys (from the template).
 *                          These are validated to be non-empty strings but NOT against
 *                          UUID/ETH patterns. Only base fields get strict validation.
 *
 * Steps:
 * 1. Split into lines, skip empty lines
 * 2. Validate header row contains all required headers
 * 3. Sanitize every cell
 * 4. Validate base fields (student_id, wallet_address) with Zod
 * 5. Validate dynamic fields are non-empty if they are required by the schema
 * 6. Collect row-level errors; return all at once for UX
 */
export function parseCsvContent(
  csvText: string,
  requiredHeaders?: string[],
  schemaFields?: string[]
): CsvValidationResult {
  const warnings: string[] = [];

  // Default to legacy behavior if no requiredHeaders provided
  const headers_required = requiredHeaders ?? [...BASE_HEADERS, 'skill_name'];

  // Normalize line endings and split
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { ok: false, error: 'CSV file is empty.' };
  }

  // --- Header validation ---
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.trim().toLowerCase());

  const missingHeaders = headers_required.filter((rh) => !headers.includes(rh.toLowerCase()));
  if (missingHeaders.length > 0) {
    return {
      ok: false,
      error: `Missing required CSV columns: ${missingHeaders.join(', ')}. ` +
        `Required: ${headers_required.join(', ')}`,
    };
  }

  // Data rows (skip header)
  const dataLines = lines.slice(1);

  if (dataLines.length === 0) {
    return { ok: false, error: 'CSV file has headers but no data rows.' };
  }

  if (dataLines.length > MAX_CSV_ROWS) {
    return {
      ok: false,
      error: `CSV exceeds maximum of ${MAX_CSV_ROWS} rows. Found ${dataLines.length} rows.`,
    };
  }

  // Determine which fields are schema-dynamic (non-base)
  const dynamicFields = schemaFields ?? headers_required.filter(h => !BASE_HEADERS.includes(h));

  // --- Row parsing ---
  const parsedRows: Record<string, string>[] = [];
  const rowErrors: { row: number; field: string; message: string }[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-indexed, +1 for header
    const cells = parseCsvLine(dataLines[i]);

    // Build row object from header mapping
    const rowObj: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      const rawValue = cells[colIdx] ?? '';
      rowObj[header] = sanitizeCell(rawValue);
    });

    // If a cell was sanitized (formula prefix added), add warning
    headers.forEach((header, colIdx) => {
      const raw = (cells[colIdx] ?? '').trim();
      if (raw.length > 0 && FORMULA_INJECTION_CHARS.includes(raw[0])) {
        warnings.push(
          `Row ${rowNum}, column "${header}": formula injection character "${raw[0]}" was neutralized.`
        );
      }
    });

    // Validate base fields (student_id, wallet_address) with strict Zod rules
    const baseData = { student_id: rowObj.student_id, wallet_address: rowObj.wallet_address };
    const baseResult = BaseRowSchema.safeParse(baseData);
    if (!baseResult.success) {
      baseResult.error.issues.forEach((issue) => {
        rowErrors.push({
          row: rowNum,
          field: issue.path.join('.'),
          message: issue.message,
        });
      });
    }

    // Validate dynamic fields are non-empty
    for (const field of dynamicFields) {
      const val = rowObj[field.toLowerCase()];
      if (!val || val.trim() === '') {
        rowErrors.push({
          row: rowNum,
          field,
          message: `"${field}" cannot be empty.`,
        });
      }
    }

    // Only add the row if no errors for it
    const hasErrorsThisRow = rowErrors.some(e => e.row === rowNum);
    if (!hasErrorsThisRow) {
      parsedRows.push(rowObj);
    }
  }

  if (rowErrors.length > 0) {
    return {
      ok: false,
      error: `Validation failed for ${rowErrors.length} field(s) across ${new Set(rowErrors.map(e => e.row)).size} row(s).`,
      rowErrors,
    };
  }

  return { ok: true, rows: parsedRows, warnings };
}
