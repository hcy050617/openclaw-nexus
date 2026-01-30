# Nexus Channel

Clawdbot/Moltbot 插件，用于连接 [Nexus Gateway](../../../.moltbot/nexus) 网关服务。

## 功能

- WebSocket 长连接，自动重连
- 心跳保活
- 消息收发与回复
- 支持流式回复

## 安装

### 方式一：本地安装

```bash
# 克隆或下载到 extensions 目录
git clone https://github.com/your-username/nexus-channel.git ~/.clawdbot/extensions/nexus

# 安装依赖并编译
cd ~/.clawdbot/extensions/nexus
pnpm install
pnpm build
```

### 方式二：npm 安装（发布后）

```bash
clawdbot plugins install @moltbot/nexus
```

## 配置

在 `~/.clawdbot/clawdbot.json` 中添加配置：

```json
{
  "channels": {
    "nexus": {
      "enabled": true,
      "serverUrl": "ws://your-server:17392/bot-ws",
      "botId": "my-bot",
      "botName": "My Bot",
      "token": ""
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

### 配置说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `enabled` | boolean | 是否启用 |
| `serverUrl` | string | Nexus Gateway WebSocket 地址 |
| `botId` | string | Bot 唯一标识 |
| `botName` | string | Bot 显示名称 |
| `token` | string | 连接令牌（可选） |

## 使用命令

```bash
# 启用插件
clawdbot config set plugins.entries.nexus.enabled true

# 配置连接
clawdbot config set channels.nexus.enabled true
clawdbot config set channels.nexus.serverUrl "ws://your-server:17392/bot-ws"
clawdbot config set channels.nexus.botId "my-bot"
clawdbot config set channels.nexus.botName "My Bot"

# 重启
clawdbot gateway restart
```

## WebSocket 协议

### 注册

Bot 连接后发送注册消息：

```json
{
  "type": "register",
  "botId": "my-bot",
  "botName": "My Bot",
  "token": ""
}
```

### 接收消息

Gateway 转发用户消息：

```json
{
  "type": "chat",
  "id": "msg-xxx",
  "content": "你好",
  "from": "用户名",
  "timestamp": 1706600000000
}
```

### 回复消息

Bot 发送回复：

```json
{
  "type": "reply",
  "id": "reply-xxx",
  "replyTo": "msg-xxx",
  "content": "回复内容",
  "done": true,
  "timestamp": 1706600001000
}
```

支持流式回复，`done: false` 表示未完成。

### 心跳

```json
// Gateway -> Bot
{"type": "ping"}

// Bot -> Gateway
{"type": "pong"}
```

## 文件结构

```
nexus-channel/
├── index.ts              # 插件入口
├── package.json          # 包配置
├── clawdbot.plugin.json  # 插件元数据
├── tsconfig.json         # TypeScript 配置
└── src/
    ├── accounts.ts       # 账户解析
    ├── bot.ts            # 消息处理
    ├── channel.ts        # Channel 插件定义
    ├── clawdbot.d.ts     # 类型声明
    ├── monitor.ts        # WebSocket 连接监控
    ├── outbound.ts       # 出站适配器
    ├── probe.ts          # 连接探测
    ├── reply-dispatcher.ts # 回复分发器
    ├── runtime.ts        # 运行时管理
    ├── send.ts           # 发送消息
    └── types.ts          # 类型定义
```

## 相关项目

- [Nexus Gateway](https://github.com/your-username/nexus-gateway) - 网关服务端

## License

MIT
