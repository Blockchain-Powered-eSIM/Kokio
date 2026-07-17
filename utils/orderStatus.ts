const STATUS_LABELS: Record<string, string> = {
  // Order lifecycle
  PENDING:                         'Pending',
  PROCESSING:                      'Processing',
  COMPLETED:                       'Completed',
  FAILED:                          'Failed',
  CANCELLED:                       'Cancelled',
  // Payment
  PAYMENT_PENDING:                 'Payment Pending',
  PAYMENT_VERIFIED:                'Payment Verified',
  PAYMENT_FAILED:                  'Payment Failed',
  // On-chain recording
  ON_CHAIN_SUBMITTED:              'Recording on Chain',
  ON_CHAIN_FAILED:                 'Chain Recording Failed',
  // Vendor fulfilment
  VENDOR_PROCESSING:               'Provisioning',
  VENDOR_RETRY_PENDING:            'Provisioning (Retrying)',
  VENDOR_FAILED:                   'Provisioning Failed',
  VENDOR_FULFILMENT_FAILED:        'Fulfilment Failed',
  // eSIM provisioning
  ESIM_PROVISIONED:                'eSIM Ready',
  ESIM_PROVISIONED_PENDING_CHAIN:  'eSIM Ready',
  ESIM_PROVISION_FAILED:           'Provisioning Failed',
  ESIM_DELIVERY_FAILED:            'Delivery Failed',
  // eSIM activation status (ESimDocument.activationStatus)
  CREATED:                         'Registered',
  ACTIVE:                          'Active',
  SUSPENDED:                       'Suspended',
  REVOKED:                         'Revoked',
  ABANDONED:                       'Abandoned',
  EXPIRED:                         'Expired',
};

/** Map a raw status enum string to a user-facing label. */
export function labelForStatus(status?: string | null): string {
  if (!status) return '';
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED:                       '#22c55e',
  ESIM_PROVISIONED:                '#22c55e',
  ESIM_PROVISIONED_PENDING_CHAIN:  '#22c55e',
  ACTIVE:                          '#22c55e',
  PROCESSING:                      '#f59e0b',
  PENDING:                         '#f59e0b',
  PAYMENT_PENDING:                 '#f59e0b',
  PAYMENT_VERIFIED:                '#f59e0b',
  ON_CHAIN_SUBMITTED:              '#f59e0b',
  VENDOR_PROCESSING:               '#f59e0b',
  VENDOR_RETRY_PENDING:            '#f59e0b',
  SUSPENDED:                       '#f59e0b',
  FAILED:                          '#ef4444',
  CANCELLED:                       '#ef4444',
  PAYMENT_FAILED:                  '#ef4444',
  ON_CHAIN_FAILED:                 '#ef4444',
  VENDOR_FAILED:                   '#ef4444',
  VENDOR_FULFILMENT_FAILED:        '#ef4444',
  ESIM_PROVISION_FAILED:           '#ef4444',
  ESIM_DELIVERY_FAILED:            '#ef4444',
  REVOKED:                         '#ef4444',
  ABANDONED:                       '#6b7280',
  EXPIRED:                         '#6b7280',
  CREATED:                         '#6b7280',
};

export function colorForStatus(status?: string | null): string {
  if (!status) return '#6b7280';
  return STATUS_COLORS[status] ?? '#6b7280';
}

/** Inline polling message shown in checkout loading overlay. */
export function pollingLabel(status: string): string {
  const map: Record<string, string> = {
    PAYMENT_PENDING:    'Confirming payment...',
    PAYMENT_VERIFIED:   'Payment confirmed. Provisioning eSIM...',
    ON_CHAIN_SUBMITTED: 'Recording on chain...',
    VENDOR_PROCESSING:  'Provisioning your eSIM...',
    VENDOR_RETRY_PENDING: 'Provisioning your eSIM...',
    ESIM_PROVISIONED_PENDING_CHAIN: 'Almost done...',
    ESIM_PROVISIONED:   'eSIM ready!',
    COMPLETED:          'Order complete!',
  };
  return map[status] ?? labelForStatus(status);
}
