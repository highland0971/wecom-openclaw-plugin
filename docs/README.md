# 文档目录

本目录包含企业微信 OpenClaw 插件的架构设计和技术文档。

## 📂 目录结构

```
docs/
├── CALLBACK_DESIGN.md      # 回调集成架构设计
├── CALLBACK_GUIDE.md       # 回调集成使用指南
├── DUAL_MODE_ARCHITECTURE.md  # 双模式架构设计
└── dev-notes/              # 开发过程记录（仅供参考）
```

## 📖 文档说明

### 架构设计文档

| 文档 | 内容 |
|------|------|
| **CALLBACK_DESIGN.md** | 企业微信回调（Webhook）集成架构设计，包含加密解密、签名验证、消息处理流程 |
| **DUAL_MODE_ARCHITECTURE.md** | WebSocket Bot 模式 + HTTP 回调模式的双模式并存架构设计 |
| **CALLBACK_GUIDE.md** | 回调集成的配置步骤和部署指南 |

### 开发记录 (dev-notes/)

这些文档记录了开发调试过程中的问题和解决方案，功能已完成，仅供参考：

- `FINAL_SOLUTION.md` - 回调模式 deliver 不触发问题的最终解决方案
- `DEV_PROGRESS.md` - MCP Server → OpenAPI 替换的开发进度
- `WORK_PROGRESS.md` / `WORK_PROGRESS_SAVE.md` - 工作进度记录
- `TEST_PLAN.md` - 集成测试方案
- 其他调试和配置记录

> ⚠️ 注意：`dev-notes/` 中的文档是开发过程中的临时记录，可能包含过时信息。

## 🔗 相关链接

- [企业微信 API 文档](https://developer.work.weixin.qq.com/document/path/90664)
- [OpenClaw 官方文档](https://docs.openclaw.ai/)
- [项目 README](../README.md)