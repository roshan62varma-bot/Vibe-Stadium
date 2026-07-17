// In-memory rewards wallet (backed by DB for persistence on restart)

import { db } from "@workspace/db";
import { rewardTransactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface RewardTransaction {
  id: string;
  type: "earned" | "redeemed";
  amount: number;
  description: string;
  createdAt: string;
}

export interface RewardOffer {
  id: string;
  title: string;
  description: string;
  cost: number;
  category: "food" | "merch" | "upgrade" | "experience";
}

export interface RewardsWallet {
  userId: string;
  totalCredits: number;
  transactions: RewardTransaction[];
  availableOffers: RewardOffer[];
}

export const AVAILABLE_OFFERS: RewardOffer[] = [
  { id: "offer-01", title: "Free Hotdog", description: "Redeem at any concourse food stand", cost: 50, category: "food" },
  { id: "offer-02", title: "Craft Beer Voucher", description: "One pint at premium bars", cost: 75, category: "food" },
  { id: "offer-03", title: "Team Scarf", description: "Official merchandise from the club shop", cost: 150, category: "merch" },
  { id: "offer-04", title: "VIP Lounge Access", description: "30-min access to the executive lounge", cost: 300, category: "upgrade" },
  { id: "offer-05", title: "Dugout Tour", description: "Post-match stadium tour", cost: 500, category: "experience" },
  { id: "offer-06", title: "Priority Exit Pass", description: "Skip the queue at any gate", cost: 100, category: "upgrade" },
];

export async function getWallet(userId: string): Promise<RewardsWallet> {
  const rows = await db
    .select()
    .from(rewardTransactionsTable)
    .where(eq(rewardTransactionsTable.userId, userId))
    .orderBy(rewardTransactionsTable.createdAt);

  const transactions: RewardTransaction[] = rows.map((r) => ({
    id: r.id,
    type: r.type as "earned" | "redeemed",
    amount: r.amount,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
  }));

  const totalCredits = transactions.reduce(
    (acc, t) => (t.type === "earned" ? acc + t.amount : acc - t.amount),
    0
  );

  return {
    userId,
    totalCredits: Math.max(0, totalCredits),
    transactions,
    availableOffers: AVAILABLE_OFFERS,
  };
}

export async function awardCredits(
  userId: string,
  amount: number,
  description: string
): Promise<void> {
  await db.insert(rewardTransactionsTable).values({
    id: randomUUID(),
    userId,
    type: "earned",
    amount,
    description,
  });
}

export async function claimReward(
  userId: string,
  rewardId: string
): Promise<{ success: boolean; error?: string; wallet?: RewardsWallet }> {
  const offer = AVAILABLE_OFFERS.find((o) => o.id === rewardId);
  if (!offer) return { success: false, error: "Reward not found" };

  const wallet = await getWallet(userId);
  if (wallet.totalCredits < offer.cost) {
    return { success: false, error: "Insufficient credits" };
  }

  await db.insert(rewardTransactionsTable).values({
    id: randomUUID(),
    userId,
    type: "redeemed",
    amount: offer.cost,
    description: `Claimed: ${offer.title}`,
  });

  const updated = await getWallet(userId);
  return { success: true, wallet: updated };
}
