/**
 * Reads values out of a Google Sheet via the Sheets API v4.
 *
 * Setup:
 *   1. Share the spreadsheet as "Anyone with the link can view". An API key
 *      only grants access to public sheets; reading a private one would
 *      require a service account instead.
 *   2. In a Google Cloud project, enable the Google Sheets API and create an
 *      API key (restrict it to the Sheets API).
 *   3. Put the key and the spreadsheet ID in .env -- see .env.example.
 *
 * This site is statically built, so these fetches run at build time: edits to
 * the spreadsheet only show up after a redeploy.
 */

const API_KEY = import.meta.env.GOOGLE_SHEETS_API_KEY;
const SHEET_ID = import.meta.env.GOOGLE_SHEET_ID;

export type SheetRow = Record<string, string>;

interface FetchOptions {
  /** A1 notation, e.g. "Events!A1:D" or just "Events" for the whole tab. */
  range: string;
  /** Overrides GOOGLE_SHEET_ID from the environment. */
  sheetId?: string;
}

/**
 * Returns the raw grid of cell values. Google trims trailing empty cells, so
 * rows are not guaranteed to all be the same length.
 */
export async function fetchSheetValues({
  range,
  sheetId = SHEET_ID,
}: FetchOptions): Promise<string[][]> {
  if (!API_KEY || !sheetId) {
    console.warn(
      "[sheets] GOOGLE_SHEETS_API_KEY / GOOGLE_SHEET_ID are not set; see .env.example. Skipping fetch.",
    );
    return [];
  }

  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
  );
  url.searchParams.set("key", API_KEY);
  // Render dates/numbers the way they appear in the sheet.
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${body}`);
    }
    const data: { values?: string[][] } = await response.json();
    return data.values ?? [];
  } catch (error) {
    console.warn(`[sheets] Could not read "${range}":`, error);
    return [];
  }
}

/**
 * Same as fetchSheetValues, but treats the first row as a header and returns
 * one object per remaining row. Missing cells become empty strings.
 */
export async function fetchSheetRows(
  options: FetchOptions,
): Promise<SheetRow[]> {
  const [header, ...body] = await fetchSheetValues(options);
  if (!header) {
    return [];
  }

  const keys = header.map((key) => key.trim());

  return body
    .filter((row) => row.some((cell) => cell?.trim()))
    .map((row) =>
      Object.fromEntries(keys.map((key, i) => [key, (row[i] ?? "").trim()])),
    );
}
