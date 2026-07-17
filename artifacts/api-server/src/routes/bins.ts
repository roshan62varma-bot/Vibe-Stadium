import type { Request, Response } from "express";
import { Router } from "express";
import { ReportBinParams } from "@workspace/api-zod";
import { getBins, reportBin } from "../lib/binsData.js";
import { awardCredits } from "../lib/rewardsData.js";

const router = Router();

// GET /bins
router.get("/", (_req: Request, res: Response) => {
  res.json(getBins());
});

// POST /bins/:binId/report
router.post("/:binId/report", async (req: Request, res: Response) => {
  const params = ReportBinParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid bin ID" });
    return;
  }

  const userId = (req.body as { userId?: string }).userId ?? "anonymous";
  const result = reportBin(params.data.binId, userId);

  if (result.rateLimited) {
    res.status(429).json({ error: "Too many reports. Please wait a few minutes." });
    return;
  }

  if (!result.success || !result.bin) {
    res.status(404).json({ error: "Bin not found" });
    return;
  }

  // Award credits to user (idempotent DB ledger entry)
  try {
    await awardCredits(userId, result.creditsAwarded, `Reported full bin in ${result.bin.zoneName}`);
  } catch {
    // Credits are best-effort — don't fail the report
  }

  // Get total credits for response (best-effort)
  let totalCredits = result.creditsAwarded;
  try {
    const { getWallet } = await import("../lib/rewardsData.js");
    const wallet = await getWallet(userId);
    totalCredits = wallet.totalCredits;
  } catch {
    // ignore
  }

  res.json({
    bin: result.bin,
    creditsAwarded: result.creditsAwarded,
    totalCredits,
  });
});

export default router;
