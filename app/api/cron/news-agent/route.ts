import { NextRequest, NextResponse } from 'next/server';
import sql, { initializeDatabase } from '@/lib/db';
import { logAndNotifyError } from '@/lib/error-notify';

export const maxDuration = 240;

// Tages-Sektor-Rotation
const DAILY_SECTORS: Record<number, { sector: string; query: string; label: string }[]> = {
  1: [{ sector: 'bau', query: 'Baubranche Deutschland 2026 aktuell Bautraeger', label: 'Bau & Bautraeger' }],
  2: [{ sector: 'handwerk', query: 'Handwerk Deutschland 2026 Digitalisierung Betriebe', label: 'Handwerk & Betriebe' }],
  3: [{ sector: 'immobilien', query: 'Immobilien Hausverwaltung Deutschland 2026 aktuell', label: 'Immobilien & Verwaltung' }],
  4: [{ sector: 'ki_automatisierung', query: 'KI Automatisierung KMU Mittelstand Deutschland 2026', label: 'KI & Automatisierung' }],
  5: [
    { sector: 'bau', query: 'Bau Baubranche Wochennews', label: 'Bau' },
    { sector: 'handwerk', query: 'Handwerk KMU Woche', label: 'Handwerk' },
    { sector: 'immobilien', query: 'Immobilien Verwaltung Woche', label: 'Immobilien' },
    { sector: 'ki_automatisierung', query: 'KI Automatisierung Woche', label: 'KI' },
  ],
};

interface NewsItem {
  headline: string;
  summary: string;
  sector: string;
  relevance_score: number;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dayOfWeek = new Date().getDay(); // 0=Sonntag, 1=Mo, ..., 5=Fr, 6=Sa

  // Nicht am Wochenende laufen
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ ok: true, skipped: 'Wochenende' });
  }

  const sectors = DAILY_SECTORS[dayOfWeek] || DAILY_SECTORS[5];
  const log = (msg: string) => console.log(`[news-agent] ${msg}`);

  try {
    await initializeDatabase();

    // Stellen sicher dass die Tabelle existiert
    await sql`
      CREATE TABLE IF NOT EXISTS industry_news (
        id SERIAL PRIMARY KEY,
        news_date DATE NOT NULL DEFAULT CURRENT_DATE,
        headline TEXT NOT NULL,
        summary TEXT,
        source_url TEXT,
        sector TEXT NOT NULL,
        relevance_score INTEGER DEFAULT 5,
        used_for_linkedin BOOLEAN DEFAULT false,
        used_for_outreach BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    const allNews: NewsItem[] = [];

    for (const { sector, label } of sectors) {
      log(`Suche News: ${label}`);

      // Prompt fuer Gemini: News zusammenfassen
      const newsPrompt = `
Du bist ein Nachrichten-Analyst fuer PraxisNova AI, ein KI-Automatisierungs-Unternehmen fuer deutsche KMU im Bau, Handwerk und Immobilien-Bereich.

Analysiere aktuelle Nachrichten und Trends fuer: ${label}

Erstelle 2-3 relevante Nachrichten-Eintraege fuer den ${new Date().toLocaleDateString('de-DE')} im JSON-Format:

[
  {
    "headline": "Kurze, praegnante Ueberschrift (max. 100 Zeichen, kein Em-Dash)",
    "summary": "2-3 Saetze Zusammenfassung. Warum ist das relevant fuer digitalisierungswillige KMU?",
    "relevance_score": 7,
    "for_linkedin": true
  }
]

Fokus auf:
- Trends die Schmerz-Punkte der Zielgruppe verstaerken (Fachkraeftemangel, Digitalisierungsdruck, Kosten)
- Regulierungen oder Marktveraenderungen
- Erfolgsbeispiele von Digitalisierung in diesem Sektor
- Zahlen und Statistiken die eine LinkedIn-Post einleiten koennen

Antworte NUR mit dem JSON-Array. Kein Text davor oder danach.
`;

      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.Gemini_API_Key_Sales_Agent || process.env.GEMINI_API_KEY || '',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: newsPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          }),
        });

        if (!response.ok) {
          log(`Gemini API Fehler fuer ${label}: ${response.status}`);
          continue;
        }

        const geminiData = await response.json();
        const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

        // JSON extrahieren
        const jsonMatch = rawText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          log(`Kein gueltiges JSON fuer ${label}`);
          continue;
        }

        const newsItems = JSON.parse(jsonMatch[0]);

        for (const item of newsItems) {
          if (!item.headline || !item.summary) continue;

          // Kein Em-Dash in Headlines/Summaries
          const cleanHeadline: string = item.headline.replace(/[—–]/g, '-');
          const cleanSummary: string = item.summary.replace(/[—–]/g, '-');

          await sql`
            INSERT INTO industry_news (
              news_date, headline, summary, sector,
              relevance_score, used_for_linkedin, used_for_outreach
            ) VALUES (
              CURRENT_DATE,
              ${cleanHeadline},
              ${cleanSummary},
              ${sector},
              ${item.relevance_score || 5},
              ${item.for_linkedin === true},
              true
            )
            ON CONFLICT DO NOTHING
          `;

          allNews.push({ headline: cleanHeadline, summary: cleanSummary, sector, relevance_score: item.relevance_score || 5 });
          log(`News gespeichert: ${cleanHeadline.substring(0, 60)}`);
        }
      } catch (err) {
        log(`Fehler bei Sektor ${label}: ${String(err).substring(0, 200)}`);
      }
    }

    // Agent Update schreiben (erscheint auf /agent-updates Seite)
    if (allNews.length > 0) {
      const updateText = `NEWS DES TAGES (${new Date().toLocaleDateString('de-DE')}):\n\n` +
        allNews.map(n => `[${n.sector.toUpperCase()}] ${n.headline}\n${n.summary}`).join('\n\n');

      await sql`
        INSERT INTO agent_updates (agent_name, update_type, content, created_at)
        VALUES ('news-agent', 'daily_news', ${updateText}, NOW())
        ON CONFLICT DO NOTHING
      `.catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      news_collected: allNews.length,
      sectors_processed: sectors.length,
      day: dayOfWeek,
    });
  } catch (error) {
    console.error('[news-agent] Fatal error:', error);
    await logAndNotifyError({
      errorType: 'news-agent-run-failed',
      errorMessage: error instanceof Error ? error.message : String(error),
      action: 'news-agent cron',
    }).catch((notifyErr) => console.error('[news-agent] Notify failed:', notifyErr));
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
