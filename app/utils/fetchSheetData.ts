export interface MeetingRow {
  [key: string]: string;
}

const SHEET_URL =
  "https://sheets.googleapis.com/v4/spreadsheets/1_F6mVakW159rHvFOSoY1FhDpHz5nIxMWCo-pvK_O92M/values/'Form%20Responses%201'!A:Z?key=AIzaSyBCWKZjjjKQ9aRRIgQcEcun3bUbzgILL68";

function normalizeHeader(header: string) {
  return header.trim().replace(/^"|"$/g, '').toLowerCase();
}

export async function fetchSheetData(): Promise<MeetingRow[]> {
  const res = await fetch(SHEET_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch sheet data");
  const data = await res.json();
  const [headersRaw, ...rows]: string[][] = data.values;
  const headers = headersRaw.map(normalizeHeader);
  return rows.map((row) => {
    const obj: MeetingRow = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });
} 