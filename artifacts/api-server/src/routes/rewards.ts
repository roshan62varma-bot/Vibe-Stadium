import type { Request, Response } from "express";
import { Router } from "express";
import { GetRewardsQueryParams, ClaimRewardBody } from "@workspace/api-zod";
import { getWallet, claimReward } from "../lib/rewardsData.js";

const router = Router();

// GET /rewards?userId=
router.get("/", async (req: Request, res: Response) => {
  const query = GetRewardsQueryParams.safeParse(req.query);
  const userId = query.success && query.data.userId ? query.data.userId : "fan-001";

  try {
    const wallet = await getWallet(userId);
    res.json(wallet);
  } catch (err) {
    req.log.error({ err }, "Failed to get rewards wallet");
    res.status(500).json({ error: "Could not load rewards" });
  }
});

// POST /rewards/claim
router.post("/claim", async (req: Request, res: Response) => {
  const body = ClaimRewardBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const userId = body.data.userId ?? "fan-001";
  const result = await claimReward(userId, body.data.rewardId);

  if (!result.success) {
    res.status(400).json({ error: result.error ?? "Could not claim reward" });
    return;
  }

  res.json(result.wallet);
});

export default router;
