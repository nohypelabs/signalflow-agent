"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WelcomeExperience from "@/components/layout/WelcomeExperience";
import { WELCOME_STORAGE_KEY } from "@/lib/welcome";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const replay = params.get("replay") === "1";
      const dismissed = localStorage.getItem(WELCOME_STORAGE_KEY) === "1";

      if (!replay && dismissed) {
        router.replace("/dashboard");
      }
    } catch {
      // If storage is blocked, keep the welcome page accessible.
    }
  }, [router]);

  const enterDashboard = () => {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    } catch {}
    router.push("/dashboard");
  };

  return <WelcomeExperience onEnter={enterDashboard} className="relative h-screen min-h-screen" />;
}
