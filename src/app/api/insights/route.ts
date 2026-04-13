import { NextRequest, NextResponse } from 'next/server';
import { generateInsights } from '@/lib/ai-insights';
import { ScanResult } from '@/types';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const scan: ScanResult = await req.json();

    if (!scan.dependencies || !Array.isArray(scan.dependencies)) {
      return NextResponse.json(
        { error: 'Invalid scan result format' },
        { status: 400 }
      );
    }

    const insights = await generateInsights(scan);
    return NextResponse.json({ insights });
  } catch (err) {
    console.error('Insight generation failed:', err);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
