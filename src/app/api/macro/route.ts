import { getMacroEvents, getMacroEventHistory } from "@/lib/sosovalue";
import { jsonNoCache } from "@/lib/api/no-cache";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeHistory = url.searchParams.get("history") === "true";
  const eventName = url.searchParams.get("event");

  try {
    const events = await getMacroEvents();

    if (includeHistory && eventName) {
      const history = await getMacroEventHistory(eventName, 30).catch(() => []);
      return jsonNoCache({ events, history, eventName });
    }

    // Build upcoming events (next 7 days)
    const today = new Date();
    const next7 = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const todayStr = today.toISOString().slice(0, 10);
    const next7Str = next7.toISOString().slice(0, 10);

    const upcoming = events.filter((e) => e.date >= todayStr && e.date <= next7Str);
    const todayEvents = events.filter((e) => e.date === todayStr);

    return jsonNoCache({
      events,
      upcoming,
      today: todayEvents,
      totalEvents: events.reduce((s, e) => s + e.events.length, 0),
    });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 502 },
    );
  }
}
