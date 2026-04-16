import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, presenceTable, typingTable, serversTable } from "@workspace/db";
import {
  UpdatePresenceBody,
  SendTypingIndicatorBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ONLINE_THRESHOLD_MS = 30000;
const TYPING_THRESHOLD_MS = 5000;

router.post("/servers/:serverId/presence", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;

  const parsed = UpdatePresenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, userName, userColor } = parsed.data;

  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  const existing = await db
    .select()
    .from(presenceTable)
    .where(
      sql`${presenceTable.serverId} = ${serverId} AND ${presenceTable.userId} = ${userId}`
    );

  if (existing.length === 0) {
    await db.insert(presenceTable).values({
      serverId,
      userId,
      userName,
      userColor: userColor ?? null,
      lastSeen: new Date(),
    });
  } else {
    await db
      .update(presenceTable)
      .set({ userName, userColor: userColor ?? null, lastSeen: new Date() })
      .where(
        sql`${presenceTable.serverId} = ${serverId} AND ${presenceTable.userId} = ${userId}`
      );
  }

  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  const onlineUsers = await db
    .select()
    .from(presenceTable)
    .where(
      sql`${presenceTable.serverId} = ${serverId} AND ${presenceTable.lastSeen} > ${threshold}`
    );

  res.json({ onlineCount: onlineUsers.length });
});

router.get("/servers/:serverId/presence", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;

  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  const onlineUsers = await db
    .select()
    .from(presenceTable)
    .where(
      sql`${presenceTable.serverId} = ${serverId} AND ${presenceTable.lastSeen} > ${threshold}`
    );

  const formatted = onlineUsers.map((u) => ({
    userId: u.userId,
    userName: u.userName,
    userColor: u.userColor ?? undefined,
    lastSeen: u.lastSeen.toISOString(),
  }));

  res.json(formatted);
});

router.post("/servers/:serverId/typing", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;

  const parsed = SendTypingIndicatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, userName, isTyping } = parsed.data;

  const existing = await db
    .select()
    .from(typingTable)
    .where(
      sql`${typingTable.serverId} = ${serverId} AND ${typingTable.userId} = ${userId}`
    );

  if (existing.length === 0) {
    await db.insert(typingTable).values({
      serverId,
      userId,
      userName,
      isTyping,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(typingTable)
      .set({ userName, isTyping, updatedAt: new Date() })
      .where(
        sql`${typingTable.serverId} = ${serverId} AND ${typingTable.userId} = ${userId}`
      );
  }

  res.json({ success: true });
});

router.get("/servers/:serverId/typing", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;

  const threshold = new Date(Date.now() - TYPING_THRESHOLD_MS);
  const typingUsers = await db
    .select()
    .from(typingTable)
    .where(
      sql`${typingTable.serverId} = ${serverId} AND ${typingTable.isTyping} = true AND ${typingTable.updatedAt} > ${threshold}`
    );

  const formatted = typingUsers.map((u) => ({
    userId: u.userId,
    userName: u.userName,
  }));

  res.json(formatted);
});

export default router;
