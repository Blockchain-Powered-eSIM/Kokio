import React from "react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface ApplyTopupConfirmModalProps {
  visible: boolean;
  /** Display name of the existing eSIM this plan would be applied to. */
  esimLabel: string;
  onConfirm: () => void;
  onBuyNew: () => void;
}

export function ApplyTopupConfirmModal({ visible, esimLabel, onConfirm, onBuyNew }: ApplyTopupConfirmModalProps) {
  return (
    <ConfirmModal
      visible={visible}
      title="Apply as Top Up"
      body={`Confirm to apply this plan as a top up on ${esimLabel}.`}
      secondaryLabel="Buy a new eSIM"
      primaryLabel="Confirm"
      onSecondary={onBuyNew}
      onPrimary={onConfirm}
      onRequestClose={onBuyNew}
    />
  );
}

export default ApplyTopupConfirmModal;
