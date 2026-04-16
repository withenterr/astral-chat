import { Router, type IRouter } from "express";
import { eq, count, sql } from "drizzle-orm";
import { db, serversTable, serverMembersTable } from "@workspace/db";
import {
  CreateServerBody,
  UpdateServerBody,
  DeleteServerBody,
  JoinServerBody,
  JoinByInviteCodeBody,
  FindServerByCodeBody,
  GenerateInviteCodeBody,
  GenerateTransferCodeBody,
  RedeemTransferCodeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

async function getMemberCount(serverId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(serverMembersTable)
    .where(eq(serverMembersTable.serverId, serverId));
  return row?.count ?? 0;
}

async function formatServer(server: typeof serversTable.$inferSelect) {
  const memberCount = await getMemberCount(server.id);
  return {
    id: server.id,
    name: server.name,
    ownerId: server.ownerId,
    inviteCode: server.inviteCode,
    memberCount,
    createdAt: server.createdAt.toISOString(),
  };
}

router.get("/servers", async (req, res): Promise<void> => {
  const servers = await db.select().from(serversTable).orderBy(serversTable.createdAt);
  const formatted = await Promise.all(servers.map(formatServer));
  res.json(formatted);
});

router.post("/servers", async (req, res): Promise<void> => {
  const parsed = CreateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, ownerId, ownerName, ownerColor } = parsed.data;
  const id = generateId();
  const inviteCode = generateCode(8);

  const [server] = await db.insert(serversTable).values({
    id,
    name,
    ownerId,
    inviteCode,
  }).returning();

  await db.insert(serverMembersTable).values({
    serverId: id,
    userId: ownerId,
    userName: ownerName,
    userColor: ownerColor ?? null,
  });

  res.status(201).json(await formatServer(server));
});

router.get("/servers/find-by-code", async (req, res): Promise<void> => {
  const inviteCode = req.query.inviteCode as string;
  if (!inviteCode) {
    res.status(400).json({ error: "inviteCode query param required" });
    return;
  }
  const [server] = await db
    .select()
    .from(serversTable)
    .where(eq(serversTable.inviteCode, inviteCode.toUpperCase()));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.json(await formatServer(server));
});

router.post("/servers/find-by-code", async (req, res): Promise<void> => {
  const parsed = FindServerByCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { inviteCode } = parsed.data;
  const [server] = await db
    .select()
    .from(serversTable)
    .where(eq(serversTable.inviteCode, inviteCode.toUpperCase()));

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.json(await formatServer(server));
});

router.get("/servers/:serverId", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.json(await formatServer(server));
});

router.put("/servers/:serverId", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const parsed = UpdateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, requesterId } = parsed.data;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  if (server.ownerId !== requesterId) {
    res.status(403).json({ error: "Only the owner can rename the server" });
    return;
  }

  const [updated] = await db
    .update(serversTable)
    .set({ name })
    .where(eq(serversTable.id, serverId))
    .returning();

  res.json(await formatServer(updated));
});

router.delete("/servers/:serverId", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const parsed = DeleteServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { requesterId } = parsed.data;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  if (server.ownerId !== requesterId) {
    res.status(403).json({ error: "Only the owner can delete the server" });
    return;
  }

  await db.delete(serversTable).where(eq(serversTable.id, serverId));
  res.sendStatus(204);
});

router.post("/servers/:serverId/join", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const parsed = JoinServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, userName, userColor, inviteCode } = parsed.data;

  let server: typeof serversTable.$inferSelect | undefined;

  if (inviteCode) {
    const [found] = await db
      .select()
      .from(serversTable)
      .where(eq(serversTable.inviteCode, inviteCode.toUpperCase()));
    server = found;
  } else {
    const [found] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));
    server = found;
  }

  if (!server) {
    res.status(404).json({ error: "Server not found or invalid invite code" });
    return;
  }

  const existing = await db
    .select()
    .from(serverMembersTable)
    .where(
      sql`${serverMembersTable.serverId} = ${server.id} AND ${serverMembersTable.userId} = ${userId}`
    );

  if (existing.length === 0) {
    await db.insert(serverMembersTable).values({
      serverId: server.id,
      userId,
      userName,
      userColor: userColor ?? null,
    });
  } else {
    await db
      .update(serverMembersTable)
      .set({ userName, userColor: userColor ?? null })
      .where(
        sql`${serverMembersTable.serverId} = ${server.id} AND ${serverMembersTable.userId} = ${userId}`
      );
  }

  res.json(await formatServer(server));
});

router.post("/servers/:serverId/join-by-code", async (req, res): Promise<void> => {
  const parsed = JoinByInviteCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, userName, userColor, inviteCode } = parsed.data;

  const [server] = await db
    .select()
    .from(serversTable)
    .where(eq(serversTable.inviteCode, inviteCode.toUpperCase()));

  if (!server) {
    res.status(404).json({ error: "Invalid invite code" });
    return;
  }

  const existing = await db
    .select()
    .from(serverMembersTable)
    .where(
      sql`${serverMembersTable.serverId} = ${server.id} AND ${serverMembersTable.userId} = ${userId}`
    );

  if (existing.length === 0) {
    await db.insert(serverMembersTable).values({
      serverId: server.id,
      userId,
      userName,
      userColor: userColor ?? null,
    });
  }

  res.json(await formatServer(server));
});

router.post("/servers/:serverId/invite", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const parsed = GenerateInviteCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { requesterId } = parsed.data;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  if (server.ownerId !== requesterId) {
    res.status(403).json({ error: "Only the owner can generate invite codes" });
    return;
  }

  const newCode = generateCode(8);
  await db
    .update(serversTable)
    .set({ inviteCode: newCode })
    .where(eq(serversTable.id, serverId));

  res.json({ inviteCode: newCode });
});

router.post("/servers/:serverId/transfer", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const parsed = GenerateTransferCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { requesterId } = parsed.data;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  if (server.ownerId !== requesterId) {
    res.status(403).json({ error: "Only the owner can generate transfer codes" });
    return;
  }

  const transferCode = generateCode(12);
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db
    .update(serversTable)
    .set({ transferCode, transferCodeExpiry: expiry })
    .where(eq(serversTable.id, serverId));

  res.json({ transferCode });
});

router.post("/servers/:serverId/redeem-transfer", async (req, res): Promise<void> => {
  const serverId = Array.isArray(req.params.serverId) ? req.params.serverId[0] : req.params.serverId;
  const parsed = RedeemTransferCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, userName, transferCode } = parsed.data;
  const [server] = await db.select().from(serversTable).where(eq(serversTable.id, serverId));

  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  if (!server.transferCode || server.transferCode !== transferCode) {
    res.status(400).json({ error: "Invalid transfer code" });
    return;
  }

  if (server.transferCodeExpiry && server.transferCodeExpiry < new Date()) {
    res.status(400).json({ error: "Transfer code has expired" });
    return;
  }

  if (server.ownerId === userId) {
    res.status(400).json({ error: "You are already the owner" });
    return;
  }

  const [updated] = await db
    .update(serversTable)
    .set({ ownerId: userId, transferCode: null, transferCodeExpiry: null })
    .where(eq(serversTable.id, serverId))
    .returning();

  const existing = await db
    .select()
    .from(serverMembersTable)
    .where(
      sql`${serverMembersTable.serverId} = ${serverId} AND ${serverMembersTable.userId} = ${userId}`
    );

  if (existing.length === 0) {
    await db.insert(serverMembersTable).values({
      serverId,
      userId,
      userName,
      userColor: null,
    });
  }

  res.json(await formatServer(updated));
});

export default router;
