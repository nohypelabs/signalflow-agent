import { redirect } from "next/navigation";

export default function RootPage() {
  // Always send first-time visitors (or bare domain) to the welcome experience.
  // The /welcome page itself will client-side redirect to /dashboard if the user
  // has already dismissed it (localStorage check).
  redirect("/welcome");
}
