import { GithubMetadata } from '@/types';

const cache = new Map<string, GithubMetadata>();

function extractGithubRepo(repoUrl?: string): { owner: string; repo: string } | null {
  if (!repoUrl) return null;

  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^/]+)\/([^/\s#?]+)/,
    /github\.com:([^/]+)\/([^/\s#?.]+)/,
  ];

  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }
  return null;
}

export async function fetchGithubMetadata(repoUrl?: string): Promise<GithubMetadata | null> {
  const repo = extractGithubRepo(repoUrl);
  if (!repo) return null;

  const cacheKey = `${repo.owner}/${repo.repo}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, {
      headers,
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();

    const metadata: GithubMetadata = {
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      openIssues: data.open_issues_count || 0,
      lastCommit: data.pushed_at || data.updated_at || '',
      contributors: 0, // Would need separate API call
      archived: data.archived || false,
      license: data.license?.spdx_id || undefined,
      watchers: data.subscribers_count || 0,
    };

    cache.set(cacheKey, metadata);
    return metadata;
  } catch (err) {
    console.error(`Failed to fetch GitHub metadata for ${repoUrl}:`, err);
    return null;
  }
}
