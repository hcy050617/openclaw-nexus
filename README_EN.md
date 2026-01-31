# OpenClaw Nexus

[![npm version](https://img.shields.io/npm/v/@houchenyang/nexus-gateway)](https://www.npmjs.com/package/@houchenyang/nexus-gateway)
[![GitHub stars](https://img.shields.io/github/stars/hcy050617/openclaw-nexus)](https://github.com/hcy050617/openclaw-nexus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[中文](./README.md) | English

AI Chat Forwarding Gateway - Solve rate limiting issues for enterprise IM applications.

## Pain Points

When integrating AI assistants with enterprise IM platforms (like Lark/Feishu, DingTalk, WeCom), you often face:

- **API Rate Limits** - Each platform has message frequency restrictions for bots
- **Duplicate Development** - Each platform requires separate integration work
- **Session Management** - Difficult to manage multiple AI bots uniformly

## Solution

OpenClaw Nexus provides a unified gateway layer:

```
Lark/DingTalk/WeCom            OpenClaw Nexus Gateway              AI Service
       User  ─────────>  [Auth + Forward + Load Balance]  ─────────>  Bot
```

## Project Structure

```
nexus/
├── nexus-gateway/        # Gateway server
│   ├── src/
│   │   ├── index.ts      # Main entry, Express + WebSocket server
│   │   ├── config.ts     # Configuration loader
│   │   ├── session.ts    # User session management
│   │   ├── bot-manager.ts # Bot connection management
│   │   └── types.ts      # Type definitions
│   ├── public/           # Web chat interface
│   └── config.json       # Configuration file
├── extensions/nexus/     # OpenClaw client plugin
│   └── src/
│       ├── channel.ts    # Channel plugin definition
│       ├── bot.ts        # Message handling
│       ├── monitor.ts    # WebSocket connection monitor
│       ├── outbound.ts   # Outbound adapter
│       ├── probe.ts      # Connection probe
│       ├── reply-dispatcher.ts # Reply dispatcher
│       ├── runtime.ts    # Runtime management
│       ├── send.ts       # Send messages
│       ├── accounts.ts   # Account parsing
│       └── types.ts      # Type definitions
└── web-chat/             # Standalone web chat page
```

## Features

- **User Authentication** - Token-based session management with multi-user support
- **Multi-Bot Management** - Support multiple AI bots online simultaneously with auto load balancing
- **Streaming Output** - SSE streaming responses for real-time AI replies
- **Image Messages** - Support sending and receiving image messages (base64 format)
- **Web Interface** - Built-in chat interface with Markdown rendering and code highlighting
- **Heartbeat** - Automatic bot online status detection with timeout disconnect
- **Load Balancing** - Automatic request distribution to available bots
- **Auto Reconnect** - Client plugin supports automatic reconnection

---

## Gateway Server (nexus-gateway)

### Installation

```bash
# Option 1: Global install
npm install -g @houchenyang/nexus-gateway
nexus-gateway

# Option 2: Run with npx
npx @houchenyang/nexus-gateway

# Option 3: Run from source
git clone https://github.com/hcy050617/openclaw-nexus.git
cd openclaw-nexus/nexus-gateway
pnpm install && pnpm build
pnpm start
```

### Configuration

A `config.json` file will be automatically created on first run:

```json
{
  "port": 17392,
  "sessionTTL": 86400000,
  "pingInterval": 30000,
  "botTimeout": 90000,
  "botToken": "your-secret-token",
  "users": {
    "admin": {
      "password": "admin123",
      "displayName": "Admin"
    },
    "user1": {
      "password": "password1",
      "displayName": "User 1"
    }
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | number | 17392 | Server port |
| `sessionTTL` | number | 86400000 | User session TTL (ms), default 24 hours |
| `pingInterval` | number | 30000 | Bot heartbeat interval (ms) |
| `botTimeout` | number | 90000 | Bot timeout (ms) |
| `botToken` | string | "" | Bot authentication token, empty means no auth required |
| `users` | object | - | Web user account configuration |

### Running in Background

#### Using PM2 (Recommended)

```bash
# Install pm2
npm install -g pm2

# Start in working directory (important: must run in config.json directory)
cd /your/nexus-gateway
pm2 start $(which nexus-gateway) --name nexus

# Management commands
pm2 status              # Check status
pm2 logs nexus          # View logs
pm2 stop nexus          # Stop
pm2 restart nexus       # Restart
pm2 save && pm2 startup # Auto-start on boot
```

#### Using systemd

Create service file `/etc/systemd/system/nexus.service`:

```ini
[Unit]
Description=Nexus Gateway
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/nexus
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable nexus
sudo systemctl start nexus
sudo journalctl -u nexus -f  # View logs
```

### API Endpoints

#### Authentication

```bash
# Login
POST /api/login
Content-Type: application/json
{"username": "admin", "password": "xxx"}

# Response
{
  "token": "xxx",
  "user": {"username": "admin", "displayName": "Admin"},
  "expiresAt": 1706686400000
}

# Logout
POST /api/logout
Authorization: Bearer <token>

# Get current user info
GET /api/me
Authorization: Bearer <token>
```

#### Chat

```bash
# Get online bot list
GET /api/bots
Authorization: Bearer <token>

# Response
{"bots": [{"id": "my-bot", "name": "My Bot", "connectedAt": "2024-01-30T..."}]}

# Send message (sync)
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json
{"message": "Hello", "target": "bot-id"}

# Send message (streaming SSE)
POST /api/chat/stream
Authorization: Bearer <token>
Content-Type: application/json
{"message": "Hello", "target": "bot-id", "image": "base64..."}

# SSE event format
data: {"type": "start", "botId": "my-bot", "botName": "My Bot"}
data: {"type": "chunk", "content": "Hel", "done": false}
data: {"type": "chunk", "content": "lo", "done": false}
data: {"type": "end"}
```

#### Health Check

```bash
GET /health
# Response
{"status": "ok", "bots": 2, "botIds": ["bot1", "bot2"]}
```

### Bot WebSocket Protocol

Bots connect via WebSocket to the `/bot-ws` endpoint:

```javascript
const ws = new WebSocket("ws://your-server:17392/bot-ws");

// 1. Send registration message after connecting
ws.send(JSON.stringify({
  type: "register",
  botId: "my-bot",
  botName: "My Bot",
  token: "your-bot-token"  // Must match botToken in config.json
}));

// 2. Receive registration result
// {"type": "registered", "success": true}

// 3. Receive user messages
// {
//   "type": "chat",
//   "id": "msg-xxx",
//   "content": "Hello",
//   "from": "username",
//   "image": "base64...",  // Optional, image data
//   "timestamp": 1706600000000
// }

// 4. Send reply (supports streaming)
ws.send(JSON.stringify({
  type: "reply",
  id: "reply-xxx",
  replyTo: "msg-xxx",
  content: "Hello!",
  done: false,  // false means more content coming
  timestamp: Date.now()
}));

// 5. Heartbeat response
// Reply {"type": "pong"} when receiving {"type": "ping"}
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name nexus.example.com;

    location /bot-ws {
        proxy_pass http://127.0.0.1:17392;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:17392;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Client Plugin (extensions/nexus)

OpenClaw plugin for connecting AI bots to Nexus Gateway.

### Installation

```bash
# Option 1: npm install (recommended)
openclaw plugins install @houchenyang/nexus

# Option 2: Local install
git clone https://github.com/hcy050617/openclaw-nexus.git ~/.openclaw/extensions/nexus
cd ~/.openclaw/extensions/nexus/extensions/nexus
pnpm install && pnpm build
```

### Configuration

Add configuration to `~/.openclaw/openclaw.json`:

```json
{
  "channels": {
    "nexus": {
      "enabled": true,
      "serverUrl": "ws://your-server:17392/bot-ws",
      "botId": "my-bot",
      "botName": "My Bot",
      "token": "your-bot-token",
      "reconnectInterval": 5000,
      "dmPolicy": "open",
      "allowFrom": []
    }
  },
  "plugins": {
    "entries": {
      "nexus": {
        "enabled": true
      }
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Enable/disable |
| `serverUrl` | string | Yes | Nexus Gateway WebSocket URL |
| `botId` | string | Yes | Bot unique identifier |
| `botName` | string | No | Bot display name |
| `token` | string | No | Connection token (must match gateway botToken) |
| `reconnectInterval` | number | No | Reconnect interval (ms), default 5000 |
| `dmPolicy` | string | No | DM policy: open/pairing/allowlist |
| `allowFrom` | array | No | Allowed sender list |

### Command Line Configuration

```bash
# Enable plugin
openclaw config set plugins.entries.nexus.enabled true

# Configure connection
openclaw config set channels.nexus.enabled true
openclaw config set channels.nexus.serverUrl "ws://your-server:17392/bot-ws"
openclaw config set channels.nexus.botId "my-bot"
openclaw config set channels.nexus.botName "My Bot"
openclaw config set channels.nexus.token "your-bot-token"

# Restart to apply
openclaw gateway restart
```

### Plugin Features

- **WebSocket Long Connection** - Maintains persistent connection with gateway
- **Auto Reconnect** - Automatic reconnection after disconnect, configurable interval
- **Heartbeat** - Responds to gateway heartbeat to keep connection alive
- **Message Send/Receive** - Receives user messages, sends AI replies
- **Streaming Reply** - Supports streaming output for real-time reply display
- **Image Messages** - Supports receiving and processing image messages

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Web Users                         │
│          (Browser / Lark / DingTalk / WeCom)         │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP/SSE
                        ▼
┌─────────────────────────────────────────────────────┐
│               Nexus Gateway                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │
│  │  Auth   │  │ Session │  │   Load Balancing    │  │
│  │ Module  │  │ Manager │  │  & Message Forward  │  │
│  └─────────┘  └─────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │ WebSocket
                        ▼
┌─────────────────────────────────────────────────────┐
│                   AI Bots                            │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐          │
│   │ Bot 1   │   │ Bot 2   │   │ Bot N   │          │
│   │ Claude  │   │ GPT     │   │ ...     │          │
│   └─────────┘   └─────────┘   └─────────┘          │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Deploy Gateway

```bash
# Install and start gateway
npm install -g @houchenyang/nexus-gateway
mkdir nexus && cd nexus
nexus-gateway
```

### 2. Configure Gateway

Edit `config.json` to set user accounts and bot token:

```json
{
  "port": 17392,
  "botToken": "my-secret-token",
  "users": {
    "admin": {
      "password": "secure-password",
      "displayName": "Admin"
    }
  }
}
```

### 3. Connect Bot

Install OpenClaw plugin and configure:

```bash
openclaw plugins install @houchenyang/nexus
openclaw config set channels.nexus.enabled true
openclaw config set channels.nexus.serverUrl "ws://your-server:17392/bot-ws"
openclaw config set channels.nexus.botId "my-bot"
openclaw config set channels.nexus.token "my-secret-token"
openclaw gateway restart
```

### 4. Start Using

Visit `http://your-server:17392`, login with configured user account, and start chatting with AI bots.

---

## Development

```bash
# Clone project
git clone https://github.com/hcy050617/openclaw-nexus.git
cd openclaw-nexus

# Install dependencies and build
cd nexus-gateway && pnpm install && pnpm build
cd ../extensions/nexus && pnpm install && pnpm build

# Start development server
cd nexus-gateway && pnpm dev
```

## Contributing

Issues and Pull Requests are welcome!

## License

[MIT License](./LICENSE)
