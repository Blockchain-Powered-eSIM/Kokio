import { useCallback, useState } from "react";
import _toUpper from "lodash/toUpper";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/providers/toast-context";
import { getCoupon } from "@/lib/api/bff/coupon";
import type { CodeLookupResponse } from "@/lib/api/bff/coupon";
import { formatBffError } from "@/lib/api/bff/client";
import { resolveBffErrorMessage } from "@/lib/api/bff/errors";
import { logger } from "@/lib/logger";

/** Coupon or referral code entry and lookup for checkout. */
export function usePromoCode() {
  const { showMessage } = useToast();
  const [discountCode, setDiscountCode]           = useState<string>("");
  const [isDiscountApplied, setIsDiscountApplied] = useState<boolean>(false);
  const [isCouponLoading, setIsCouponLoading]     = useState<boolean>(false);
  const [coupon, setCoupon]                       = useState<CodeLookupResponse | null>(null);
  const [couponError, setCouponError]             = useState<string>("");
  const [discountError, setDiscountError]         = useState<string>("");

  const remove = useCallback(() => {
    setIsDiscountApplied(false);
    setDiscountCode("");
    setDiscountError("");
    setCoupon(null);
    setCouponError("");
  }, []);

  const changeCode = useCallback((text: string) => {
    setDiscountCode(_toUpper(text));
    setIsDiscountApplied(false);
    setDiscountError('');
    setCoupon(null);
    setCouponError('');
  }, []);

  const paste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const trimmed = text.trim();
      if (!trimmed) {
        showMessage("Clipboard is empty", "error");
        return;
      }
      changeCode(trimmed);
    } catch (error) {
      logger.error('CLIPBOARD_PASTE_FAILED', { error });
      showMessage("Couldn't read from clipboard", "error");
    }
  }, [changeCode, showMessage]);

  const apply = useCallback(async () => {
    const code = discountCode.trim().toUpperCase();
    if (!code || isCouponLoading) return;
    setIsCouponLoading(true);
    setCouponError('');
    try {
      const result = await getCoupon(code);
      setCoupon(result);
      if (result.eligibility.eligible) {
        setIsDiscountApplied(true);
      } else {
        setCouponError(resolveBffErrorMessage(result.eligibility.reason ?? ''));
      }
    } catch (err) {
      setCoupon(null);
      setCouponError(formatBffError(err));
    } finally {
      setIsCouponLoading(false);
    }
  }, [discountCode, isCouponLoading]);

  /** Un-applies the code after the backend rejected it while placing the order. */
  const rejectCode = useCallback((message: string) => {
    setIsDiscountApplied(false);
    setDiscountError(message);
  }, []);

  return {
    discountCode,
    isDiscountApplied,
    isCouponLoading,
    coupon,
    couponError,
    discountError,
    appliedCode: isDiscountApplied ? discountCode : undefined,
    changeCode,
    paste,
    apply,
    remove,
    rejectCode,
  };
}
