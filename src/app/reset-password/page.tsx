"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error" | "submitting">("idle");
  const [message, setMessage] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (!password || password.length < 6) {
      setStatus("error");
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message || "Failed to reset password.");
    } else {
      setStatus("success");
      setMessage("Password updated! You can now log in.");
      setTimeout(() => router.replace("/login"), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Reset your password
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Enter your new password below.
              </p>
            </div>
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={status === "submitting" || status === "success"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                    disabled={status === "submitting" || status === "success"}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-lime hover:bg-lime-accent text-primary-foreground font-medium transition-all duration-200"
                disabled={status === "submitting" || status === "success"}
              >
                {status === "submitting" ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
