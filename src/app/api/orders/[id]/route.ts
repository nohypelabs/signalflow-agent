import { NextRequest } from "next/server";
import { jsonNoCache } from "@/lib/api/no-cache";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { requireTradingAuthorization } from "@/lib/security/trading-auth";
import { cancelPerpOrder } from "@/lib/sodex-perps";
import { z } from "zod";

export const dynamic = "force-dynamic";

const cancelSchema = z.object({
  accountID: z.number().int().min(0).default(0),
  symbolID: z.number().int().min(1).default(1),
}).strict();

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.trim().length === 0) {
    return jsonNoCache({ error: "Order ID required" }, { status: 400 });
  }

  const auth = await requireTradingAuthorization(req);
  if (auth instanceof Response) return auth;

  // Parse optional body for accountID/symbolID
  const body = await req.json().catch(() => ({}));
  const parsed = cancelSchema.safeParse(body);
  const { accountID, symbolID } = parsed.success ? parsed.data : { accountID: 0, symbolID: 1 };

  try {
    await cancelPerpOrder(
      { accountID, symbolID, orderID: id },
      { apiKeyName: auth.apiKeyName, apiKeyPrivate: auth.apiKeyPrivate },
    );
    return jsonNoCache({ success: true, cancelledOrderId: id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cancel failed";
    console.error("[/api/orders/[id] DELETE]", msg);
    return jsonNoCache({ error: msg }, { status: 502 });
  }
}
