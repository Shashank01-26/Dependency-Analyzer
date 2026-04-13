import { NextRequest, NextResponse } from 'next/server';
import { analyzePackageJson } from '@/lib/analyzer';
import { PackageJson } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let packageJson: PackageJson;

    if (body.packageJson) {
      // Direct JSON object
      packageJson = body.packageJson;
    } else if (body.raw) {
      // Raw pasted text
      packageJson = JSON.parse(body.raw);
    } else {
      return NextResponse.json(
        { error: 'Provide either packageJson object or raw JSON string' },
        { status: 400 }
      );
    }

    if (!packageJson.dependencies && !packageJson.devDependencies) {
      return NextResponse.json(
        { error: 'No dependencies found in the provided package.json' },
        { status: 400 }
      );
    }

    const result = await analyzePackageJson(packageJson);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Analysis failed:', err);
    const message = err instanceof SyntaxError
      ? 'Invalid JSON format'
      : 'Analysis failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
