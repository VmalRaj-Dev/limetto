"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Example: check if "auth" key exists in localStorage
    const isLoggedIn = localStorage.getItem("auth") === "true";
    if (isLoggedIn) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Optionally, render nothing while redirecting
  return null;
}
