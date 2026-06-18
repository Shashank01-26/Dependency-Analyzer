import { ScanResult } from '@/types';

const MAX_DEPS_IN_SHARE = 50;

/** Compress a ScanResult into a URL-safe base64 string using browser CompressionStream */
export async function encodeScan(result: ScanResult): Promise<string> {
  let payload = result;

  // If too large, include only the riskiest deps
  if (result.dependencies.length > MAX_DEPS_IN_SHARE) {
    const sorted = [...result.dependencies].sort((a, b) => b.score.overall - a.score.overall);
    payload = { ...result, dependencies: sorted.slice(0, MAX_DEPS_IN_SHARE), tree: [] };
  }

  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const compressed = await new Response(cs.readable).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(compressed)));
  }

  // Fallback: no compression, just base64
  return btoa(String.fromCharCode(...bytes));
}

/** Decode a base64 string back into a ScanResult */
export async function decodeScan(encoded: string): Promise<ScanResult> {
  const binaryStr = atob(encoded);
  const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));

  if (typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const decompressed = await new Response(ds.readable).arrayBuffer();
      const json = new TextDecoder().decode(decompressed);
      return JSON.parse(json);
    } catch {
      // Fall through to uncompressed path
    }
  }

  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
}

export function buildShareUrl(encoded: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.hash = `share=${encoded}`;
  url.search = '';
  return url.toString();
}

export function extractShareHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  const match = hash.match(/^#share=(.+)$/);
  return match ? match[1] : null;
}
