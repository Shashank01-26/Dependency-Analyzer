import { NextRequest, NextResponse } from 'next/server';
import { analyzeInput } from '@/lib/analyzer';
import { parseInput } from '@/lib/input-parser';
import { Ecosystem } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.raw || typeof body.raw !== 'string') {
      return NextResponse.json({ error: 'Provide a raw string (package.json, pubspec.yaml, or build.gradle)' }, { status: 400 });
    }

    const ecosystem: Ecosystem | undefined = body.ecosystem;
    const parsed = parseInput(body.raw, ecosystem);
    const result = await analyzeInput(parsed);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Analysis failed:', err);
    const message = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
