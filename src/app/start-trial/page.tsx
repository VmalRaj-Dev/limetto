"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function StartTrial() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();
  const { user, loading: userLoading } = useAuth();

  useEffect(() => {
    async function startSubscription() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const meta = user.user_metadata;
        const res = await fetch("/api/checkout/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supabaseUserId: user.id,
            supabaseCategoryId: meta?.chosen_category_id,
            email: user.email,
            name: meta?.name,
            billing: {
              street: meta?.street,
              city: meta?.city,
              state: meta?.state,
              country: meta?.country,
              zipcode: meta?.zipcode,
            },
          }),
        });

        const data = await res.json();
        
        if (data?.payment_link) {
          router.push(data.payment_link);
        } else {
          alert("Failed to start trial. Please try again.");
          console.error("No payment link received");
          setError(true)
        }
      } catch (error) {
        console.error("Subscription initiation error:", error);
        alert("An error occurred while starting your trial. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (!userLoading) {
      startSubscription();
    }
  }, [user, userLoading, router]);

  const handleRefresh = () => {
    setError(false);
    setLoading(true);
    window.location.reload();
  };

  // return (
  //   <div className="flex justify-center items-center h-screen">
  //     <p className="text-center text-lg">
  //       {(loading || userLoading) 
  //         ? "Redirecting to start your free trial..." 
  //         : "Unable to start trial. Please refresh or contact support."}
  //     </p>
  //   </div>

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-limetto-dark flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-limetto-green mx-auto mb-6 animate-spin" />
          <h1 className="text-2xl font-semibold text-white mb-2">
        Preparing your free trial...
          </h1>
          <p className="text-gray-300 max-w-md mx-auto">
        {`We're setting up your account and preparing your personalized workspace.`} 
        This will only take a moment.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-limetto-dark flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md mx-auto">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-2xl font-semibold text-white mb-4">
            Unable to start trial
          </h1>
          <p className="text-gray-300 mb-8 leading-relaxed">
            We encountered an issue while setting up your free trial. 
            Please refresh the page or contact our support team if the problem persists.
          </p>
          <div className="space-y-4">
            <Button 
              onClick={handleRefresh}
              className="bg-limetto-green hover:bg-limetto-green-hover text-white font-medium px-8 py-3 rounded-lg transition-colors duration-200 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
            <p className="text-sm text-gray-400">
              Need help? Contact us at{' '}
              <a 
                href="mailto:support@example.com" 
                className="text-limetto-green hover:underline"
              >
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-limetto-dark flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-2xl font-semibold mb-4">Redirecting...</h1>
        <p className="text-gray-300">You should be redirected shortly.</p>
      </div>
    </div>
  );
  // );
}