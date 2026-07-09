/**
 * Database utility for Turso (libSQL) HTTP API.
 * Replaces the `team-db` CLI which only works in the sandbox.
 *
 * Environment variables:
 *   TURSO_DB_URL  — Turso database URL (libsql://...)
 *   TURSO_DB_TOKEN  — Turso auth token
 *
 * Falls back to sandbox env vars TEAM_DB_URL / TEAM_DB_AUTH_TOKEN for compatibility.
 */

function esc(val: string): string {
  return val.replace(/'/g, "''");
}

function getDbUrl(): string {
  return process.env.TURSO_DB_URL || process.env.TEAM_DB_URL || "";
}

function getDbToken(): string {
  return process.env.TURSO_DB_TOKEN || process.env.TEAM_DB_AUTH_TOKEN || "";
}

function getApiUrl(): string {
  const url = getDbUrl();
  // Convert libsql:// to https:// for the HTTP API
  return url.replace(/^libsql:/, "https:") + "/v2/pipeline";
}

/**
 * Execute a single SQL statement via the Turso HTTP API.
 * Returns the parsed JSON result array, or empty array for mutations.
 */
export async function query(sql: string): Promise<any[]> {
  const apiUrl = getApiUrl();
  const token = getDbToken();

  if (!apiUrl || !token) {
    console.error("DB not configured: set TURSO_DB_URL and TURSO_DB_TOKEN");
    return [];
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          type: "execute",
          stmt: { sql },
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Turso API error:", response.status, text);
    return [];
  }

  const json = await response.json();

  // Parse the response
  if (json.results && json.results[0]) {
    const result = json.results[0];
    if (result.error) {
      console.error("Turso query error:", result.error);
      return [];
    }
    if (result.response && result.response.result) {
      // Format: rows with columns
      const cols = result.response.cols || [];
      const rows = result.response.result.rows || [];
      return rows.map((row: any[]) => {
        const obj: Record<string, any> = {};
        row.forEach((val: any, i: number) => {
          obj[cols[i].name] = val.value !== null ? val.value : null;
        });
        return obj;
      });
    }
  }

  return [];
}

/**
 * Execute a SQL statement with a single-quote-escaped value.
 * Builds the SQL string with proper escaping.
 */
export function sql(strings: TemplateStringsArray, ...values: any[]): string {
  let result = "";
  strings.forEach((str, i) => {
    result += str;
    if (i < values.length) {
      const val = values[i];
      if (val === null || val === undefined) {
        result += "NULL";
      } else if (typeof val === "number") {
        result += String(val);
      } else {
        result += "'" + esc(String(val)) + "'";
      }
    }
  });
  return result;
}

export { esc };