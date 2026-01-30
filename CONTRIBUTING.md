# 贡献指南

感谢你对 OpenClaw Nexus 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告问题

如果你发现了 Bug 或有功能建议，请在 [GitHub Issues](https://github.com/hcy050617/openclaw-nexus/issues) 中提交。

提交 Issue 时请包含：

- 问题的清晰描述
- 复现步骤（如果是 Bug）
- 期望的行为
- 实际的行为
- 环境信息（操作系统、Node.js 版本等）

### 提交代码

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### Commit 规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：

```
feat(gateway): add rate limiting support
fix(channel): fix reconnection issue
docs: update installation guide
```

## 开发环境

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 本地开发

```bash
# 克隆项目
git clone https://github.com/hcy050617/openclaw-nexus.git
cd openclaw-nexus

# 开发网关
cd nexus-gateway
pnpm install
pnpm dev

# 开发插件
cd extensions/nexus
pnpm install
pnpm dev
```

### 项目结构

```
nexus/
├── nexus-gateway/        # 网关服务端
├── extensions/nexus/     # OpenClaw 客户端插件
└── web-chat/             # 独立 Web 聊天页面
```

## 代码风格

- 使用 TypeScript
- 使用 2 空格缩进
- 函数和变量使用 camelCase
- 类和接口使用 PascalCase

## 许可证

通过提交代码，你同意你的贡献将按照 MIT 许可证进行授权。
