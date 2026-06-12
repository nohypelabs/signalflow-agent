"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import WelcomeExperience from "@/components/layout/WelcomeExperience";
import { WELCOME_STORAGE_KEY } from "@/lib/welcome";

const EXIT_ANIMATION_MS = 420;

export default function WelcomePage() {
  const router = useRouter();
  const [isLeaving, setIsLeaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const enterDashboard = () => {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    } catch {
      // intentionally ignored — non-critical localStorage write
    }
    setIsLeaving(true);

    timerRef.current = setTimeout(() => {
      router.replace("/dashboard");
    }, EXIT_ANIMATION_MS);
  };

  return (
    <WelcomeExperience
      onEnter={enterDashboard}
      isLeaving={isLeaving}
    />
  );
}
