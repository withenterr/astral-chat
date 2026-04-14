# World Chat

A small shared chat room app built with plain Node.js and browser JavaScript.

## Run locally

```bash
cd /Users/johnanavenidis/Documents/astral
npm run dev
```

Open `http://localhost:3000`.

## Let people on your Wi-Fi use it

The server now binds to `0.0.0.0`, so people on the same network can open:

```bash
http://YOUR_LOCAL_IP:3000
```

Find your local IP on macOS with:

```bash
ipconfig getifaddr en0
```

## Put it online for the world

You need to run this app on a public server or hosting platform. Any host that can run a Node app or a Docker container will work.

### Option 1: Run directly on a server

```bash
PORT=3000 HOST=0.0.0.0 npm start
```

Then point a domain or reverse proxy at port `3000`.

### Option 2: Run with Docker

Build:

```bash
docker build -t world-chat .
```

Run:

```bash
docker run -p 3000:3000 --name world-chat-app world-chat
```

Then users can open your public server URL, for example:

```text
https://chat.yourdomain.com
```

## Important limitation

This version stores messages and online presence in server memory. If the server restarts, chat history and active users reset.
