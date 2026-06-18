import { LicenseInfo } from '@/types';

// SPDX license identifiers grouped by category
const STRONG_COPYLEFT = new Set([
  'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-2.0+',
  'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later', 'GPL-3.0+',
  'AGPL-1.0', 'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
  'EUPL-1.1', 'EUPL-1.2', 'OSL-3.0', 'SSPL-1.0',
]);

const WEAK_COPYLEFT = new Set([
  'LGPL-2.0', 'LGPL-2.0-only', 'LGPL-2.0-or-later', 'LGPL-2.0+',
  'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later', 'LGPL-2.1+',
  'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'LGPL-3.0+',
  'MPL-1.1', 'MPL-2.0', 'CDDL-1.0', 'CDDL-1.1', 'CPL-1.0',
  'EPL-1.0', 'EPL-2.0', 'EUPL-1.0', 'IPL-1.0',
]);

const PERMISSIVE = new Set([
  'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSD-4-Clause',
  'ISC', 'Unlicense', 'CC0-1.0', '0BSD', 'WTFPL', 'Zlib', 'PSF-2.0',
  'Python-2.0', 'Artistic-2.0', 'AFL-2.1', 'AFL-3.0', 'MS-PL', 'MS-RL',
  'BlueOak-1.0.0', 'Boost-1.0', 'BSL-1.0',
]);

// Normalize raw license strings to SPDX identifiers
function normalize(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^GPL(\d)$/, 'GPL-$1.0')
    .replace(/^LGPL(\d)$/, 'LGPL-$1.0')
    .replace(/^Apache\s?2(\.0)?$/i, 'Apache-2.0')
    .replace(/^MIT$/i, 'MIT')
    .replace(/^ISC$/i, 'ISC')
    .replace(/^BSD$/i, 'BSD-3-Clause')
    .replace(/^CC0$/i, 'CC0-1.0')
    .replace(/^Unlicensed$/i, 'Unlicense')
    .replace(/\(([^)]+)\)/g, '$1'); // strip parens from SPDX expressions
}

export function classifyLicense(raw: string): LicenseInfo {
  if (!raw || raw === 'UNKNOWN' || raw.toLowerCase() === 'see license') {
    return { spdx: 'Unknown', category: 'unknown', compatible: true };
  }

  // Handle SPDX expressions with OR / AND
  const parts = raw.split(/\s+(?:OR|AND)\s+/i).map(p => normalize(p.trim()));

  for (const spdx of parts) {
    if (STRONG_COPYLEFT.has(spdx)) {
      return { spdx, category: 'strong-copyleft', compatible: false };
    }
  }
  for (const spdx of parts) {
    if (WEAK_COPYLEFT.has(spdx)) {
      return { spdx: parts[0], category: 'weak-copyleft', compatible: true };
    }
  }
  for (const spdx of parts) {
    if (PERMISSIVE.has(spdx)) {
      return { spdx: parts[0], category: 'permissive', compatible: true };
    }
  }

  // Unknown license — be conservative, assume compatible but flag as unknown
  return { spdx: normalize(raw), category: 'unknown', compatible: true };
}

export function buildLicenseMatrix(
  licenses: { name: string; license: LicenseInfo | undefined }[]
): { conflicts: { a: string; b: string; reason: string }[] } {
  const conflicts: { a: string; b: string; reason: string }[] = [];
  const prodLicenses = licenses.filter(l => l.license);

  // GPL in production dep + MIT/Apache = conflict (GPL is viral)
  const hasStrongCopyleft = prodLicenses.filter(l => l.license?.category === 'strong-copyleft');
  const hasPermissive = prodLicenses.filter(l => l.license?.category === 'permissive');

  for (const gpl of hasStrongCopyleft) {
    for (const permissive of hasPermissive.slice(0, 3)) {
      conflicts.push({
        a: gpl.name,
        b: permissive.name,
        reason: `${gpl.license?.spdx} requires all combined work to be GPL — incompatible with ${permissive.license?.spdx}`,
      });
    }
    if (hasPermissive.length > 3) break; // cap output
  }

  return { conflicts };
}
