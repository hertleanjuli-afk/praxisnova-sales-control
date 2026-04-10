import { NextRequest, NextResponse } from 'next/server';
import sql, { initializeDatabase } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/brevo';

export const maxDuration = 280;

// Post-Format-Rotation nach Wochentag
const POST_FORMATS: Record<number, { format: string; label: string; instruction: string }[]> = {
  1: [{ format: 'aus_der_praxis', label: 'Aus der Praxis', instruction: 'Eine kurze Micro-Story: Was hat ein Bau-Unternehmer durch KI/Automatisierung veraendert? Konkret, mit Zahlen.' }],
  2: [{ format: 'vorher_nachher', label: 'Vorher / Nachher', instruction: 'Ein Vorher/Nachher-Vergleich: Wie sah ein Handwerks-Prozess OHNE KI aus, wie MIT KI? Konkreter Kontrast.' }],
  3: [{ format: 'unbequeme_frage', label: 'Die unbequeme Frage', instruction: 'Eine provokante Frage die Immobilien/Hausverwaltungs-Profis zum Nachdenken bringt. Hook ist eine Frage, dann Einordnung.' }],
  4: [{ format: 'statistik', label: 'Statistik + Einordnung', instruction: 'Eine ueberraschende Statistik zu KI-Adoption bei KMU, dann Einordnung: Was bedeutet das fuer dein Unternehmen?' }],
  5: [{ format: 'wochenrueckblick', label: 'Wochenrueckblick', instruction: 'Ein Insight oder Lernmoment aus der Praxisnovaai-Woche. Persoenlich, authentisch, mit einem konkreten Takeaway fuer den Leser.' }],
};

// Ziel-Sektoren-Rotation (alterniert zwischen Posts 1 und 2)
const SECTOR_BY_DAY: Record<number, [string, string]> = {
  1: ['bau', 'bau'],
  2: ['handwerk', 'handwerk'],
  3: ['immobilien', 'immobilien'],
  4: ['ki_automatisierung', 'bau'],
  5: ['handwerk', 'immobilien'],
};

interface NewsRow {
  id: number;
  headline: string;
  summary: string;
  sector: string;
}

interface InsightRow {
  pain_points: string | null;
  key_insight: string | null;
  recommended_email_angle: string | null;
  industry: string | null;
}

interface MarketUpdateRow {
  content: string | null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ ok: true, skipped: 'Wochenende' });
  }

  const log = (msg: string) => console.log(`[linkedin-post-generator] ${msg}`);

  try {
    await initializeDatabase();

    // Tabellen sicherstellen
    await sql`
      CREATE TABLE IF NOT EXISTS linkedin_post_drafts (
        id SERIAL PRIMARY KEY,
        draft_date DATE NOT NULL DEFAULT CURRENT_DATE,
        post_number INTEGER NOT NULL CHECK (post_number IN (1, 2)),
        format TEXT NOT NULL,
        sector TEXT NOT NULL,
        hook TEXT NOT NULL,
        content TEXT NOT NULL,
        cta TEXT,
        topic TEXT,
        source_news_id INTEGER,
        image_prompt TEXT,
        image_generated BOOLEAN DEFAULT false,
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        posted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(draft_date, post_number)
      )
    `;

    // Pruefen ob heute schon Entwuerfe existieren
    const existing = await sql`
      SELECT COUNT(*) as count FROM linkedin_post_drafts WHERE draft_date = CURRENT_DATE
    `;
    if (parseInt(existing[0]?.count || '0') >= 2) {
      log('Entwuerfe fuer heute bereits vorhanden - ueberspringe');
      return NextResponse.json({ ok: true, skipped: 'already_exists' });
    }

    // 1. Heutige News laden
    const todayNews = (await sql`
      SELECT id, headline, summary, sector FROM industry_news
      WHERE news_date = CURRENT_DATE AND used_for_linkedin = true
      ORDER BY relevance_score DESC LIMIT 5
    `.catch(() => [])) as unknown as NewsRow[];

    // 2. Customer Insights laden (zufaellig 3)
    const insights = (await sql`
      SELECT pain_points, key_insight, recommended_email_angle, industry
      FROM customer_insights
      ORDER BY RANDOM() LIMIT 3
    `.catch(() => [])) as unknown as InsightRow[];

    // 3. Market Intelligence (letzte 7 Tage)
    const marketUpdates = (await sql`
      SELECT content FROM agent_updates
      WHERE agent_name = 'market-intelligence'
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 2
    `.catch(() => [])) as unknown as MarketUpdateRow[];

    const formats = POST_FORMATS[dayOfWeek] || POST_FORMATS[5];
    const sectors = SECTOR_BY_DAY[dayOfWeek] || ['bau', 'handwerk'];
    const draftsCreated: number[] = [];

    for (let postNum = 1; postNum <= 2; postNum++) {
      const format = formats[0];
      const sector = sectors[postNum - 1];
      const relevantNews = todayNews.filter((n) => n.sector === sector || todayNews.length < 2);
      const newsContext = relevantNews.slice(0, 2).map((n) => `"${n.headline}: ${n.summary}"`).join('\n');
      const insightsContext = insights.map((i) => `Schmerz: ${i.pain_points?.substring(0, 100) || ''}`).join('\n');
      const marketContext = marketUpdates[0]?.content?.substring(0, 300) || '';
      const sourceNewsId = relevantNews[0]?.id || null;

      const prompt = `
Du bist Content-Creator fuer PraxisNova AI, ein KI-Automatisierungs-Unternehmen fuer deutsche KMU.
Zielgruppe: Unternehmer in Bau, Handwerk, Immobilien/Hausverwaltung in Deutschland.
Dein Ton: Direkt, authentisch, praxisnah. Keine Buzzwords. Keine Em-Dashes (—) oder En-Dashes (–).

Sektor: ${sector.replace('_', ' ').toUpperCase()}
Format: ${format.label}
Aufgabe: ${format.instruction}

Heutige News-Inspiration:
${newsContext || 'Kein spezifischer News-Input heute.'}

Validierte Kunden-Schmerz-Punkte:
${insightsContext || 'Keine spezifischen Insights vorhanden.'}

Markt-Kontext:
${marketContext}

Erstelle einen LinkedIn-Post als JSON:
{
  "hook": "Erste Zeile des Posts - entscheidet ob jemand weiterliest. Max. 120 Zeichen. Kann eine Frage, eine Zahl oder eine ueberraschende Aussage sein.",
  "content": "Voller Post-Text. Formatiert fuer LinkedIn: kurze Absaetze, Zeilenumbrueche. 150-250 Woerter. Professionell aber persoenlich. Auf Deutsch.",
  "cta": "Call to Action - letzte Zeile des Posts. Einladung zur Diskussion oder Frage an die Leser.",
  "topic": "Kurzes Thema-Label (3-5 Woerter)",
  "image_prompt": "Beschreibung fuer ein KI-generiertes LinkedIn-Post-Bild: dunkler Hintergrund, modernes Design, relevant fuer das Post-Thema. 1-2 Saetze."
}

WICHTIG: Kein Em-Dash (—) und kein En-Dash (–) im gesamten Text. Verwende stattdessen Komma, Punkt oder Bindestrich (-).
Antworte NUR mit dem JSON. Kein Text davor oder danach.
`;

      try {
        log(`Generiere Post ${postNum}/2 (${format.label}, Sektor: ${sector})`);

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.Gemini_API_Key_Sales_Agent || process.env.GEMINI_API_KEY || '',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.85, maxOutputTokens: 1500 },
          }),
        });

        if (!response.ok) {
          log(`Gemini API Fehler Post ${postNum}: ${response.status}`);
          continue;
        }

        const geminiData = await response.json();
        const rawText: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          log(`Kein gueltiges JSON fuer Post ${postNum}`);
          continue;
        }

        const draft = JSON.parse(jsonMatch[0]);

        // Em/En-Dashes sicherheitshalber entfernen
        const clean = (s: string) => (s || '').replace(/[—–]/g, '-');

        await sql`
          INSERT INTO linkedin_post_drafts (
            draft_date, post_number, format, sector,
            hook, content, cta, topic,
            source_news_id, image_prompt, status
          ) VALUES (
            CURRENT_DATE, ${postNum}, ${format.format}, ${sector},
            ${clean(draft.hook)}, ${clean(draft.content)},
            ${clean(draft.cta)}, ${clean(draft.topic)},
            ${sourceNewsId}, ${clean(draft.image_prompt)}, 'draft'
          )
          ON CONFLICT (draft_date, post_number) DO UPDATE SET
            hook = EXCLUDED.hook,
            content = EXCLUDED.content,
            status = 'draft',
            created_at = NOW()
        `;

        draftsCreated.push(postNum);
        log(`Post ${postNum} gespeichert: "${clean(draft.hook).substring(0, 60)}..."`);
      } catch (err) {
        log(`Fehler bei Post ${postNum}: ${String(err).substring(0, 200)}`);
      }
    }

    // Benachrichtigung senden wenn Posts generiert
    if (draftsCreated.length > 0) {
      const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background: #0A0A0A; color: #F0F0F5; padding: 24px; max-width: 600px;">
          <h2 style="color: #E8472A; margin-bottom: 8px;">LinkedIn Post-Entwuerfe bereit</h2>
          <p style="color: #ccc; margin-bottom: 20px;">Heute, ${today}, hat der Post-Generator ${draftsCreated.length} Entwuerfe erstellt.</p>
          <a href="https://praxisnova-sales-control.vercel.app/linkedin-posting"
             style="background: #E8472A; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Entwuerfe ansehen und kopieren
          </a>
          <p style="color: #666; margin-top: 20px; font-size: 13px;">
            Auf der LinkedIn-Posting-Seite: Tab "Entwuerfe" aufrufen, Post kopieren, auf LinkedIn einfuegen.
          </p>
        </div>
      `;

      // An Angie senden
      await sendTransactionalEmail({
        to: process.env.USER_1_EMAIL || 'hertle.anjuli@praxisnovaai.com',
        subject: `${draftsCreated.length} LinkedIn-Entwuerfe bereit - ${today}`,
        htmlContent: emailHtml,
        wrapAsInternal: true,
      }).catch(() => {});

      // An Samantha senden wenn konfiguriert
      if (process.env.USER_2_EMAIL) {
        await sendTransactionalEmail({
          to: process.env.USER_2_EMAIL,
          subject: `${draftsCreated.length} LinkedIn-Entwuerfe bereit - ${today}`,
          htmlContent: emailHtml,
          wrapAsInternal: true,
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      drafts_created: draftsCreated.length,
      post_numbers: draftsCreated,
      day: dayOfWeek,
    });
  } catch (error) {
    console.error('[linkedin-post-generator] Fatal error:', error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
