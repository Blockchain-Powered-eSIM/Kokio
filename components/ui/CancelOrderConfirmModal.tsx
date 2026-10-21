import React from "react";
import { Text } from "react-native";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useColors } from "@/hooks/useColors";

interface CancelOrderConfirmModalProps {
  visible: boolean;
  /** "confirm" asks before cancelling; "notCancellable" is shown once the server refuses. */
  mode: "confirm" | "notCancellable";
  /** True while the cancel request is in flight. */
  loading?: boolean;
  /** Inline error from a failed attempt (confirm mode only). */
  errorMessage?: string | null;
  /** Server message explaining why the order can't be cancelled (notCancellable mode only). */
  notCancellableMessage?: string;
  onKeep: () => void;
  onConfirm: () => void;
  /** Local-only removal from the Processing list (notCancellable mode only). */
  onHide: () => void;
}

export function CancelOrderConfirmModal({
  visible,
  mode,
  loading = false,
  errorMessage,
  notCancellableMessage,
  onKeep,
  onConfirm,
  onHide,
}: CancelOrderConfirmModalProps) {
  const colors = useColors();
  const isConfirm = mode === "confirm";

  return (
    <ConfirmModal
      visible={visible}
      title={isConfirm ? "Cancel this order?" : "This order can't be cancelled"}
      body={
        isConfirm
          ? "This can't be undone. If you've already paid or are still paying for this order, keep it. A payment that completes after you cancel won't be refunded and no eSIM will be issued."
          : `${notCancellableMessage ?? ""}\n\nIf you paid, your payment is still being processed. Contact support with your order reference if it doesn't finish.`
      }
      secondaryLabel="Keep order"
      primaryLabel={isConfirm ? "Cancel order" : "Hide from list"}
      primaryColor={colors.destructive}
      onSecondary={onKeep}
      onPrimary={isConfirm ? onConfirm : onHide}
      onRequestClose={onKeep}
      loading={loading}
    >
      {isConfirm && errorMessage ? (
        <Text style={{ fontSize: 13, textAlign: "center", lineHeight: 18, color: colors.destructive, marginTop: 8 }}>
          {errorMessage}
        </Text>
      ) : null}
    </ConfirmModal>
  );
}

export default CancelOrderConfirmModal;
