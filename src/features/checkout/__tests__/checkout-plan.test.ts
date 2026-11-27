import { parseCheckoutPlan } from '../checkout-plan';

const PLAN = { catalogueId: 'us-1gb', actualSellingPrice: 5, isUnlimited: false, coverageType: 'LOCAL' };

describe('parseCheckoutPlan', () => {
  it('parses the JSON param and returns the same object for the same string', () => {
    const raw = JSON.stringify(PLAN);
    const first = parseCheckoutPlan(raw);
    expect(first).toEqual(PLAN);
    expect(parseCheckoutPlan(raw)).toBe(first);
  });

  it('returns null for missing or broken params', () => {
    expect(parseCheckoutPlan(undefined)).toBeNull();
    expect(parseCheckoutPlan('{not json')).toBeNull();
  });
});
