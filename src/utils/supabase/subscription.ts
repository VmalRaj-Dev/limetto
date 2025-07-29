// utils/subscription.ts

import { Profile } from "@/types";

export function getSubscriptionDetails(profile: Profile) {
  const now = new Date();
  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;

  const subscriptionStatus = profile.subscription_status;
  const hasEverTrialed = profile.has_ever_trialed;

  let showSubscribeButton = false;
  let paymentActionNeeded = false;
  let statusMessage = '';
  let paymentActionMessage = '';

  if (subscriptionStatus === 'active') {
    statusMessage = 'Subscribed (Active)';
  } else if (subscriptionStatus === 'trialing') {
    statusMessage = `Trial Active (ends ${trialEndsAt?.toLocaleDateString() || 'N/A'})`;
  } else if (['failed', 'incomplete'].includes(subscriptionStatus)) {
    statusMessage = 'Payment Issue Detected';
    paymentActionMessage = 'There was an issue with your payment. Please update your details.';
    paymentActionNeeded = showSubscribeButton = true;
  } else if (['cancelled', 'past_due'].includes(subscriptionStatus)) {
    statusMessage = 'Subscription Expired / Cancelled';
    paymentActionMessage = 'Your subscription has ended. Renew now to regain access!';
    paymentActionNeeded = showSubscribeButton = true;
  } else if (trialEndsAt && trialEndsAt < now && subscriptionStatus !== 'active') {
    statusMessage = 'Trial Expired';
    paymentActionMessage = 'Your trial has ended. Subscribe to continue!';
    paymentActionNeeded = showSubscribeButton = true;
  } else if (hasEverTrialed && subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') {
    statusMessage = 'Trial Used / Not Subscribed';
    paymentActionMessage = 'You\'ve used your trial. Subscribe to unlock full features!';
    paymentActionNeeded = showSubscribeButton = true;
  } else if (!hasEverTrialed && !trialEndsAt && subscriptionStatus === 'none') {
    statusMessage = 'No Trial Started / Not Subscribed';
    paymentActionMessage = 'Start your trial or subscribe to explore features!';
    paymentActionNeeded = showSubscribeButton = true;
  } else {
    statusMessage = `Status: ${subscriptionStatus || 'N/A'}`;
    paymentActionMessage = 'It looks like your subscription status is unclear.';
    paymentActionNeeded = showSubscribeButton = true;
  }

  return {
    statusMessage,
    paymentActionNeeded,
    paymentActionMessage,
    showSubscribeButton,
  };
}
