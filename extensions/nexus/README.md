# Nexus Channel

OpenClaw 插件，用于连接 [Nexus Gateway](https://github.com/hcy050617/nexus) 网关服务。

> 这是 [OpenClaw Nexus](https://github.com/hcy050617/nexus) 项目的客户端插件组件。

## 功能

- WebSocket 长连接，自动重连
- 心跳保活
- 消息收发与回复
- 支持流式回复

## 安装

### 方式一：npm 安装

```bash
openclaw plugins install @houchenyang/nexus
```

### 方式二：本地安装

```bash
# 克隆或下载到 extensions 目录
git clone https://github.com/hcy050617/nexus.git ~/.openclaw/extensions/nexus

# 安装依赖并编译
cd ~/.openclaw/extensions/nexus
pnpm install
pnpm build
```

## 配置

在 `~/.openclaw/openclaw.json` 中添加配置：

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
openclaw config set plugins.entries.nexus.enabled true

# 配置连接
openclaw config set channels.nexus.enabled true
openclaw config set channels.nexus.serverUrl "ws://your-server:17392/bot-ws"
openclaw config set channels.nexus.botId "my-bot"
openclaw config set channels.nexus.botName "My Bot"
openclaw config set channels.nexus.token "your-bot-token"

# 重启
openclaw gateway restart
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
├── openclaw.plugin.json  # 插件元数据
├── tsconfig.json         # TypeScript 配置
└── src/
    ├── accounts.ts       # 账户解析
    ├── bot.ts            # 消息处理
    ├── channel.ts        # Channel 插件定义
    ├── openclaw.d.ts     # 类型声明
    ├── monitor.ts        # WebSocket 连接监控
    ├── outbound.ts       # 出站适配器
    ├── probe.ts          # 连接探测
    ├── reply-dispatcher.ts # 回复分发器
    ├── runtime.ts        # 运行时管理
    ├── send.ts           # 发送消息
    └── types.ts          # 类型定义
```

## 相关项目

- [OpenClaw Nexus](https://github.com/hcy050617/nexus) - 主项目
- [Nexus Gateway](https://github.com/hcy050617/nexus/tree/master/nexus-gateway) - 网关服务端

## License

MIT
