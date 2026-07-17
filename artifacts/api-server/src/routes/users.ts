import type { Response } from "express";
import { Router } from "express";
import { UpdateUserProfileBody, GetUserProfileParams } from "@workspace/api-zod";
import { db, usersTable, binReportsTable, rewardTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth.js";
import { getWallet } from "../lib/rewardsData.js";

const router = Router();

// GET /users/:userId
router.get("/:userId", async (req: AuthenticatedRequest, res: Response) => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID parameter" });
    return;
  }

  const { userId } = params.data;

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const userRecord = users[0];
    if (!userRecord) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Count reported bins
    const reports = await db
      .select()
      .from(binReportsTable)
      .where(eq(binReportsTable.userId, userId));

    const binsReported = reports.length;

    // Get total credits
    const wallet = await getWallet(userId);
    const credits = wallet.totalCredits;

    res.json({
      id: userRecord.id,
      name: userRecord.name,
      avatarUrl: userRecord.avatarUrl,
      bio: userRecord.bio,
      favoriteTeam: userRecord.favoriteTeam,
      createdAt: userRecord.createdAt.toISOString(),
      credits,
      binsReported,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching public user profile");
    res.status(500).json({ error: "Could not load user profile" });
  }
});

// PATCH /users/:userId
router.patch("/:userId", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const params = GetUserProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID parameter" });
    return;
  }

  const { userId } = params.data;

  // Protect so users can only update their own profile
  if (req.user!.userId !== userId) {
    res.status(403).json({ error: "You are not authorized to edit this profile" });
    return;
  }

  const parseResult = UpdateUserProfileBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid update profile input" });
    return;
  }

  const { name, bio, favoriteTeam, avatarUrl } = parseResult.data;

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const userRecord = users[0];
    if (!userRecord) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedValues: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) updatedValues.name = name;
    if (bio !== undefined) updatedValues.bio = bio;
    if (favoriteTeam !== undefined) updatedValues.favoriteTeam = favoriteTeam;
    if (avatarUrl !== undefined) updatedValues.avatarUrl = avatarUrl;

    await db
      .update(usersTable)
      .set(updatedValues)
      .where(eq(usersTable.id, userId));

    res.json({
      id: userRecord.id,
      name: name !== undefined ? name : userRecord.name,
      email: userRecord.email,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : userRecord.avatarUrl,
      bio: bio !== undefined ? bio : userRecord.bio,
      favoriteTeam: favoriteTeam !== undefined ? favoriteTeam : userRecord.favoriteTeam,
      createdAt: userRecord.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating user profile");
    res.status(500).json({ error: "Could not update user profile" });
  }
});

export default router;
