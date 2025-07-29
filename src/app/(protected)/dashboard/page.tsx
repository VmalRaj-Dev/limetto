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
} from "lucide-react"; // Import LogOut

// Define a type for the joined profile data
interface ProfileWithCategory extends Omit<Profile, "chosen_category_id"> {
  chosen_category_id: {
    id: string;
    category: string;
  } | null;
}

export default function Account() {
  // Destructure 'signOut' from useAuth
  const { user, loading: authLoading, supabase, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileWithCategory | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false)

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

  const onManageSubscription = async() => {
    setLoading(true)
    try {
      const res = await fetch('/api/manage-payment-method', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      // Redirect user to Dodo's hosted portal
      window.location.href = data.session_url
    } catch (err: unknown) {
      alert(err.message || 'Failed to redirect')
    } finally {
      setLoading(false)
    }
  };

  // *** START: Sign Out Function ***
  const handleSignOut = useCallback(async () => {
    setError(null); // Clear any previous errors
    try {
      // Supabase's signOut method
      // Supabase's signOut method
      await signOut(); // <--- CHANGE IS HERE: Directly await the signOut function.

      // Since you confirmed it signs out, we can assume success here.
      // If your AuthContext's signOut function provides a way to check for errors,
      // you could add that logic here. But for now, direct redirection on assumed success.

      router.push("/login"); //
    } catch (err) {
      console.error("Unexpected Sign Out Error:", err);
      setError(
        `An unexpected error occurred during sign out: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }, [signOut, router]); // Depend on signOut from context and router
  // *** END: Sign Out Function ***

  // Unified profile loading logic
  const loadProfile = useCallback(async () => {
    if (!user) {
      console.log("Account: No user found, redirecting to login.");
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
          console.warn(
            "Account: No profile found for user, redirecting to complete setup."
          );
          router.push("/start-trial");
          return;
        }
        console.error("Account: Error fetching profile:", profileError.message);
        setError("Failed to load profile data.");
        setProfile(null);
      } else {
        setProfile(data as ProfileWithCategory);
      }
    } catch (err: unknown) {
      console.error("Account: Unexpected error:", err);
      setError(
        `An unexpected error occurred: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user, supabase, router]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    loadProfile();

    // Setup Realtime Subscription
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
        (payload) => {
          console.log("Account: Realtime profile update received!", payload);
          loadProfile(); // Reload profile on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authLoading, supabase, loadProfile]);

  // Determine subscription status and actions using useMemo
  const {
    statusMessage,
    paymentActionNeeded,
    paymentActionMessage,
    // showSubscribeButton,
    getStatusIcon,
    getStatusBadge,
  } = useMemo(() => {
    const now = new Date();
    const trialEndsAt = profile?.trial_ends_at
      ? new Date(profile.trial_ends_at)
      : null;
    const hasEverTrialed = profile?.has_ever_trialed;
    const subscriptionStatus = profile?.subscription_status;

    let localPaymentActionNeeded = false;
    let localPaymentActionMessage = "";
    let localStatusMessage = "Unknown";
    let localShowSubscribeButton = false;

    const getIcon = (status: string | undefined) => {
      switch (status) {
        case "active":
          return <CheckCircle className="h-5 w-5 text-green-500" />;
        case "trialing":
          return <Clock className="h-5 w-5 text-yellow-500" />;
        case "failed":
        case "incomplete":
        case "cancelled":
        case "past_due":
        case "expired":
        case "none":
        default:
          return <AlertCircle className="h-5 w-5 text-red-500" />;
      }
    };

    const getBadge = (status: string | undefined) => {
      switch (status) {
        case "active":
          return (
            <Badge className="bg-green-500 text-white hover:bg-green-600">
              Active
            </Badge>
          );
        case "trialing":
          return (
            <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
              Trial Active
            </Badge>
          );
        case "failed":
        case "incomplete":
        case "cancelled":
        case "past_due":
        case "expired":
          return (
            <Badge
              variant="destructive"
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Action Needed
            </Badge>
          );
        case "none":
          return <Badge variant="secondary">Not Subscribed</Badge>;
        default:
          return <Badge variant="outline">Unknown</Badge>;
      }
    };

    if (subscriptionStatus === "active") {
      localStatusMessage = "Subscribed (Active)";
    } else if (subscriptionStatus === "trialing") {
      localStatusMessage = `Trial Active (ends ${
        trialEndsAt ? trialEndsAt.toLocaleDateString() : "N/A"
      })`;
    } else if (["failed", "incomplete"].includes(subscriptionStatus || "")) {
      localStatusMessage = "Payment Issue Detected";
      localPaymentActionNeeded = true;
      localPaymentActionMessage =
        "There was an issue with your payment. Please update your details to continue.";
      localShowSubscribeButton = true;
    } else if (["cancelled", "past_due"].includes(subscriptionStatus || "")) {
      localStatusMessage = "Subscription Expired / Cancelled";
      localPaymentActionNeeded = true;
      localPaymentActionMessage =
        "Your subscription has ended. Renew now to regain access!";
      localShowSubscribeButton = true;
    } else if (
      trialEndsAt &&
      trialEndsAt < now &&
      subscriptionStatus !== "active"
    ) {
      localStatusMessage = "Trial Expired";
      localPaymentActionNeeded = true;
      localPaymentActionMessage =
        "Your free trial has ended. Subscribe to continue using our service!";
      localShowSubscribeButton = true;
    } else if (
      hasEverTrialed &&
      !["active", "trialing"].includes(subscriptionStatus || "")
    ) {
      localStatusMessage = "Trial Used / Not Subscribed";
      localPaymentActionNeeded = true;
      localPaymentActionMessage =
        "You've used your free trial. Subscribe to unlock full features!";
      localShowSubscribeButton = true;
    } else if (
      !hasEverTrialed &&
      !trialEndsAt &&
      subscriptionStatus === "none"
    ) {
      localStatusMessage = "No Trial Started / Not Subscribed";
      localPaymentActionNeeded = true;
      localPaymentActionMessage =
        "Start your free trial or subscribe to explore our features!";
      localShowSubscribeButton = true;
    } else {
      localStatusMessage = `Status: ${subscriptionStatus || "N/A"}`;
      localShowSubscribeButton = true;
      localPaymentActionNeeded = true;
      localPaymentActionMessage =
        "It looks like your subscription status is unclear. Please review or subscribe.";
    }

    return {
      statusMessage: localStatusMessage,
      paymentActionNeeded: localPaymentActionNeeded,
      paymentActionMessage: localPaymentActionMessage,
      showSubscribeButton: localShowSubscribeButton,
      getStatusIcon: () => getIcon(profile?.subscription_status), // Ensure these use profile?.subscription_status
      getStatusBadge: () => getBadge(profile?.subscription_status), // Ensure these use profile?.subscription_status
    };
  }, [profile]);

  // Handle loading and error states for the entire component
  if (authLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
        <p className="text-lg">Loading user profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-4">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p className="text-xl text-center mb-4">{error}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 p-4">
        <User className="h-12 w-12 mb-4" />
        <p className="text-xl text-center mb-4">{`No profile data available. Let's get you set up!`}</p>
        <Button
          onClick={onStartTrial}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Complete Registration / Start Trial
        </Button>
      </div>
    );
  }

  const categoryName = profile.chosen_category_id?.category || "Not selected";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
      {/* Hero Section */}
      <div className="bg-gradient-lime text-white">
        <div className="container flex justify-between mx-auto px-6 py-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
              Welcome back
              {profile.name ? `, ${profile.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-lg md:text-xl opacity-90 leading-relaxed">
              {`Here's your personal dashboard, keeping you updated on your account and subscription.`}
            </p>
          </div>
          <Button
            onClick={handleSignOut} // Corrected onClick handler
            variant="outline"
            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium py-2.5 rounded-lg text-base shadow-sm transition-all duration-300 ease-in-out"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {/* Sign Out */}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 -mt-16 sm:-mt-20 z-10 relative">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Information Card */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              <CardHeader className="flex flex-row items-center space-y-0 pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                {/* Changed this div for left-right alignment */}
                <div className="flex items-center space-x-4 justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-lime-100 dark:bg-blue-900 flex items-center justify-center shadow-sm">
                      <User className="h-6 w-6 text-lime-800 dark:text-blue-300" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                      Profile Information
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 bg-white dark:bg-gray-900">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">Name</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {profile.name || "Not set"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <Mail className="h-4 w-4" />
                      <span className="text-sm font-medium">Email</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {user?.email || "N/A"}
                    </p>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <Tag className="h-4 w-4" />
                      <span className="text-sm font-medium">Category</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-base px-3 py-1 bg-lime-200 dark:bg-blue-950 text-gradient-lime dark:text-blue-300 border-lime-800 dark:border-blue-800 rounded-full"
                    >
                      {categoryName}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Status Card */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg border border-gray-100 dark:border-gray-800 rounded-xl h-full flex flex-col">
              <CardHeader className="pb-6 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">
                    Subscription
                  </CardTitle>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-grow flex flex-col justify-between bg-white dark:bg-gray-900">
                <div className="flex items-start space-x-3 mb-6">
                  <div className="mt-1">{getStatusIcon()}</div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Current Status
                    </p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {statusMessage}
                    </p>
                  </div>
                </div>

                {paymentActionNeeded ? (
                  <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300">
                    <p className="font-medium flex items-center">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Action Required:
                    </p>
                    <p className="text-sm mb-3">{paymentActionMessage}</p>
                    <Button
                      onClick={onUpgrade}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-base shadow-md transition-all duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg"
                    >
                      Complete Payment <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(profile.subscription_status === "active" ||
                      profile.subscription_status === "trialing") && (
                      <Button
                        onClick={onManageSubscription}
                        variant="outline"
                        className="w-full border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white font-medium py-2.5 rounded-lg text-base shadow-sm transition-all duration-300 ease-in-out"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {loading ? 'Redirecting...' : 'Manage Subscription'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
