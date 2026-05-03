# robot-fish 授权开发说明

## 授权流程与接口

1. 用户访问 `/auth/github/login`，重定向到 GitHub 进行登录授权
2. 成功授权后 GitHub 回调 `/auth/github/callback` 并带 code 参数，后端用 code 换取 access_token，再拉取用户信息

### 后端 .env 配置

```
GITHUB_CLIENT_ID=你的GitHub客户端ID
GITHUB_CLIENT_SECRET=你的GitHub客户端密钥
GITHUB_REDIRECT_URI=http://localhost:3001/auth/github/callback
```

### 主要接口
- `GET /auth/github/login` — 跳转 GitHub 第三方授权页
- `GET /auth/github/callback` — 处理登录回调，完成登录状态

可根据需要扩展用户信息存储、session 管理等。
