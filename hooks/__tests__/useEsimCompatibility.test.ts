/**
 * useEsimCompatibility tests
 *
 * The hook itself is a thin react-query wrapper with no test-hook harness
 * (e.g. @testing-library/react-hooks) set up in this repo, so coverage here
 * targets partitionCompatibilityResults — the exported pure function that
 * does the actual compatibleEsims/vendorMismatches/checkErrors filtering the
 * hook returns. Per the CompatibilityResult spec, compatible/vendorMismatch/
 * checkError are mutually exclusive per-result flags.
 */

import { partitionCompatibilityResults } from '../useEsimCompatibility';
import type { CompatibilityResult } from '@/utils/bff/esim';

function result(overrides: Partial<CompatibilityResult> = {}): CompatibilityResult {
  return {
    esimId: '0xdef456abc123def456abc123def456abc123def4',
    iccid: '8944110068000000001',
    vendor: 'VENDOR1',
    compatible: false,
    vendorMismatch: false,
    checkError: false,
    ...overrides,
  };
}

describe('partitionCompatibilityResults', () => {
  it('returns empty slices when called with no results', () => {
    expect(partitionCompatibilityResults()).toEqual({
      compatibleEsims: [],
      vendorMismatches: [],
      checkErrors: [],
    });
  });

  it('returns empty slices for an empty results array', () => {
    expect(partitionCompatibilityResults([])).toEqual({
      compatibleEsims: [],
      vendorMismatches: [],
      checkErrors: [],
    });
  });

  it('puts a compatible result into compatibleEsims only', () => {
    const compatible = result({ esimId: 'esim-1', compatible: true });
    const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults([compatible]);
    expect(compatibleEsims).toEqual([compatible]);
    expect(vendorMismatches).toEqual([]);
    expect(checkErrors).toEqual([]);
  });

  it('puts a vendor-mismatched result into vendorMismatches only', () => {
    const mismatched = result({ esimId: 'esim-2', vendorMismatch: true });
    const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults([mismatched]);
    expect(compatibleEsims).toEqual([]);
    expect(vendorMismatches).toEqual([mismatched]);
    expect(checkErrors).toEqual([]);
  });

  it('puts a failed-check result into checkErrors only', () => {
    const errored = result({ esimId: 'esim-3', checkError: true });
    const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults([errored]);
    expect(compatibleEsims).toEqual([]);
    expect(vendorMismatches).toEqual([]);
    expect(checkErrors).toEqual([errored]);
  });

  it('correctly partitions a mixed batch of results', () => {
    const compatible = result({ esimId: 'esim-1', compatible: true });
    const mismatched = result({ esimId: 'esim-2', vendorMismatch: true });
    const errored = result({ esimId: 'esim-3', checkError: true });
    const incompatible = result({ esimId: 'esim-4' });

    const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults([
      compatible,
      mismatched,
      errored,
      incompatible,
    ]);

    expect(compatibleEsims).toEqual([compatible]);
    expect(vendorMismatches).toEqual([mismatched]);
    expect(checkErrors).toEqual([errored]);
  });

  it('a plain incompatible result (all flags false) lands in none of the slices', () => {
    const incompatible = result({ esimId: 'esim-4' });
    const { compatibleEsims, vendorMismatches, checkErrors } = partitionCompatibilityResults([incompatible]);
    expect(compatibleEsims).toEqual([]);
    expect(vendorMismatches).toEqual([]);
    expect(checkErrors).toEqual([]);
  });
});
