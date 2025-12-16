## 配置变量说明

- **CF_EMAIL**: 你的 Cloudflare 邮箱
- **CF_API_KEY**: 你的 Global API Key
- **CF_ZONE_ID**: 你的 Zone ID
- **CF_RECORD_NAME**: DNS 记录名（如 `proxy.example.com`）
- **ACCESS_SECRET**: 自定义访问密码（如 `mypassword123`）

### 操作步骤：

1. 点击 **Save and deploy**。
2. 在 Worker 详情页，点击 **Triggers**。
3. 在 **Cron Triggers** 下，点击 **Add Cron Trigger**。
4. 输入 Cron 表达式：

#### 常用 Cron 表达式

- 每 5 分钟执行一次: