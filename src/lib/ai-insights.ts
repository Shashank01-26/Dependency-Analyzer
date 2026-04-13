import Groq from 'groq-sdk';
import { ScanResult, AIInsight, AnalyzedDependency } from '@/types';

/**
 * Uses Groq's free API with Gemma model to generate human-readable insights.
 * Groq offers free tier access to Gemma 2 models with fast inference.
 *
 * Get a free API key at: https://console.groq.com
 */

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function buildAnalysisPrompt(scan: ScanResult): string {
  const riskySorted = [...scan.dependencies]
    .sort((a, b) => b.score.overall - a.score.overall)
    .slice(0, 15);

  const depSummaries = riskySorted.map((dep) => {
    const flags = dep.flags.map(f => f.label).join(', ');
    return [
      `- ${dep.name}@${dep.version}: risk=${dep.score.overall}/100 (${dep.riskLevel})`,
      `  Maintenance: ${dep.score.maintenance}, Security: ${dep.score.security}, Popularity: ${dep.score.popularity}`,
      `  Downloads/week: ${dep.npm?.weeklyDownloads?.toLocaleString() || 'unknown'}`,
      `  Last published: ${dep.npm?.lastPublish || 'unknown'}`,
      `  Maintainers: ${dep.npm?.maintainers ?? 'unknown'}`,
      `  Flags: ${flags || 'none'}`,
      `  Vulnerabilities: ${dep.vulnerabilities.length}`,
      `  Transitive deps: ${dep.transitiveCount}, Max depth: ${dep.depth}`,
    ].join('\n');
  });

  return `You are a senior software security analyst. Analyze these npm dependencies and provide actionable insights.

PROJECT: ${scan.projectName}
OVERALL RISK SCORE: ${scan.overallScore}/100 (${scan.overallRiskLevel})
Total deps: ${scan.totalDependencies} (${scan.directDependencies} direct, ${scan.devDependencies} dev)
Critical: ${scan.criticalCount}, High: ${scan.highCount}, Medium: ${scan.mediumCount}, Low: ${scan.lowCount}

TOP RISK DEPENDENCIES:
${depSummaries.join('\n\n')}

Provide your analysis as a JSON array of insight objects. Each object must have:
- "packageName": string or null (null for project-level insights)
- "type": "risk" | "recommendation" | "alternative" | "summary"
- "title": string (short, actionable title)
- "description": string (2-3 sentences explaining the insight in human terms)
- "severity": "low" | "medium" | "high" | "critical" (only for risk type)
- "alternative": string or null (only for alternative type — suggest a replacement package)

Generate 6-10 insights covering:
1. A project summary insight
2. The highest-risk dependencies with explanations of WHY they're risky
3. Specific recommendations to reduce risk
4. Alternative packages where applicable

Respond ONLY with the JSON array, no other text.`;
}

function buildFallbackInsights(scan: ScanResult): AIInsight[] {
  const insights: AIInsight[] = [];

  // Project summary
  insights.push({
    type: 'summary',
    title: 'Project Risk Overview',
    description: `Your project has ${scan.totalDependencies} dependencies with an overall risk score of ${scan.overallScore}/100. ${scan.criticalCount} packages are critical risk and ${scan.highCount} are high risk. ${scan.overallScore >= 45 ? 'Immediate attention is recommended.' : 'The project is in reasonable health.'}`,
  });

  // Flag risky deps
  const risky = scan.dependencies
    .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
    .sort((a, b) => b.score.overall - a.score.overall);

  for (const dep of risky.slice(0, 5)) {
    const daysSince = dep.npm
      ? Math.floor((Date.now() - new Date(dep.npm.lastPublish).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const reasons: string[] = [];
    if (daysSince && daysSince > 365) reasons.push(`hasn't been updated in ${Math.floor(daysSince / 365)} years`);
    if (dep.vulnerabilities.length > 0) reasons.push(`has ${dep.vulnerabilities.length} known vulnerabilities`);
    if (dep.npm && dep.npm.maintainers <= 1) reasons.push('has only 1 maintainer');
    if (dep.transitiveCount > 20) reasons.push(`pulls in ${dep.transitiveCount} transitive dependencies`);

    insights.push({
      packageName: dep.name,
      type: 'risk',
      title: `${dep.name} is ${dep.riskLevel} risk`,
      description: reasons.length > 0
        ? `This package ${reasons.join(', ')}. Consider evaluating alternatives or pinning to a known-safe version.`
        : `This package scored ${dep.score.overall}/100 on our risk assessment. Review its maintenance status and security posture.`,
      severity: dep.riskLevel,
    });
  }

  // General recommendations
  if (scan.criticalCount > 0) {
    insights.push({
      type: 'recommendation',
      title: 'Address Critical Dependencies',
      description: `You have ${scan.criticalCount} critical-risk dependencies. Prioritize replacing or updating these packages to reduce your project's attack surface.`,
    });
  }

  if (scan.dependencies.some(d => d.flags.some(f => f.type === 'single-maintainer'))) {
    insights.push({
      type: 'recommendation',
      title: 'Bus Factor Risk',
      description: 'Several of your dependencies have only one maintainer. If that person becomes unavailable, these packages may stop receiving updates and security patches.',
    });
  }

  return insights;
}

export async function generateInsights(scan: ScanResult): Promise<AIInsight[]> {
  const client = getGroqClient();

  if (!client) {
    // Return rule-based fallback insights when no API key is configured
    return buildFallbackInsights(scan);
  }

  try {
    const prompt = buildAnalysisPrompt(scan);

    const completion = await client.chat.completions.create({
      model: 'gemma3-27b-it',
      messages: [
        {
          role: 'system',
          content: 'You are a senior software security analyst. You respond ONLY with valid JSON arrays. No markdown, no code fences, just raw JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Parse JSON from response, handling potential markdown code fences
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonStr) as AIInsight[];

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('AI insight generation failed, using fallback:', err);
  }

  return buildFallbackInsights(scan);
}
