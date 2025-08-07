"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Clock, CheckCircle, Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const Subscribe = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user, loading: userLoading } = useAuth();
  const router = useRouter();

  // Example placeholders - ideally this will come from context/API
  const userStatus: "trial_ended" | "canceled" | "subscription_needed" = "trial_ended";
  const userName = "";

  const getStatusContent = () => {
    const baseStyles = "w-16 h-16 text-neutral-400 mb-6";

    const statusMap = {
      trial_ended: {
        icon: <Clock className={baseStyles} />,
        title: "Trial Ended",
        message:
          "Your free trial has ended. To continue using our services and access all premium features, please subscribe to one of our plans.",
        buttonText: "Subscribe Now",
      },
      canceled: {
        icon: <CheckCircle className={baseStyles} />,
        title: "Subscription Canceled",
        message:
          "You have successfully canceled your subscription. To regain access to premium features, you can subscribe at any time.",
        buttonText: "Reactivate Subscription",
      },
      subscription_needed: {
        icon: <CreditCard className={baseStyles} />,
        title: "Subscription Required",
        message: "To access this premium feature, please subscribe to one of our plans.",
        buttonText: "Choose a Plan",
      },
    };

    return statusMap[userStatus];
  };

  const handleSubscribe = async () => {
    if (!user) return;

    setIsLoading(true);
    const meta = user.user_metadata;

    try {
      const response = await fetch("/api/checkout/subscription", {
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

      const data = await response.json();

      if (data?.payment_link) {
        router.push(data.payment_link);
      } else {
        alert("Failed to start subscription. Please try again.");
        console.error("No payment link received.");
      }
    } catch (err) {
      console.error("Subscription error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-limetto-dark flex items-center justify-center p-4">
        <div className="text-center animate-fade-in">
          <Loader2 className="w-12 h-12 text-limetto-green mx-auto mb-6 animate-spin" />
          <h1 className="text-2xl font-semibold text-white mb-2">
            Preparing your free trial...
          </h1>
          <p className="text-gray-300 max-w-md mx-auto">
            {`We're setting up your account and preparing your personalized workspace. This will only take a moment.`}
          </p>
        </div>
      </div>
    );
  }

  const content = getStatusContent();

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="p-8 text-center bg-card/50 backdrop-blur-sm border-neutral-200 shadow-soft">
          <div className="flex justify-center">{content.icon}</div>

          {userName && (
            <p className="text-sm text-muted-foreground mb-2">Hello, {userName}</p>
          )}

          <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
            {content.title}
          </h1>

          <p className="text-neutral-600 mb-8 leading-relaxed">{content.message}</p>

          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            variant="subscribe"
            size="lg"
            className="w-full mb-6 animate-pulse"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Redirecting...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                {content.buttonText}
              </>
            )}
          </Button>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Cancel anytime
            </p>
            <p className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Secure payment processing
            </p>
            <p className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              Instant access to all features
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Subscribe;
