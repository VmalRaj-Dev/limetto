import DodoPayments from 'dodopayments';

// export const dodopayments = new DodoPayments({
//   bearerToken: process.env.NODE_ENV === 'production'
//     ? process.env.DODO_API_KEY_LIVE!
//     : process.env.DODO_API_KEY_TEST!,
//   environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
// });

export const dodopayments = new DodoPayments({
  bearerToken: process.env.PAYMENT_MODE === 'live'
    ? process.env.DODO_API_KEY_LIVE!
    : process.env.DODO_API_KEY_TEST!,
  environment: process.env.PAYMENT_MODE === 'live' ? 'live_mode' : 'test_mode',
});

const DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID =
  process.env.DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID;

console.log("DodoPayments Environment:", process.env.PAYMENT_MODE);
console.log("Using API Key:", process.env.PAYMENT_MODE === 'live' ? process.env.DODO_API_KEY_LIVE! : process.env.DODO_API_KEY_TEST!);
console.log("DodoPayments Product ID:", DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID);

// In your API route file
console.log("DodoPayments product ID being used in API call:", DODOPAYMENTS_GENERIC_SUBSCRIPTION_PRODUCT_ID);