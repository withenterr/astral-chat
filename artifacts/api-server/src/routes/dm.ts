import { Router, type IRouter } from "express";
import { eq, or, and, desc } from "drizzle-orm";
import { db, dmConversationsTable, dmMessagesTable } from "@workspace/db";
import { GetOrCreateDmBody, SendDmMessageBody } from "@workspace/api-zod";

const router: IRouter = Router();

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

router.post("/dm/conversations", async (req, res): Promise<void> => {
  const parsed = GetOrCreateDmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { userAId, userAName, userAColor, userBId, userBName, userBColor } = parsed.data;

  const existing = await db
    .select()
    .from(dmConversationsTable)
    .where(
      or(
        and(
          eq(dmConversationsTable.userAId, userAId),
          eq(dmConversationsTable.userBId, userBId)
        ),
        and(
          eq(dmConversationsTable.userAId, userBId),
          eq(dmConversationsTable.userBId, userAId)
        )
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.json(existing[0]);
    return;
  }

  const newConv = {
    id: generateId(),
    userAId,
    userAName,
    userAColor: userAColor ?? null,
    userBId,
    userBName,
    userBColor: userBColor ?? null,
    lastMessageAt: new Date(),
    createdAt: new Date(),
  };

  await db.insert(dmConversationsTable).values(newConv);
  res.json(newConv);
});

router.get("/dm/conversations/user/:userId", async (req, res): Promise<void> => {
  const userId = req.params.userId as string;

  const conversations = await db
    .select()
    .from(dmConversationsTable)
    .where(
      or(
        eq(dmConversationsTable.userAId, userId),
        eq(dmConversationsTable.userBId, userId)
      )
    )
    .orderBy(desc(dmConversationsTable.lastMessageAt));

  res.json(conversations);
});

router.get("/dm/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const limit = parseInt((req.query.limit as string) ?? "50", 10) || 50;

  const messages = await db
    .select()
    .from(dmMessagesTable)
    .where(eq(dmMessagesTable.conversationId, conversationId))
    .orderBy(desc(dmMessagesTable.createdAt))
    .limit(limit);

  res.json(messages.reverse());
});

router.post("/dm/conversations/:conversationId/messages", async (req, res): Promise<void> => {
  const conversationId = req.params.conversationId as string;
  const parsed = SendDmMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const { senderId, senderName, senderColor, content } = parsed.data;

  const newMsg = {
    id: generateId(),
    conversationId,
    senderId,
    senderName,
    senderColor: senderColor ?? null,
    content,
    createdAt: new Date(),
  };

  await db.insert(dmMessagesTable).values(newMsg);

  await db
    .update(dmConversationsTable)
    .set({ lastMessageAt: new Date() })
    .where(eq(dmConversationsTable.id, conversationId));

  res.status(201).json(newMsg);
});

export default router;
