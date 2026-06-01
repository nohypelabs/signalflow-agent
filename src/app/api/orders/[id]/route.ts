import { NextRequest } from "next/server";
import { jsonNoCache } from "@/lib/api/no-cache";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { requireTradingAuthorization, verifyOrderOwnership } from "@/lib/security/trading-auth";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = checkRateLimit(req, "orders");
  if (limited) return limited;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return jsonNoCache({ error: "Invalid order id" }, { status: 400 });
  }

  const auth = await requireTradingAuthorization(req);
  if (auth instanceof Response) {
    return auth;
  }

  if (!verifyOrderOwnership(auth, orderId)) {
    return jsonNoCache({ error: "Order not found or not owned by caller" }, { status: 404 });
  }

  return jsonNoCache({ error: "Trading authorization unavailable" }, { status: 403 });
}
