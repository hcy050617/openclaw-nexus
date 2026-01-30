# OpenClaw Nexus

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
│   ├── src/              # Source code
│   ├── public/           # Web chat interface
│   └── config.json       # Configuration file
├── extensions/nexus/     # OpenClaw client plugin
│   └── src/              # Plugin source code
└── web-chat/             # Standalone web chat page
```

## Quick Start

### 1. Install Gateway

```bash
# Using npm
npm install -g @houchenyang/nexus-gateway
nexus-gateway

# Or using npx
npx @houchenyang/nexus-gateway
```

### 2. Configuration

Edit `config.json`:

```json
{
  "port": 17392,
  "botToken": "your-secret-token",
  "users": {
    "admin": {
      "password": "your-password",
      "displayName": "Admin"
    }
  }
}
```

### 3. Access Web Interface

After starting, visit `http://localhost:17392` to use the built-in web chat interface.

### 4. Connect OpenClaw

Install the OpenClaw plugin and configure connection:

```bash
openclaw plugins install @houchenyang/nexus
openclaw config set channels.nexus.serverUrl "ws://your-server:17392/bot-ws"
openclaw config set channels.nexus.botId "my-bot"
```

## Features

- **User Authentication** - Token-based session management
- **Multi-Bot Management** - Support multiple AI bots online simultaneously
- **Streaming Output** - Support SSE streaming responses
- **Web Interface** - Built-in chat interface with Markdown rendering
- **Heartbeat** - Automatic bot online status detection
- **Load Balancing** - Automatic request distribution to available bots

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

## Documentation

- [Gateway Server Documentation](./nexus-gateway/README.md)
- [Client Plugin Documentation](./extensions/nexus/README.md)

## Development

```bash
# Clone the project
git clone https://github.com/hcy050617/nexus.git
cd nexus

# Install dependencies
cd nexus-gateway && pnpm install && pnpm build
cd ../extensions/nexus && pnpm install && pnpm build

# Start development server
cd nexus-gateway && pnpm dev
```

## Contributing

Issues and Pull Requests are welcome!

## License

[MIT License](./LICENSE)
