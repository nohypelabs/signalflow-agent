import { jsonNoCache } from "@/lib/api/no-cache";
import { getPerpsPositions } from "@/lib/sodex-perps";

export const dynamic = "force-dynamic";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = url.searchParams.get("address")?.trim();
  const accountParam = url.searchParams.get("accountID");

  if (!address || !EVM_ADDRESS.test(address)) {
    return jsonNoCache({ error: "valid EVM address required" }, { status: 400 });
  }

  const accountID = accountParam === null ? undefined : Number(accountParam);
  if (accountID !== undefined && (!Number.isSafeInteger(accountID) || accountID < 0)) {
    return jsonNoCache({ error: "accountID must be a non-negative integer" }, { status: 400 });
  }

  try {
    const data = await getPerpsPositions(address, accountID);
    return jsonNoCache({ ...data, source: "SoDEX Perps", readOnly: true });
  } catch (error) {
    return jsonNoCache(
      { error: error instanceof Error ? error.message : "SoDEX perps positions fetch failed" },
      { status: 502 },
    );
  }
}
