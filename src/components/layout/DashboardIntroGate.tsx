"use client";

import { useEffect, useState } from "react";
import WelcomeExperience from "./WelcomeExperience";
import { WELCOME_STORAGE_KEY } from "@/lib/welcome";

export default function DashboardIntroGate() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(WELCOME_STORAGE_KEY) === "1";
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    } finally {
      setReady(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!ready || !open) return null;

  return <WelcomeExperience onEnter={dismiss} />;
}
