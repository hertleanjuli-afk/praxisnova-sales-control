import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

/**
 * PATCH /api/anrufliste/[id]
 * Status eines Anruflisten-Eintrags aktualisieren (angerufen, erreicht, etc.)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entryId = parseInt(params.id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status, call_result, call_notes } = body;

    const validStatuses = ['ready', 'called', 'skipped'];
    const validResults = ['reached', 'not_reached', 'voicemail', 'appointment', 'wrong_number'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Ungueltiger Status. Erlaubt: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    if (call_result && !validResults.includes(call_result)) {
      return NextResponse.json(
        { error: `Ungueltiges Ergebnis. Erlaubt: ${validResults.join(', ')}` },
        { status: 400 }
      );
    }

    // Entry laden um lead_id zu bekommen
    const entryRows = await sql`SELECT lead_id FROM call_queue WHERE id = ${entryId}`;
    if (entryRows.length === 0) {
      return NextResponse.json({ error: 'Eintrag nicht gefunden' }, { status: 404 });
    }
    const leadId = entryRows[0].lead_id;

    // Call Queue Entry aktualisieren
    await sql`
      UPDATE call_queue SET
        status = COALESCE(${status || null}, status),
        call_result = COALESCE(${call_result || null}, call_result),
        call_notes = COALESCE(${call_notes || null}, call_notes),
        called_at = CASE
          WHEN ${status || ''} = 'called' THEN NOW()
          ELSE called_at
        END
      WHERE id = ${entryId}
    `;

    // Wenn angerufen, auch in call_logs eintragen
    if (status === 'called' && call_result) {
      await sql`
        INSERT INTO call_logs (lead_id, call_date, result, notes)
        VALUES (${leadId}, NOW(), ${call_result}, ${call_notes || ''})
      `;

      // Bei Termin: Lead auf 'Booked' setzen
      if (call_result === 'appointment') {
        await sql`
          UPDATE leads SET
            pipeline_stage = 'Booked',
            sequence_status = 'completed',
            pipeline_notes = CONCAT(
              COALESCE(pipeline_notes, ''),
              ' | Termin per Telefon gebucht am ', NOW()::text
            )
          WHERE id = ${leadId}
        `;
      }

      // Bei falscher Nummer: Telefon entfernen
      if (call_result === 'wrong_number') {
        await sql`
          UPDATE leads SET
            phone = NULL,
            pipeline_notes = CONCAT(
              COALESCE(pipeline_notes, ''),
              ' | Falsche Telefonnummer am ', NOW()::text
            )
          WHERE id = ${leadId}
        `;
      }
    }

    return NextResponse.json({
      ok: true,
      id: entryId,
      lead_id: leadId,
      status: status || 'unchanged',
      call_result: call_result || 'unchanged',
    });
  } catch (error) {
    console.error('Anrufliste PATCH error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/anrufliste/[id]
 * Eintrag von der Anrufliste entfernen
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const entryId = parseInt(params.id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 });
    }

    await sql`DELETE FROM call_queue WHERE id = ${entryId}`;

    return NextResponse.json({ ok: true, deleted: entryId });
  } catch (error) {
    console.error('Anrufliste DELETE error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Loeschen' },
      { status: 500 }
    );
  }
}
