/**
 * GET /api/metrics
 *
 * Dashboard-V2 Metriken laut SALES-CONTROL-SPEC-2026-04-20.md Teil 1.1-1.5.
 * Gates: PS 2.1 Cost (nur SQL, kein LLM), PS 2.2 Scale (parallele Queries,
 * Indexe aus v9 + v10), PS 2.3 Extensibility (Sequenz-Typen zentral in
 * lib/metrics.ts, Konsistenz-Check ueber alle Branchen).
 *
 * 60-Sekunden-Cache laut Track-1-Prompt T1.2. Antwortet mit einem konsolidierten
 * JSON-Objekt, das vom Server-Component app/(dashboard)/dashboard-v2 konsumiert
 * wird. Auth via bestehendem next-auth-Session-Check.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  buildTimeWindows,
  calcConversionRate,
  checkConsistency,
} from '@/lib/metrics';
import {
  getLeadMetrics,
  getSequenceMetrics,
  getLinkedInMetrics,
  getCallMetrics,
  getBlockMetrics,
  getConsistencyInput,
} from '@/lib/metrics-queries';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const windows = buildTimeWindows();

  try {
    const [leads, sequences, linkedin, calls, blocks, consistencyInput] =
      await Promise.all([
        getLeadMetrics(windows),
        getSequenceMetrics(windows),
        getLinkedInMetrics(windows),
        getCallMetrics(windows),
        getBlockMetrics(windows),
        getConsistencyInput(),
      ]);

    const consistency = checkConsistency(
      consistencyInput.sectorBreakdown,
      consistencyInput.totalLeads
    );

    const conversionRate = {
      overall: calcConversionRate(
        linkedin.requestsSent.month,
        linkedin.requestsAccepted.month
      ),
      thisWeek: calcConversionRate(
        linkedin.requestsSent.thisWeek,
        linkedin.requestsAccepted.thisWeek
      ),
    };

    return NextResponse.json({
      windows,
      leads,
      sequences,
      linkedin: { ...linkedin, conversionRate },
      calls,
      blocks,
      consistency: {
        ...consistency,
        sectorBreakdown: consistencyInput.sectorBreakdown,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[metrics] query failed', error);
    return NextResponse.json(
      { error: 'Metrics query failed' },
      { status: 500 }
    );
  }
}
