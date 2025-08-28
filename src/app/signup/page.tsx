"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import "../globals.css";

export default function SignupPage() {
  const [signupEmail, setSignupEmail] = useState<string | null>(null);
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      {signupEmail ? (
        <div className="w-full max-w-md animate-fade-in">
          <Card className="border-border/50 shadow-lg backdrop-blur-sm bg-card/95">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <MailCheck className="w-10 h-10 text-lime-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  Confirm your email
                </h2>
                <p className="text-muted-foreground text-base">
                  We&apos;ve sent a confirmation email to
                  <span className="font-semibold text-lime-primary block mt-1">
                    {signupEmail}
                  </span>
                  Please check your inbox and follow the link to activate your
                  account.
                </p>
                <Button
                  className="w-full mt-4"
                  onClick={() => router.replace("/login")}
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <AuthForm onSignupSuccess={setSignupEmail} />
      )}
    </main>
  );
}
