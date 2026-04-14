import Groq from 'groq-sdk';
import { ScanResult, AIInsight } from '@/types';

function getGroqClient(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

function buildPrompt(scan: ScanResult): string {
  // Include ALL dependencies, not just top 15
  const allDeps = [...scan.dependencies]
    .sort((a, b) => b.score.overall - a.score.overall);

  const depSummaries = allDeps.map((dep) => {
    const flags = dep.flags.map(f => `${f.label}: ${f.detail}`).join('; ');
    const parts = [
      `• ${dep.name}@${dep.version} [${dep.isDev ? 'dev' : 'prod'}]: risk=${dep.score.overall}/100 (${dep.riskLevel})`,
      `  maintenance=${dep.score.maintenance}, security=${dep.score.security}, popularity=${dep.score.popularity}, community=${dep.score.community}, depth=${dep.score.depthRisk}`,
      `  downloads/wk: ${dep.npm?.weeklyDownloads?.toLocaleString() || '?'}, maintainers: ${dep.npm?.maintainers ?? '?'}, last publish: ${dep.npm?.lastPublish?.split('T')[0] || '?'}`,
    ];
    if (dep.npm?.deprecation) parts.push(`  ⛔ DEPRECATED: ${dep.npm.deprecation}`);
    if (dep.vulnerabilities.length > 0) parts.push(`  🔥 ${dep.vulnerabilities.length} vulnerabilities`);
    if (dep.transitiveCount > 5) parts.push(`  transitive deps: ${dep.transitiveCount}, max depth: ${dep.depth}`);
    if (flags) parts.push(`  flags: ${flags}`);
    return parts.join('\n');
  });

  return `You are a senior software security analyst and dependency auditor. A development team has scanned their project and needs a COMPREHENSIVE review.

═══ PROJECT SCAN RESULTS ═══
Project: "${scan.projectName}"
Overall Risk: ${scan.overallScore}/100 (${scan.overallRiskLevel})
Total: ${scan.totalDependencies} deps (${scan.directDependencies} production, ${scan.devDependencies} dev)
Breakdown: ${scan.criticalCount} critical, ${scan.highCount} high, ${scan.mediumCount} medium, ${scan.lowCount} low

═══ ALL DEPENDENCIES ═══
${depSummaries.join('\n\n')}

═══ YOUR TASK ═══
Generate a COMPREHENSIVE analysis as a JSON array. Cover ALL of these categories:

1. **PROJECT SUMMARY** (type: "summary") — Overall health assessment. Mention the total count, risk distribution, and whether this project needs urgent attention or is healthy. Be specific with numbers.

2. **DEPRECATED PACKAGES** (type: "risk") — For EVERY deprecated package, explain what it is, why it's deprecated, and what the risk is. Don't skip any.

3. **UNMAINTAINED/STALE PACKAGES** (type: "risk") — For packages not updated in 1+ years, explain the maintenance gap and what could go wrong.

4. **SECURITY VULNERABILITIES** (type: "risk") — Any packages with known CVEs. Explain what the vulnerabilities mean in plain English.

5. **BUS FACTOR RISKS** (type: "risk") — Single-maintainer packages. Explain why this matters for production code.

6. **DEPENDENCY CHAIN RISKS** (type: "risk") — Packages with deep transitive trees. Explain supply chain risk.

7. **LOW POPULARITY CONCERNS** (type: "risk") — Packages with very few downloads. Explain the vetting risk.

8. **MODERN ALTERNATIVES** (type: "alternative") — For EVERY risky/deprecated package, suggest a specific modern replacement. Include the alternative package name.

9. **ACTIONABLE RECOMMENDATIONS** (type: "recommendation") — Concrete steps the team should take. Prioritize by impact. Include things like:
   - "Pin versions for X, Y, Z"
   - "Run npm audit fix"
   - "Replace deprecated packages before next release"
   - "Add automated dependency checking to CI"
   - "Consider using a lockfile audit tool"

10. **POSITIVE FINDINGS** (type: "summary") — What's GOOD about this project? Which dependencies are well-maintained? This builds trust in the report.

═══ FORMAT ═══
JSON array of objects with these exact fields:
{
  "packageName": string | null,
  "type": "risk" | "recommendation" | "alternative" | "summary",
  "title": string,
  "description": string (2-4 sentences, cite real data),
  "severity": "low" | "medium" | "high" | "critical" | null,
  "alternative": string | null
}

Generate 12-20 insights. Be thorough — cover every problematic package individually. Use real numbers from the data. If something is healthy, say so.

Respond ONLY with the raw JSON array. No markdown, no code fences, no other text.`;
}

export async function generateInsights(scan: ScanResult): Promise<AIInsight[]> {
  const client = getGroqClient();

  if (!client) {
    console.warn('GROQ_API_KEY not set — returning fallback insights');
    return buildFallbackInsights(scan);
  }

  try {
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a dependency security analyst. You respond ONLY with valid JSON arrays. Never wrap in markdown. Never add explanations outside the JSON.',
        },
        { role: 'user', content: buildPrompt(scan) },
      ],
      temperature: 0.35,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content || '';
    const jsonStr = content.replace(/```json?\s*/gi, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed) && parsed.length > 0) {
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

    console.error('LLM returned non-array, falling back');
  } catch (err) {
    console.error('Groq API failed:', err);
  }

  return buildFallbackInsights(scan);
}

/**
 * Comprehensive rule-based fallback when LLM is unavailable.
 */
function buildFallbackInsights(scan: ScanResult): AIInsight[] {
  const insights: AIInsight[] = [];

  // 1. Summary
  insights.push({
    type: 'summary',
    title: 'Project Risk Overview',
    description: `Your project "${scan.projectName}" has ${scan.totalDependencies} dependencies (${scan.directDependencies} production, ${scan.devDependencies} dev) with an overall risk score of ${scan.overallScore}/100. ${scan.criticalCount} critical, ${scan.highCount} high, ${scan.mediumCount} medium, and ${scan.lowCount} low-risk packages detected. ${scan.overallScore >= 50 ? 'This project needs immediate attention — prioritize replacing critical dependencies.' : scan.overallScore >= 30 ? 'Some packages need review, but the project is in fair shape.' : 'The project dependency health looks good overall.'}`,
  });

  // 2. Individual package risks
  const risky = scan.dependencies
    .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
    .sort((a, b) => b.score.overall - a.score.overall);

  for (const dep of risky) {
    const daysSince = dep.npm
      ? Math.floor((Date.now() - new Date(dep.npm.lastPublish).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const reasons: string[] = [];
    if (dep.npm?.deprecation) reasons.push('is officially deprecated');
    if (daysSince && daysSince > 730) reasons.push(`hasn't been updated in ${Math.floor(daysSince / 365)} years`);
    else if (daysSince && daysSince > 365) reasons.push(`last updated over a year ago`);
    if (dep.vulnerabilities.length > 0) reasons.push(`has ${dep.vulnerabilities.length} known security vulnerabilities`);
    if (dep.npm && dep.npm.maintainers <= 1) reasons.push('has only 1 maintainer (bus factor risk)');
    if (dep.transitiveCount > 20) reasons.push(`pulls in ${dep.transitiveCount} transitive dependencies`);
    if (dep.npm && dep.npm.weeklyDownloads < 1000) reasons.push(`has only ${dep.npm.weeklyDownloads.toLocaleString()} weekly downloads`);

    insights.push({
      packageName: dep.name,
      type: 'risk',
      title: `${dep.name} — ${dep.riskLevel} risk (score: ${dep.score.overall})`,
      description: reasons.length > 0
        ? `${dep.name}@${dep.version} ${reasons.join(', ')}. This is a ${dep.isDev ? 'dev' : 'production'} dependency that should be reviewed and potentially replaced.`
        : `This package scored ${dep.score.overall}/100 on our risk assessment across maintenance, security, popularity, and community health metrics.`,
      severity: dep.riskLevel,
    });
  }

  // 3. Alternatives for deprecated
  const deprecated = scan.dependencies.filter(d => d.npm?.deprecation);
  const altMap: Record<string, string> = {
    'request': 'node-fetch or axios',
    'jade': 'pug',
    'node-uuid': 'uuid',
    'coffee-script': 'TypeScript',
    'istanbul': 'c8 or nyc',
    'bower': 'npm or pnpm',
    'nomnom': 'commander or yargs',
    'gulp': 'esbuild or Vite',
    'grunt': 'npm scripts or esbuild',
    'sails': 'Fastify or NestJS',
  };

  for (const dep of deprecated) {
    const alt = altMap[dep.name];
    if (alt) {
      insights.push({
        packageName: dep.name,
        type: 'alternative',
        title: `Replace ${dep.name} with ${alt}`,
        description: `${dep.name} is deprecated${dep.npm?.deprecation ? `: "${dep.npm.deprecation}"` : ''}. ${alt} is actively maintained, has better security, and is the community-recommended replacement.`,
        alternative: alt,
      });
    }
  }

  // 4. Recommendations
  if (scan.criticalCount > 0) {
    insights.push({
      type: 'recommendation',
      title: 'Urgent: Replace Critical Dependencies',
      description: `${scan.criticalCount} dependencies are critical risk. These should be replaced before the next production release. Start with deprecated packages as they have clear drop-in alternatives.`,
    });
  }

  const singleMaintainer = scan.dependencies.filter(d => d.npm && d.npm.maintainers <= 1 && !d.isDev);
  if (singleMaintainer.length > 0) {
    insights.push({
      type: 'recommendation',
      title: 'Bus Factor: Single-Maintainer Packages',
      description: `${singleMaintainer.length} production dependencies have only 1 maintainer: ${singleMaintainer.slice(0, 4).map(d => d.name).join(', ')}${singleMaintainer.length > 4 ? ` and ${singleMaintainer.length - 4} more` : ''}. If that person becomes unavailable, these packages stop receiving security patches.`,
    });
  }

  insights.push({
    type: 'recommendation',
    title: 'Add Automated Dependency Auditing',
    description: `Set up automated dependency checking in your CI pipeline. Tools like npm audit, Snyk, or Renovate can catch new vulnerabilities as they're disclosed and create PRs for updates automatically.`,
  });

  // 5. Positive findings
  const healthy = scan.dependencies.filter(d => d.riskLevel === 'low');
  if (healthy.length > 0) {
    insights.push({
      type: 'summary',
      title: 'Healthy Dependencies',
      description: `${healthy.length} of your ${scan.totalDependencies} dependencies are low-risk: ${healthy.slice(0, 5).map(d => d.name).join(', ')}${healthy.length > 5 ? ` and ${healthy.length - 5} more` : ''}. These are well-maintained, popular, and have good security track records.`,
    });
  }

  return insights;
}
