// Tests for the order body checkout builds from the selected plan.

import { formatPlanLabel, getEsimOrderPayload } from '../esim-order';
import type { Esim } from '@/components/ui/esim-item';

const PLAN = {
  catalogueId:       'plan-jp-5',
  serviceRegionName: 'Japan',
  validity:          7,
  data:              5,
  isUnlimited:       false,
} as unknown as Esim;

describe('getEsimOrderPayload', () => {
  it('builds a new-eSIM order by default', () => {
    expect(
      getEsimOrderPayload({ eSimItem: PLAN, useStoreCredit: false, applyAsTopup: false, compatibleTopUpEsimRef: undefined }),
    ).toEqual({
      catalogueId:    'plan-jp-5',
      isNewESim:      true,
      coupon:         undefined,
      useStoreCredit: false,
      paymentMethod:  'CRYPTO',
    });
  });

  it('carries the applied code and store credit choice', () => {
    expect(
      getEsimOrderPayload({ eSimItem: PLAN, appliedCode: 'SAVE10', useStoreCredit: true, applyAsTopup: false, compatibleTopUpEsimRef: undefined }),
    ).toMatchObject({ coupon: 'SAVE10', useStoreCredit: true });
  });

  it('turns into a top-up when one is chosen and an eSIM is known', () => {
    expect(
      getEsimOrderPayload({ eSimItem: PLAN, useStoreCredit: false, applyAsTopup: true, compatibleTopUpEsimRef: 'esim-ref-1' }),
    ).toMatchObject({ isNewESim: false, eSimRef: 'esim-ref-1' });
  });

  it('stays a new eSIM when top-up is chosen but no eSIM is known', () => {
    const payload = getEsimOrderPayload({ eSimItem: PLAN, useStoreCredit: false, applyAsTopup: true, compatibleTopUpEsimRef: undefined });
    expect(payload.isNewESim).toBe(true);
    expect(payload).not.toHaveProperty('eSimRef');
  });
});

describe('formatPlanLabel', () => {
  it('joins region, days and data', () => {
    expect(formatPlanLabel(PLAN)).toBe('Japan · 7 Days · 5GB');
  });

  it('says Unlimited instead of a data amount', () => {
    expect(formatPlanLabel({ ...PLAN, isUnlimited: true } as Esim)).toBe('Japan · 7 Days · Unlimited');
  });

  it('returns undefined without a region', () => {
    expect(formatPlanLabel(null)).toBeUndefined();
  });
});
