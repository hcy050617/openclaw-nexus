# Nexus Gateway

AI Bot Gateway - 连接 Web 用户与 AI 助手的网关服务。

> 这是 [OpenClaw Nexus](https://github.com/hcy050617/openclaw-nexus) 项目的网关服务端组件。

## 特性

- 用户登录认证
- 多 Bot 连接管理
- Bot 连接令牌校验
- 实时消息转发（支持流式输出）
- 简洁的 Web API
- **内置 Web 聊天界面**

## 安装

```bash
# 创建工作目录
mkdir nexus-gateway && cd nexus-gateway

# 安装
npm install -g @houchenyang/nexus-gateway

# 启动（会在当前目录生成 config.json 和 index.html）
nexus-gateway
```

## 配置

编辑 `config.json`（首次启动会自动创建）：

```json
{
  "port": 17392,
  "botToken": "your-secret-token",
  "users": {
    "admin": {
      "password": "your-password",
      "displayName": "管理员"
    }
  }
}
```

- `port`: 服务端口
- `botToken`: Bot 连接认证令牌，留空则不校验
- `users`: Web 用户账号配置

## 后台运行

```bash
# 安装 pm2
npm install -g pm2

# 在工作目录下启动（重要：必须在 config.json 所在目录执行）
cd /your/nexus-gateway
pm2 start $(which nexus-gateway) --name nexus

# 查看状态
pm2 status

# 查看日志
pm2 logs nexus

# 停止/重启
pm2 stop nexus
pm2 restart nexus

# 开机自启
pm2 save
pm2 startup
```

## 源码运行

```bash
git clone https://github.com/hcy050617/openclaw-nexus.git
cd openclaw-nexus/nexus-gateway
pnpm install
pnpm build

# 启动
pnpm start

# 后台启动
nohup pnpm start > nexus.log 2>&1 &

# 查看日志
tail -f nexus.log

# 停止
pkill -f "node dist/index.js"

# 重启
pkill -f "node dist/index.js" && nohup pnpm start > nexus.log 2>&1 &
```

## Web 界面

启动后访问 `http://localhost:17392` 即可使用内置的 Web 聊天界面，支持：

- 用户登录认证
- 在线 Bot 列表
- Markdown 渲染
- 代码高亮
- 流式输出

## 部署

创建服务文件 `/etc/systemd/system/nexus.service`：

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

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable nexus
```

管理服务：

```bash
# 启动
sudo systemctl start nexus

# 停止
sudo systemctl stop nexus

# 重启
sudo systemctl restart nexus

# 查看状态
sudo systemctl status nexus

# 查看日志
sudo journalctl -u nexus -f
```

## API

### 认证

```bash
# 登录
POST /api/login
{"username": "admin", "password": "xxx"}

# 返回
{"token": "xxx", "user": {...}, "expiresAt": ...}
```

### 聊天

```bash
# 发送消息 (需要 Bearer token)
POST /api/chat
Authorization: Bearer <token>
{"message": "你好"}

# 流式聊天 (SSE)
POST /api/chat/stream
Authorization: Bearer <token>
{"message": "你好"}

# 查看在线 Bot
GET /api/bots
Authorization: Bearer <token>
```

### 健康检查

```bash
GET /health
```

## Bot 连接协议

Bot 通过 WebSocket 连接 `/bot-ws`：

```json
// 注册
{"type": "register", "botId": "my-bot", "botName": "My Bot", "token": ""}

// 收到消息
{"type": "chat", "id": "xxx", "content": "你好", "from": "用户名", "timestamp": ...}

// 回复
{"type": "reply", "id": "xxx", "replyTo": "xxx", "content": "回复内容", "done": true, "timestamp": ...}

// 心跳
{"type": "ping"} / {"type": "pong"}
```

## 架构

```
用户 (Web/App)
      │
      ▼
┌─────────────┐
│   Nexus     │ ◄── HTTP API (登录/聊天)
│   Gateway   │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────┐
│   AI Bot    │ ◄── 运行 AI 助手
└─────────────┘
```

## Nginx 反向代理

```nginx
location /bot-ws {
    proxy_pass http://127.0.0.1:17392;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}

location /api/ {
    proxy_pass http://127.0.0.1:17392;
}
```

## License

MIT
