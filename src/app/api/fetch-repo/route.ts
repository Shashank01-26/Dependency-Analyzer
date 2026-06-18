import { NextRequest, NextResponse } from 'next/server';

// Files to try fetching from a repo, in priority order
const MANIFEST_CANDIDATES = [
  { path: 'package.json', ecosystem: 'npm' },
  { path: 'package-lock.json', ecosystem: 'npm' },
  { path: 'yarn.lock', ecosystem: 'npm' },
  { path: 'pnpm-lock.yaml', ecosystem: 'npm' },
  { path: 'pubspec.yaml', ecosystem: 'flutter' },
  { path: 'Cargo.lock', ecosystem: 'rust' },
  { path: 'Cargo.toml', ecosystem: 'rust' },
  { path: 'go.mod', ecosystem: 'go' },
  { path: 'go.sum', ecosystem: 'go' },
  { path: 'requirements.txt', ecosystem: 'python' },
  { path: 'pyproject.toml', ecosystem: 'python' },
  { path: 'poetry.lock', ecosystem: 'python' },
  { path: 'Gemfile.lock', ecosystem: 'ruby' },
  { path: 'Gemfile', ecosystem: 'ruby' },
  { path: 'build.gradle', ecosystem: 'android' },
  { path: 'app/build.gradle', ecosystem: 'android' },
];

function parseGithubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  // https://github.com/owner/repo or https://github.com/owner/repo/tree/branch
  const match = url.match(/github\.com\/([^/]+)\/([^/?\s]+)(?:\/tree\/([^/?\s]+))?/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, ''), branch: match[3] };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Provide a GitHub repository URL' }, { status: 400 });
    }

    const parsed = parseGithubUrl(url);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub URL. Use: https://github.com/owner/repo' }, { status: 400 });
    }

    const { owner, repo, branch } = parsed;
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3.raw',
      'User-Agent': 'dep-analyzer/1.0',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Resolve default branch if not specified
    let targetBranch = branch;
    if (!targetBranch) {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { ...headers, 'Accept': 'application/vnd.github.v3+json' },
      });
      if (!repoRes.ok) {
        return NextResponse.json({ error: 'Repository not found or not accessible' }, { status: 404 });
      }
      const repoData = await repoRes.json();
      targetBranch = repoData.default_branch ?? 'main';
    }

    // Try each manifest file in order
    for (const candidate of MANIFEST_CANDIDATES) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${targetBranch}/${candidate.path}`;
      const res = await fetch(rawUrl, { headers });
      if (res.ok) {
        const content = await res.text();
        return NextResponse.json({
          raw: content,
          ecosystem: candidate.ecosystem,
          filename: candidate.path,
          repo: `${owner}/${repo}`,
          branch: targetBranch,
        });
      }
    }

    return NextResponse.json(
      { error: 'No supported manifest file found in this repository (tried package.json, Cargo.lock, go.mod, requirements.txt, pubspec.yaml, and more)' },
      { status: 404 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch repository';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
