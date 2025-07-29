"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function StartTrial() {
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="flex justify-center items-center h-screen">
      <p className="text-center text-lg">
        {(loading || userLoading) 
          ? "Redirecting to start your free trial..." 
          : "Unable to start trial. Please refresh or contact support."}
      </p>
    </div>
  );
}