// app/dashboard/AccountDetails.tsx
// This is a Client Component, so it needs the directive
"use client";

import { Profile } from '@/types';

// The profile data is passed in as a prop from the Server Component
export default function AccountDetails({ profile }: { profile: Profile }) {
  const now = new Date();
  const trialExpired = profile.trial_ends_at && new Date(profile.trial_ends_at) < now;
  const isSubscribed = !!profile.subscribed_at;

  // The button needs interactivity, so this component must be a client component
  const handleSubscribe = () => {
    // Logic to initiate a subscription (e.g., call a server action or API route)
    console.log("Subscribing now...");
    // router.push('/start-trial')
  };

  return (
    <div>
      <h2>Account</h2>
      <p>Name: {profile.name}</p>
      <p>Email: {profile.email}</p>
      <p>Category: {profile.category}</p>
      <p>Status: {isSubscribed ? 'Subscribed' : trialExpired ? 'Trial Expired' : 'Trial Active'}</p>
      {!isSubscribed && trialExpired && <button onClick={handleSubscribe}>Subscribe Now</button>}
    </div>
  );
}