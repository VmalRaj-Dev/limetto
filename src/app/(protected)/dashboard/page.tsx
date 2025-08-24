// app/account/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Mail,
  Tag,
  ArrowRight,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";

// Define a type for the joined profile data
interface ProfileWithCategory extends Omit<Profile, "chosen_category_id"> {
  chosen_category_id: {
    id: string;
    category: string;
  } | null;
}

export default function Account() {
  const { user, loading: authLoading, supabase, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileWithCategory | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Memoize navigation callbacks for better performance and to avoid unnecessary re-renders
  const onStartTrial = useCallback(() => router.push("/start-trial"), [router]);
  const onUpgrade = useCallback(
    () => router.push("/start-trial?upgrade=true"),
    [router]
  );

  // Dodo Payments Customer Portal URL - REPLACE THIS WITH YOUR ACTUAL URL
  // const DODO_PAYMENTS_CUSTOMER_PORTAL_URL =
  //   process.env.NEXT_PUBLIC_DODO_CUSTOMER_PORTAL_URL ||
  //   "https://dashboard.dodopayments.com/customer-portal"; // Fallback example

  const onManageSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/manage-payment-method', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      window.location.href = data.session_url;
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message || 'Failed to redirect');
      } else {
        alert('Failed to redirect');
      }
    } finally {
      setLoading(false);
    }
  };

  // *** START: Sign Out Function ***
  const handleSignOut = useCallback(async () => {
    setError(null);
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      setError(`An unexpected error occurred during sign out: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [signOut, router]);
  // *** END: Sign Out Function ***

  // Unified profile loading logic
  const loadProfile = useCallback(async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setProfileLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*, chosen_category_id(id, category)")
        .eq("id", user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          router.push("/start-trial");
          return;
        }
        setError("Failed to load profile data.");
        setProfile(null);
      } else {
        setProfile(data as ProfileWithCategory);
      }
    } catch (err: unknown) {
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user, supabase, router]);

  useEffect(() => {
    if (authLoading) return;
    
    loadProfile();

    const channel = supabase
      .channel(`profile:${user?.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user?.id}`,
        },
        () => loadProfile()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading, supabase, loadProfile]);

  // Determine subscription status and actions using useMemo
  const {
    statusMessage,
    paymentActionNeeded,
    paymentActionMessage,
    getStatusIcon,
    getStatusBadge,
  } = useMemo(() => {
    const now = new Date();
    const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const hasEverTrialed = profile?.has_ever_trialed;
    const subscriptionStatus = profile?.subscription_status;

    let localPaymentActionNeeded = false;
    let localPaymentActionMessage = "";
    let localStatusMessage = "Unknown";

    const getIcon = (status: string | undefined) => {
      switch (status) {
        case "active":
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case "trialing":
          return <Clock className="h-5 w-5 text-yellow-500" />;
        default:
          return <AlertCircle className="h-5 w-5 text-red-500" />;
      }
    };

    const getBadge = (status: string | undefined) => {
      switch (status) {
        case "active":
          return <Badge className="bg-green-500 text-white hover:bg-green-600">Active</Badge>;
        case "trialing":
          return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Trial Active</Badge>;
        case "failed":
        case "incomplete":
        case "cancelled":
        case "past_due":
        case "expired":
          return <Badge variant="destructive" className="bg-red-500 text-white hover:bg-red-600">Action Needed</Badge>;
        case "none":
          return <Badge variant="secondary">Not Subscribed</Badge>;
        default:
          return <Badge variant="outline">Unknown</Badge>;
      }
    };

    if (subscriptionStatus === "active") {
      localStatusMessage = "Subscribed (Active)";
    } else if (subscriptionStatus === "trialing") {
      localStatusMessage = `Trial Active (ends ${trialEndsAt ? trialEndsAt.toLocaleDateString() : "N/A"})`;
    } else if (["failed", "incomplete"].includes(subscriptionStatus || "")) {
      localStatusMessage = "Payment Issue Detected";
      localPaymentActionNeeded = true;
      localPaymentActionMessage = "There was an issue with your payment. Please update your details to continue.";
    } else if (["cancelled", "past_due"].includes(subscriptionStatus || "")) {
      localStatusMessage = "Subscription Expired / Cancelled";
      localPaymentActionNeeded = true;
      localPaymentActionMessage = "Your subscription has ended. Renew now to regain access!";
    } else if (trialEndsAt && trialEndsAt < now && subscriptionStatus !== "active") {
      localStatusMessage = "Trial Expired";
      localPaymentActionNeeded = true;
      localPaymentActionMessage = "Your free trial has ended. Subscribe to continue using our service!";
    } else if (hasEverTrialed && !["active", "trialing"].includes(subscriptionStatus || "")) {
      localStatusMessage = "Trial Used / Not Subscribed";
      localPaymentActionNeeded = true;
      localPaymentActionMessage = "You've used your free trial. Subscribe to unlock full features!";
    } else if (!hasEverTrialed && !trialEndsAt && subscriptionStatus === "none") {
      localStatusMessage = "No Trial Started / Not Subscribed";
      localPaymentActionNeeded = true;
      localPaymentActionMessage = "Start your free trial or subscribe to explore our features!";
    } else {
      localStatusMessage = `Status: ${subscriptionStatus || "N/A"}`;
      localPaymentActionNeeded = true;
      localPaymentActionMessage = "It looks like your subscription status is unclear. Please review or subscribe.";
    }

    return {
      statusMessage: localStatusMessage,
      paymentActionNeeded: localPaymentActionNeeded,
      paymentActionMessage: localPaymentActionMessage,
      getStatusIcon: () => getIcon(profile?.subscription_status),
      getStatusBadge: () => getBadge(profile?.subscription_status),
    };
  }, [profile]);

  // Handle loading and error states for the entire component
  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-lime-600 dark:text-lime-400" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 dark:bg-red-950 p-4">
        <AlertCircle className="h-12 w-12 mb-4 text-red-700 dark:text-red-300" />
        <p className="text-xl text-center mb-4 text-red-700 dark:text-red-300">{error}</p>
        <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white">
          Try Again
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-blue-50 dark:bg-blue-950 p-4">
        <User className="h-12 w-12 mb-4 text-blue-700 dark:text-blue-300" />
        <p className="text-xl text-center mb-4 text-blue-700 dark:text-blue-300">
          {`No profile data available. Let's get you set up!`}
        </p>
        <Button onClick={onStartTrial} className="bg-blue-600 hover:bg-blue-700 text-white">
          Complete Registration / Start Trial
        </Button>
      </div>
    );
  }

  const categoryName = profile.chosen_category_id?.category || "Not selected";
  const firstName = profile.name ? profile.name.split(" ")[0] : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
      {/* Hero Section - More responsive */}
      <div className="bg-gradient-to-r from-lime-500 to-lime-600 dark:from-lime-700 dark:to-lime-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-2 sm:mb-4 tracking-tight">
                Welcome back{firstName ? `, ${firstName}` : ""}!
              </h1>
              <p className="text-base sm:text-lg md:text-xl opacity-90 leading-relaxed">
                {`Here's your personal dashboard, keeping you updated on your account and subscription.`}
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/20 font-medium py-2 px-4 rounded-lg shadow-sm transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Improved grid and spacing */}
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 -mt-8 sm:-mt-16 z-10 relative">
        <div className="grid gap-6 md:gap-8">
          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            {/* Profile Information Card - Mobile first */}
            <div className="md:col-span-2">
              <Card className="shadow-lg border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden h-full">
                <CardHeader className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 pb-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-lime-100 dark:bg-lime-900 flex items-center justify-center shadow-sm">
                      <User className="h-5 w-5 sm:h-6 sm:w-6 text-lime-800 dark:text-lime-300" />
                    </div>
                    <CardTitle className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
                      Profile Information
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-6 bg-white dark:bg-gray-900">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">Name</span>
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {profile.name || "Not set"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm font-medium">Email</span>
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-all">
                        {user?.email || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <Tag className="h-4 w-4" />
                        <span className="text-sm font-medium">Category</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-sm sm:text-base px-2 py-1 bg-lime-100 dark:bg-lime-900/50 text-lime-800 dark:text-lime-300 border-lime-300 dark:border-lime-800 rounded-full inline-block"
                      >
                        {categoryName}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Status Card */}
            <div>
              <Card className="shadow-lg border border-gray-100 dark:border-gray-800 rounded-xl h-full flex flex-col">
                <CardHeader className="pb-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
                      Subscription
                    </CardTitle>
                    {getStatusBadge()}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex-grow flex flex-col justify-between bg-white dark:bg-gray-900">
                  <div className="flex items-start space-x-3 mb-6">
                    <div className="mt-0.5">{getStatusIcon()}</div>
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Current Status
                      </p>
                      <p className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                        {statusMessage}
                      </p>
                    </div>
                  </div>

                  {paymentActionNeeded ? (
                    <div className="space-y-3 p-3 sm:p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
                      <p className="font-medium flex items-center text-sm sm:text-base">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                        Action Required
                      </p>
                      <p className="text-xs sm:text-sm mb-3">{paymentActionMessage}</p>
                      <Button
                        onClick={onUpgrade}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm sm:text-base shadow-md transition-all duration-300 hover:scale-[1.01] hover:shadow-lg flex items-center justify-center"
                      >
                        Complete Payment 
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    (profile.subscription_status === "active" || profile.subscription_status === "trialing") && (
                      <Button
                        onClick={onManageSubscription}
                        variant="outline"
                        disabled={loading}
                        className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium py-2 rounded-lg text-sm sm:text-base shadow-sm transition-all duration-200 flex items-center justify-center"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Subscription
                          </>
                        )}
                      </Button>
                    )
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}