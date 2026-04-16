import { Router, type IRouter } from "express";
import { eq, desc, lt, sql } from "drizzle-orm";
import { db, messagesTable, serversTable } from "@workspace/db";
import {
  CreateMessageBody,
  DeleteMessageBody,
  ListMessagesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

router.get("/servers/:serverId/messages", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;

  const queryParsed = ListMessagesQueryParams.safeParse(req.query);
  const limit = queryParsed.success ? (queryParsed.data.limit ?? 50) : 50;
  const before = queryParsed.success ? queryParsed.data.before : undefined;

  let query = db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.serverId, serverId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(limit);

  if (before) {
    const beforeDate = new Date(before);
    query = db
      .select()
      .from(messagesTable)
      .where(
        sql`${messagesTable.serverId} = ${serverId} AND ${messagesTable.createdAt} < ${beforeDate}`
      )
      .orderBy(desc(messagesTable.createdAt))
      .limit(limit);
  }

  const messages = await query;
  const formatted = messages.reverse().map((m) => ({
    id: m.id,
    serverId: m.serverId,
    userId: m.userId,
    userName: m.userName,
    userColor: m.userColor ?? undefined,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  res.json(formatted);
});

router.post("/servers/:serverId/messages", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;

  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, userName, userColor, content } = parsed.data;
  if (!content || content.trim() === "") {
    res.status(400).json({ error: "Message content cannot be empty" });
    return;
  }

  const id = generateId();
  const [message] = await db
    .insert(messagesTable)
    .values({
      id,
      serverId,
      userId,
      userName,
      userColor: userColor ?? null,
      content: content.trim(),
    })
    .returning();

  res.status(201).json({
    id: message.id,
    serverId: message.serverId,
    userId: message.userId,
    userName: message.userName,
    userColor: message.userColor ?? undefined,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });
});

router.delete("/servers/:serverId/messages/:messageId", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const messageId = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;

  const parsed = DeleteMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { requesterId } = parsed.data;

  const [message] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, messageId));

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));

  const isAuthor = message.userId === requesterId;
  const isOwner = server?.ownerId === requesterId;

  if (!isAuthor && !isOwner) {
    res.status(403).json({ error: "You can only delete your own messages or messages as server owner" });
    return;
  }

  await db.delete(messagesTable).where(eq(messagesTable.id, messageId));
  res.sendStatus(204);
});

export default router;
