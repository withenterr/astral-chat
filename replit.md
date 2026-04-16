# Chat Platform

## Overview

A real-time, Discord-like multi-server chat platform with no authentication. Guest-based identity stored in localStorage. Built with React + Vite frontend, Express backend, and PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/chat-app) at `/`
- **API framework**: Express 5 (artifacts/api-server) at `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)

## Features

- **Guest-based identity**: Users choose a display name stored in localStorage. No login required.
- **Multi-server**: Create or join multiple chat servers (Discord-like)
- **Real-time chat**: Messages with 3s polling, auto-scroll, message grouping
- **Online presence**: Heartbeat every 15s, online users list updates every 10s
- **Typing indicators**: Sent/cleared automatically, polled every 2s
- **Owner controls**: Rename server, delete server, generate invite codes, generate ownership transfer codes
- **Message deletion**: Authors delete their own; server owner can delete any
- **Dark mode**: Deep charcoal + indigo/violet accent, default dark theme

## Database Tables

- `servers` — chat servers with owner ID, invite code, optional transfer code
- `server_members` — users who joined each server
- `messages` — chat messages with user info
- `presence` — online heartbeats per server/user
- `typing` — typing indicators per server/user

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/chat-app run dev` — run frontend

## LocalStorage Keys

- `chat_user_id` — persistent UUID
- `chat_user_name` — display name
- `chat_user_color` — color (HSL, auto-generated)
- `chat_joined_servers` — JSON array of joined server IDs
