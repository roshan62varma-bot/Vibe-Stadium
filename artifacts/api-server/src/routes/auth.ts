import type { Response } from "express";
import { Router } from "express";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID, scryptSync, randomBytes } from "crypto";
import { generateToken } from "../lib/jwt.js";
import { authMiddleware, type AuthenticatedRequest } from "../middlewares/auth.js";

const router = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const testHash = scryptSync(password, salt, 64).toString("hex");
  return testHash === hash;
}

// POST /auth/register
router.post("/register", async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = RegisterUserBody.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid registration input" });
    return;
  }

  const { name, email, password, favoriteTeam } = parseResult.data;

  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }

    const userId = `user-${randomUUID()}`;
    const passwordHash = hashPassword(password);
    // Dynamic avatar url using free dicebear style or simple letter avatar
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

    await db.insert(usersTable).values({
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      favoriteTeam: favoriteTeam || null,
      avatarUrl,
    });

    const user = {
      id: userId,
      name,
      email: email.toLowerCase(),
      avatarUrl,
      bio: null,
      favoriteTeam: favoriteTeam || null,
      createdAt: new Date().toISOString(),
    };

    const token = generateToken({ userId });
    res.json({ token, user });
  } catch (err) {
    req.log.error({ err }, "Registration error");
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
router.post("/login", async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = LoginUserBody.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid login input" });
    return;
  }

  const { email, password } = parseResult.data;

  // Guest demo credential bypass
  if (email.toLowerCase() === "demo@vibestadium.com" && password === "password123") {
    const user = {
      id: "demo-fan-001",
      name: "Emerald Fan",
      email: "demo@vibestadium.com",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=emerald",
      bio: "VibeStadium official guest account",
      favoriteTeam: "Emerald FC",
      createdAt: new Date().toISOString(),
    };
    const token = generateToken({ userId: user.id });
    res.json({ token, user });
    return;
  }

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    const userRecord = users[0];
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      avatarUrl: userRecord.avatarUrl,
      bio: userRecord.bio,
      favoriteTeam: userRecord.favoriteTeam,
      createdAt: userRecord.createdAt.toISOString(),
    };

    const token = generateToken({ userId: user.id });
    res.json({ token, user });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /auth/me
router.get("/me", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  if (userId === "demo-fan-001") {
    res.json({
      id: "demo-fan-001",
      name: "Emerald Fan",
      email: "demo@vibestadium.com",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=emerald",
      bio: "VibeStadium official guest account",
      favoriteTeam: "Emerald FC",
      createdAt: new Date().toISOString(),
    });
    return;
  }

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

    res.json({
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      avatarUrl: userRecord.avatarUrl,
      bio: userRecord.bio,
      favoriteTeam: userRecord.favoriteTeam,
      createdAt: userRecord.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Fetch current user profile error");
    res.status(500).json({ error: "Could not retrieve profile" });
  }
});

export default router;
