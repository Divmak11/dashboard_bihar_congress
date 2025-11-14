// app/utils/assemblyNameUtils.ts
// Helpers for normalizing and matching Assembly names across datasets

import aliases from '@/data/assemblyAliases.json';

export function normalizeAssemblyName(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input).trim();

  // Normalize unicode diacritics
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Lowercase
  s = s.toLowerCase();

  // Replace fancy quotes and dashes
  s = s.replace(/[’‘`]/g, "'").replace(/[–—]/g, '-');

  // Remove common suffixes like (SC), (ST), (General)
  s = s.replace(/\((sc|st|general)\)/gi, '');

  // Remove remaining parentheses and punctuation except spaces and hyphens
  s = s.replace(/[()\[\]{}.,]/g, ' ');

  // Convert hyphens/underscores to spaces
  s = s.replace(/[-_]+/g, ' ');

  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

export function generateAssemblyVariants(input: string): string[] {
  const base = normalizeAssemblyName(input);
  const variants = new Set<string>();
  variants.add(base);
  // A variant with all spaces removed (to tolerate tight concatenations)
  variants.add(base.replace(/\s+/g, ''));
  // A variant with single hyphen between tokens
  variants.add(base.replace(/\s+/g, '-'));
  return Array.from(variants);
}

// Jaro-Winkler similarity (0..1). Implementation adapted for short strings.
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  a = a || '';
  b = b || '';
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0 || bLen === 0) return 0;

  const matchDistance = Math.floor(Math.max(aLen, bLen) / 2) - 1;
  const aMatches: boolean[] = new Array(aLen).fill(false);
  const bMatches: boolean[] = new Array(bLen).fill(false);

  let matches = 0;
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions = transpositions / 2;

  const m = matches;
  const jaro = (m / aLen + m / bLen + (m - transpositions) / m) / 3;

  // Winkler boost for common prefix up to 4 chars
  let prefix = 0;
  for (let i = 0; i < Math.min(4, aLen, bLen); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  const scalingFactor = 0.1; // standard
  return jaro + prefix * scalingFactor * (1 - jaro);
}

// Return curated aliases (raw strings) for a canonical normalized key, if available
export function getAliasesForAssembly(input: string): string[] {
  const base = normalizeAssemblyName(input);
  const list = (aliases as Record<string, string[]>) [base] || [];
  return list;
}

// Generate candidate normalized keys for matching: base + alias variants + spacing/hyphen variants
export function generateCandidateKeys(input: string): string[] {
  const base = normalizeAssemblyName(input);
  const fromBase = generateAssemblyVariants(base);
  const aliasList = getAliasesForAssembly(input);
  const aliasVariants = aliasList.flatMap((a) => generateAssemblyVariants(a));
  const set = new Set<string>([...fromBase, ...aliasVariants]);
  return Array.from(set);
}

// Utility: choose the best matching key from a set of dataset keys, given candidate keys
export function bestMatchKey(datasetKeys: Iterable<string>, candidateKeys: string[]): { key: string | null; score: number } {
  let bestKey: string | null = null;
  let bestScore = -1;
  const candidateSet = new Set(candidateKeys);
  for (const k of datasetKeys) {
    if (candidateSet.has(k)) {
      // Exact normalized match with a candidate
      return { key: k, score: 1 };
    }
    // Otherwise compute best similarity against candidate keys
    for (const c of candidateSet) {
      const s = jaroWinkler(k, c);
      if (s > bestScore) {
        bestScore = s;
        bestKey = k;
      }
    }
  }
  return { key: bestKey, score: bestScore };
}
