export const getEsimOrderPayload = ({
  eSimItem,
  deviceWalletId,
  discountCode,
  applyAsTopup,
  compatibleTopUpEsimId
}) => ({
  deviceId: deviceWalletId,
  catalogueId: eSimItem?.catalogueId,
  amount: eSimItem?.actualSellingPrice,
  currency: "USD", // TODO: check if need to be dyanamic
  isNewESim: true, // True if new esim and false if topup
  coupon: discountCode,
  isCryptoPayment:true,
  ...(applyAsTopup && compatibleTopUpEsimId ? { isNewESim: false, esimId: compatibleTopUpEsimId } : {})
});
