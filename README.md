变量名
CF_EMAIL	你的 Cloudflare 邮箱	
CF_API_KEY	你的 Global API Key	
CF_ZONE_ID	你的 Zone ID	
CF_RECORD_NAME	DNS 记录名（如 proxy.example.com）	
ACCESS_SECRET	自定义访问密码（如 mypassword123）	
点击 Save and deploy
在 Worker 详情页点击 Triggers
在 Cron Triggers 下点击 Add Cron Trigger
输入 cron 表达式：# 每 5 分钟执行一次
*/5 * * * *

# 每 10 分钟执行一次
*/10 * * * *

# 每小时执行一次
0 * * * *
