import { NextRequest, NextResponse } from 'next/server';

const MANIFEST_CANDIDATES = [
  { path: 'package.json',      ecosystem: 'npm' },
  { path: 'package-lock.json', ecosystem: 'npm' },
  { path: 'yarn.lock',         ecosystem: 'npm' },
  { path: 'pnpm-lock.yaml',    ecosystem: 'npm' },
  { path: 'pubspec.yaml',      ecosystem: 'flutter' },
  { path: 'Cargo.lock',        ecosystem: 'rust' },
  { path: 'Cargo.toml',        ecosystem: 'rust' },
  { path: 'go.mod',            ecosystem: 'go' },
  { path: 'requirements.txt',  ecosystem: 'python' },
  { path: 'pyproject.toml',    ecosystem: 'python' },
  { path: 'poetry.lock',       ecosystem: 'python' },
  { path: 'Gemfile.lock',      ecosystem: 'ruby' },
  { path: 'build.gradle',      ecosystem: 'android' },
  { path: 'app/build.gradle',  ecosystem: 'android' },
];

function parseGithubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/?\s#]+)(?:\/tree\/([^/?\s#]+))?/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, ''), branch: match[3] };
}

function rawHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'User-Agent': 'dep-analyzer/1.0' };
  const token = process.env.GITHUB_TOKEN;
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function tryBranch(owner: string, repo: string, branch: string) {
  const headers = rawHeaders();

  // Fan out all candidate fetches in parallel for this branch
  const results = await Promise.all(
    MANIFEST_CANDIDATES.map(async (candidate) => {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${candidate.path}`;
      try {
        const res = await fetch(url, { headers });
        if (res.ok) {
          const content = await res.text();
          // Sanity-check: raw.githubusercontent.com sometimes returns HTML error pages with 200
          if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) return null;
          return { content, candidate, branch };
        }
      } catch { /* network error — skip */ }
      return null;
    })
  );

  // Return the first hit in priority order (Promise.all preserves order)
  return results.find(r => r !== null) ?? null;
}

async function resolveDefaultBranch(owner: string, repo: string): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'dep-analyzer/1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  return data.default_branch ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url: string = body?.url ?? '';

    if (!url) {
      return NextResponse.json({ error: 'Provide a GitHub repository URL' }, { status: 400 });
    }

    const parsed = parseGithubUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL. Expected format: https://github.com/owner/repo' },
        { status: 400 }
      );
    }

    const { owner, repo, branch } = parsed;

    // If branch is explicit, try it directly
    if (branch) {
      const hit = await tryBranch(owner, repo, branch);
      if (hit) {
        return NextResponse.json({
          raw: hit.content,
          ecosystem: hit.candidate.ecosystem,
          filename: hit.candidate.path,
          repo: `${owner}/${repo}`,
          branch,
        });
      }
      return NextResponse.json(
        { error: `No supported manifest file found in ${owner}/${repo} on branch "${branch}". Tried package.json, Cargo.lock, go.mod, requirements.txt, pubspec.yaml, and more.` },
        { status: 404 }
      );
    }

    // Try main and master in parallel first — avoids a GitHub API round-trip for most repos
    const [mainHit, masterHit] = await Promise.all([
      tryBranch(owner, repo, 'main'),
      tryBranch(owner, repo, 'master'),
    ]);

    const directHit = mainHit ?? masterHit;
    if (directHit) {
      return NextResponse.json({
        raw: directHit.content,
        ecosystem: directHit.candidate.ecosystem,
        filename: directHit.candidate.path,
        repo: `${owner}/${repo}`,
        branch: directHit.branch,
      });
    }

    // Fall back to GitHub API to get actual default branch (e.g. "dev", "trunk", "develop")
    const defaultBranch = await resolveDefaultBranch(owner, repo);

    if (!defaultBranch) {
      return NextResponse.json(
        { error: `Repository "${owner}/${repo}" not found, is private, or GitHub rate limit reached. Add a GITHUB_TOKEN env var to increase limits.` },
        { status: 404 }
      );
    }

    if (defaultBranch !== 'main' && defaultBranch !== 'master') {
      const fallbackHit = await tryBranch(owner, repo, defaultBranch);
      if (fallbackHit) {
        return NextResponse.json({
          raw: fallbackHit.content,
          ecosystem: fallbackHit.candidate.ecosystem,
          filename: fallbackHit.candidate.path,
          repo: `${owner}/${repo}`,
          branch: defaultBranch,
        });
      }
    }

    return NextResponse.json(
      { error: `No supported manifest file found at the root of "${owner}/${repo}". The repo may store its manifest in a subdirectory. Try pasting the file contents directly.` },
      { status: 404 }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch repository';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
