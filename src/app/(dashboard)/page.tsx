import { redirect } from "next/navigation";

export default function DashboardIndexPage() {
  // The bare / now handled by root page.tsx -> /welcome.
  // This group index can point to the main dashboard view.
  redirect("/dashboard");
}
