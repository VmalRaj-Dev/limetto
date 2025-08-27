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
  Sparkles,
  Crown,
  Zap,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 rounded-full animate-spin border-t-blue-600 dark:border-t-blue-400 mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-pulse border-t-blue-300 dark:border-t-blue-500 mx-auto"></div>
          </div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-6 animate-pulse">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-950 dark:to-pink-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="border-red-200 dark:border-red-800 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">Oops! Something went wrong</h3>
              <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white w-full">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Card className="border-blue-200 dark:border-blue-800 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">Welcome to Limetto!</h3>
              <p className="text-blue-100 text-center">Let&apos;s get you set up in just a few clicks</p>
            </div>
            <CardContent className="p-8 text-center">
              <Button onClick={onStartTrial} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                <Zap className="h-5 w-5 mr-2" />
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const categoryName = profile.chosen_category_id?.category || "Not selected";
  const firstName = profile.name ? profile.name.split(" ")[0] : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Floating Header */}
      <div className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border-b border-white/20 dark:border-gray-800/50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Limetto</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dashboard</p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700 hover:text-red-700 dark:hover:text-red-300 font-medium px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-4">
                {profile.subscription_status === "active" && <Crown className="h-6 w-6 text-yellow-300" />}
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Welcome back{firstName ? `, ${firstName}` : ""}! 👋
                </h2>
              </div>
              <p className="text-blue-100 text-lg opacity-90">
                {profile.subscription_status === "active" 
                  ? "You're all set with your premium subscription!" 
                  : "Here's everything you need to know about your account."}
              </p>
            </div>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {/* Subscription Status - Featured Card */}
          <div className="md:col-span-2 lg:col-span-1">
            <Card className="h-full border-0 shadow-xl bg-white dark:bg-gray-800 relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                    {getStatusIcon()}
                    <span className="ml-2">Subscription</span>
                  </CardTitle>
                  {getStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{statusMessage}</p>
                  </div>
                  
                  {paymentActionNeeded ? (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-800">
                      <div className="flex items-center text-red-700 dark:text-red-300 mb-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="font-medium text-sm">Action Required</span>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mb-3">{paymentActionMessage}</p>
                      <Button
                        onClick={onUpgrade}
                        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                      >
                        Fix Now <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  ) : (
                    (profile.subscription_status === "active" || profile.subscription_status === "trialing") && (
                      <Button
                        onClick={onManageSubscription}
                        variant="outline"
                        disabled={loading}
                        className="w-full border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2.5 rounded-lg transition-all duration-200"
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Info Cards */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Name</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{profile.name || "Not set"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Email</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">{user?.email || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Card */}
          <div>
            <Card className="h-full border-0 shadow-lg bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-300 group">
              <CardContent className="p-6 h-full flex flex-col justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Tag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium mb-2">Category</p>
                  <Badge 
                    className="text-sm px-4 py-2 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 text-purple-800 dark:text-purple-300 border-0 rounded-full font-medium"
                  >
                    {categoryName}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions - Only show if needed */}
        {!profile.subscription_status || profile.subscription_status === "none" ? (
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-8 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="relative z-10 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-200" />
                <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
                <p className="text-blue-100 mb-6 text-lg">Join thousands of users already using Limetto</p>
                <Button
                  onClick={onStartTrial}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.05] text-lg"
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Start Free Trial
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}