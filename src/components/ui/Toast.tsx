"use client";

import { Toaster } from "sonner";

export function Toast() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#0B1020",
          border: "1px solid #1E293B",
          color: "#F8FAFC",
          fontSize: "13px",
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        },
      }}
      theme="dark"
      richColors
      closeButton
    />
  );
}
