import Groq from 'groq-sdk';
import { ScanResult, AIInsight } from '@/types';

/**
 * Uses Groq's free API with Llama 3.3 70B model to generate human-readable insights.
 * Get a free API key at: https://console.groq.com
 */

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function buildPrompt(scan: ScanResult): string {
  const riskySorted = [...scan.dependencies]
    .sort((a, b) => b.score.overall - a.score.overall)
    .slice(0, 15);

  const depSummaries = riskySorted.map((dep) => {
    const flags = dep.flags.map(f => `${f.label}: ${f.detail}`).join('; ');
    return [
      `- **${dep.name}@${dep.version}**: risk=${dep.score.overall}/100 (${dep.riskLevel})`,
      `  Scores: maintenance=${dep.score.maintenance}, security=${dep.score.security}, popularity=${dep.score.popularity}, community=${dep.score.community}, depth=${dep.score.depthRisk}`,
      `  Downloads/week: ${dep.npm?.weeklyDownloads?.toLocaleString() || 'unknown'}, Maintainers: ${dep.npm?.maintainers ?? 'unknown'}`,
      `  Last published: ${dep.npm?.lastPublish || 'unknown'}`,
      dep.npm?.deprecation ? `  DEPRECATED: ${dep.npm.deprecation}` : null,
      `  Vulnerabilities: ${dep.vulnerabilities.length}`,
      `  Transitive deps: ${dep.transitiveCount}, Max depth: ${dep.depth}`,
      flags ? `  Flags: ${flags}` : null,
    ].filter(Boolean).join('\n');
  });

  return `You are a senior software security analyst reviewing npm dependencies for a development team. Provide specific, actionable insights.

PROJECT: "${scan.projectName}"
OVERALL RISK SCORE: ${scan.overallScore}/100 (${scan.overallRiskLevel})
Total dependencies: ${scan.totalDependencies} (${scan.directDependencies} direct, ${scan.devDependencies} dev)
Risk breakdown: ${scan.criticalCount} critical, ${scan.highCount} high, ${scan.mediumCount} medium, ${scan.lowCount} low

TOP DEPENDENCIES BY RISK:
${depSummaries.join('\n\n')}

Generate a JSON array of 6-10 insight objects. Each object MUST have these exact fields:
{
  "packageName": string | null,  // null for project-level insights
  "type": "risk" | "recommendation" | "alternative" | "summary",
  "title": string,               // short, specific title
  "description": string,         // 2-3 sentences, use real numbers from the data
  "severity": "low" | "medium" | "high" | "critical" | null,  // only for "risk" type
  "alternative": string | null   // only for "alternative" type, name a specific replacement package
}

RULES:
1. First insight MUST be type "summary" giving an overall project health assessment
2. For risky packages, explain WHY in plain English using the actual data (e.g., "hasn't been updated since 2020", "only 1 maintainer")
3. For deprecated packages, ALWAYS suggest a modern alternative
4. Be specific — use real package names, real numbers, real dates
5. If the project looks healthy, say so! Don't invent problems.

Respond ONLY with the JSON array. No markdown fences, no explanations.`;
}

export async function generateInsights(scan: ScanResult): Promise<AIInsight[]> {
  const client = getGroqClient();

  if (!client) {
    console.warn('GROQ_API_KEY not set — returning basic fallback insights');
    return buildFallbackInsights(scan);
  }

  try {
    const prompt = buildPrompt(scan);

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 2500,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Parse JSON — strip markdown fences if the model wraps them
    const jsonStr = content
      .replace(/```json?\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate and sanitize each insight
      return parsed.map((item: Record<string, unknown>) => ({
        packageName: typeof item.packageName === 'string' ? item.packageName : undefined,
        type: (['risk', 'recommendation', 'alternative', 'summary'].includes(item.type as string)
          ? item.type : 'recommendation') as AIInsight['type'],
        title: String(item.title || 'Insight'),
        description: String(item.description || ''),
        severity: item.severity ? String(item.severity) as AIInsight['severity'] : undefined,
        alternative: typeof item.alternative === 'string' ? item.alternative : undefined,
      }));
    }

    console.error('LLM returned non-array or empty, falling back');
  } catch (err) {
    console.error('Groq API call failed:', err);
  }

  // Only fall back if LLM completely fails
  return buildFallbackInsights(scan);
}

/**
 * Rule-based fallback when no API key is set or the LLM call fails.
 */
function buildFallbackInsights(scan: ScanResult): AIInsight[] {
  const insights: AIInsight[] = [];

  insights.push({
    type: 'summary',
    title: 'Project Risk Overview',
    description: `Your project has ${scan.totalDependencies} dependencies with an overall risk score of ${scan.overallScore}/100. ${scan.criticalCount} critical and ${scan.highCount} high-risk packages detected. ${scan.overallScore >= 45 ? 'Immediate attention recommended.' : 'Project is in reasonable health.'}`,
  });

  const risky = scan.dependencies
    .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
    .sort((a, b) => b.score.overall - a.score.overall);

  for (const dep of risky.slice(0, 5)) {
    const daysSince = dep.npm
      ? Math.floor((Date.now() - new Date(dep.npm.lastPublish).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const reasons: string[] = [];
    if (dep.npm?.deprecation) reasons.push('is deprecated');
    if (daysSince && daysSince > 365) reasons.push(`last updated ${Math.floor(daysSince / 365)}+ years ago`);
    if (dep.vulnerabilities.length > 0) reasons.push(`has ${dep.vulnerabilities.length} known vulnerabilities`);
    if (dep.npm && dep.npm.maintainers <= 1) reasons.push('has only 1 maintainer');

    insights.push({
      packageName: dep.name,
      type: 'risk',
      title: `${dep.name} — ${dep.riskLevel} risk (${dep.score.overall}/100)`,
      description: reasons.length > 0
        ? `This package ${reasons.join(', ')}. Review and consider replacing it.`
        : `Scored ${dep.score.overall}/100. Review its maintenance and security posture.`,
      severity: dep.riskLevel,
    });
  }

  if (scan.criticalCount > 0) {
    insights.push({
      type: 'recommendation',
      title: 'Replace Critical Dependencies',
      description: `${scan.criticalCount} dependencies are critical risk. Prioritize replacing deprecated and unmaintained packages to reduce your attack surface.`,
    });
  }

  return insights;
}
