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
