# Nexus Gateway

AI Bot Gateway - 连接 Web 用户与 AI 助手的网关服务。

## 特性

- 🔐 用户登录认证
- 🤖 多 Bot 连接管理
- 💬 实时消息转发
- 🌐 简洁的 Web API

## 安装

### 方式一：Git 克隆

```bash
git clone https://github.com/your-username/nexus-gateway.git
cd nexus-gateway
pnpm install
pnpm build
```

### 方式二：直接下载

下载项目压缩包，解压到目标目录：

```bash
unzip nexus-gateway.zip -d /opt/nexus
cd /opt/nexus
pnpm install
pnpm build
```

## 启动

```bash
# 前台运行
pnpm start

# 或直接运行编译后的文件
node dist/index.js
```

## 配置

编辑 `config.json`：

```json
{
  "port": 17392,
  "users": {
    "admin": {
      "password": "your-password",
      "displayName": "管理员"
    }
  }
}
```

首次启动会自动创建默认配置。

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

## 生产部署

### 后台运行

```bash
# 安装依赖并编译
pnpm install
pnpm build

# 后台启动
nohup node dist/index.js > nexus.log 2>&1 &

# 查看日志
tail -f nexus.log

# 停止服务
pkill -f "node dist/index.js"
```

### 使用 PM2

```bash
# 安装依赖并编译
pnpm install
pnpm build

# 安装 pm2
npm install -g pm2

# 启动服务
pm2 start dist/index.js --name nexus

# 开机自启
pm2 save
pm2 startup
```

### 使用 Systemd

```bash
# 安装依赖并编译
pnpm install
pnpm build
```

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

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable nexus
sudo systemctl start nexus

# 查看状态
sudo systemctl status nexus
```

### Nginx 反向代理

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
