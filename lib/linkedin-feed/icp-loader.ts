/**
 * Dual-Mode-Loader fuer ICP-LinkedIn-Keywords (Track 1, T1.3).
 *
 * Primaer-Quelle: DB-Tabelle icp_config (Spalte linkedin_keywords JSONB),
 * angelegt in db-migration-v11. Der Loader liest die Zeilen wo enabled=true
 * ist und mappt sie zu IcpKeywordsSource.
 *
 * Fallback: lib/config/icp-linkedin-keywords.ts. Sobald icp_config Rows hat,
 * gewinnt die DB. Solange leer (Track 3 hat noch nicht geseedet), liefert
 * der Loader die Code-Defaults, damit T1.3 heute live laufen kann.
 *
 * Gate 7 (PS 2.3 Extensibility): Neue ICPs = INSERT in icp_config, kein
 * Code-Deploy noetig. Fallback ist nur das Safety-Net fuer T1.3-Launch.
 */

import sql from '../db';
import {
  ICP_LINKEDIN_KEYWORDS_FALLBACK,
  type IcpKeywordDefault,
} from '../config/icp-linkedin-keywords';
import type { IcpKeywordsSource } from './types';

function mapFallback(d: IcpKeywordDefault): IcpKeywordsSource {
  return { id: d.id, displayName: d.displayName, keywords: d.keywords };
}

export function getFallbackKeywordSources(): IcpKeywordsSource[] {
  return ICP_LINKEDIN_KEYWORDS_FALLBACK.map(mapFallback);
}

interface IcpConfigRow {
  id: string;
  display_name: string;
  linkedin_keywords: unknown;
}

function parseJsonArrayToStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x) => typeof x === 'string') as string[];
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? (parsed.filter((x) => typeof x === 'string') as string[])
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Liest icp_config aus der DB. Wenn die Tabelle fehlt oder leer ist, liefert
 * der Loader den Code-Fallback. Fehler werden geloggt aber nicht geworfen.
 */
export async function loadIcpKeywordSources(): Promise<IcpKeywordsSource[]> {
  try {
    const rows = (await sql`
      SELECT id, display_name, linkedin_keywords
      FROM icp_config
      WHERE enabled = true
    `) as IcpConfigRow[];

    if (!rows || rows.length === 0) {
      return getFallbackKeywordSources();
    }

    const mapped: IcpKeywordsSource[] = rows
      .map((r) => ({
        id: r.id,
        displayName: r.display_name,
        keywords: parseJsonArrayToStringArray(r.linkedin_keywords),
      }))
      .filter((r) => r.keywords.length > 0);

    // Wenn icp_config existiert aber niemand linkedin_keywords gesetzt hat,
    // greift der Fallback, damit der Agent ueberhaupt matchen kann.
    return mapped.length > 0 ? mapped : getFallbackKeywordSources();
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'linkedin-feed: icp_config read failed, using fallback keywords',
        error: error instanceof Error ? error.message : String(error),
        ts: new Date().toISOString(),
      })
    );
    return getFallbackKeywordSources();
  }
}
