"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createClient } from "@/utils/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  Lock, // Re-added Lock icon for password
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

// Define your Zod schema for validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."), // Minimal validation, could be .min(6) etc.
});

// Infer the type from the schema for type safety
type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  // Renamed from MagicLinkLogin
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<"idle" | "success" | "error">("idle");
  const [forgotMsg, setForgotMsg] = useState("");
  const forgotEmailRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormValues) => {
    setStatus("idle");
    setMessage("");

    try {
      // **Simulated API Call for Email & Password Login**
      // Replace with your actual backend API call or Supabase call
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay

      // **Supabase Login Example (Uncomment and configure if using Supabase Auth)**
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        throw new Error(error.message || "Login failed.");
      }

      // Simulate success for now
      setStatus("success");
      setMessage("Login successful! Redirecting to dashboard...");
      reset(); // Reset form fields on success
      // In a real app, you'd navigate here AFTER successful login
      router.replace("/dashboard"); // Example redirect
    } catch (error: unknown) {
      console.error("Login Error:", error);
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Invalid email or password. Please try again."
      );
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus("idle");
    setForgotMsg("");
    const email = forgotEmailRef.current?.value || "";
    if (!email) {
      setForgotStatus("error");
      setForgotMsg("Please enter your email address.");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setForgotStatus("success");
      setForgotMsg("Password reset email sent! Please check your inbox.");
    } catch (err) {
      setForgotStatus("error");
      setForgotMsg(
        err instanceof Error ? err.message : "Failed to send reset email."
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-lime rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Limetto</h1>
          </div>
          <p className="text-foreground text-sm">Your freelance platform</p>
        </div>

        {/* Main Login Card */}
        <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Log in to your Limetto account.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    {...register("email")}
                    className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    className="pl-10 pr-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-lime-primary hover:text-lime-accent font-medium underline underline-offset-2 transition-colors"
                    onClick={() => setShowForgot((v) => !v)}
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="w-full h-12 bg-gradient-lime hover:bg-lime-accent text-primary-foreground font-medium transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Logging in...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Log In
                  </div>
                )}
              </Button>
            </form>

            {/* Forgot Password Inline Form */}
            {showForgot && (
              <form
                onSubmit={handleForgotPassword}
                className="mt-4 p-4 rounded-lg bg-muted/50 border border-muted flex flex-col gap-3 animate-fade-in"
              >
                <Label htmlFor="forgot-email" className="text-sm font-medium text-foreground">
                  Enter your email to reset password
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="your@email.com"
                  ref={forgotEmailRef}
                  className="h-11 bg-background border-border"
                  disabled={forgotStatus === "success"}
                  autoFocus
                />
                <Button
                  type="submit"
                  className="bg-lime-primary hover:bg-lime-accent text-white font-medium h-11"
                  disabled={forgotStatus === "success"}
                >
                  {forgotStatus === "success" ? "Email Sent" : "Send Reset Link"}
                </Button>
                {forgotMsg && (
                  <div
                    className={`text-xs mt-1 ${
                      forgotStatus === "success"
                        ? "text-green-600"
                        : "text-destructive"
                    }`}
                  >
                    {forgotMsg}
                  </div>
                )}
              </form>
            )}

            {/* Status Messages */}
            {status !== "idle" && (
              <div
                className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm animate-fade-in ${
                  status === "success"
                    ? "bg-lime-secondary text-foreground border border-primary/20"
                    : "bg-destructive/10 text-destructive-foreground border border-destructive/20"
                }`}
              >
                {status === "success" ? (
                  <CheckCircle className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <p>{message}</p>
              </div>
            )}

            {/* Security Note */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-foreground text-center leading-relaxed">
                🔒 Secure login to access your freelance opportunities.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-foreground">
            New to Limetto?{" "}
            <button
              onClick={() => router.replace("/signup")}
              className="text-lime-primary hover:text-lime-accent font-medium transition-colors cursor-pointer"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
