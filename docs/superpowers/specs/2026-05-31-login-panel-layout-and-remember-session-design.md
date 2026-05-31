# 登录页右侧排版与记住登录设计

## 目标

参考 `/Users/jessetzh/CodeSpace/Nex-UI-Re/NexVault-React` 的登录页右侧排版，调整 AgenticKanban 登录表单区域，并新增真实可用的“记住登录”能力。

保留当前登录页左侧工作流展示动画、主题切换、错误提示和登录中进度线。所有新增页面元素都必须包含 `data-test-id`。

## 右侧排版

右侧登录区域改为参考项目的面板式布局：

- 桌面端占登录页右侧约 `40%`，移动端占满宽度。
- 使用半透明背景和模糊效果，不再使用独立 `Card` 外框。
- 表单内容限制为 `max-w-md`，在面板内居中。
- 标题区增加短色条、小号引导文案、主标题和说明。
- 用户名与密码输入框增加左侧图标，并扩大表单垂直间距。
- 提交按钮加高，继续展示登录中状态和进度线。
- 表单增加“记住登录”复选框。

不新增“忘记密码”和“创建账号”入口，因为项目当前没有对应流程。

## 记住登录语义

当前认证由后端设置 `HttpOnly` Cookie `ak_session`。继续沿用 Cookie 认证，不引入前端 token 存储。

登录请求新增 `remember: boolean`：

- 未勾选时，后端设置无 `Max-Age` 的会话 Cookie。刷新页面和同一浏览器会话内仍有效，浏览器关闭后失效。
- 勾选时，后端设置带 `Max-Age=SESSION_TTL` 的持久 Cookie。默认配置下保留 24 小时。
- 两种模式下，服务端 Session 的过期时间均继续使用 `SESSION_TTL`。
- Cookie 继续保持 `HttpOnly`，路径继续为 `/`。
- 登出逻辑保持不变。

浏览器 Cookie 在同一浏览器的标签页之间共享，因此未勾选模式不能可靠实现“关闭单个标签页立即失效”。本设计明确采用浏览器会话级语义。

## 接口变更

`POST /api/auth/login` 请求体从：

```json
{
  "username": "admin",
  "password": "admin123"
}
```

调整为：

```json
{
  "username": "admin",
  "password": "admin123",
  "remember": true
}
```

`remember` 未提供时按 `false` 处理，保持旧调用兼容。

## 测试

后端测试覆盖：

- 默认登录返回会话 Cookie，`MaxAge` 为 `0`。
- `remember: true` 登录返回持久 Cookie，`MaxAge` 等于配置的 `SESSION_TTL` 秒数。

前端测试覆盖：

- 登录页渲染“记住登录”复选框。
- 默认登录请求携带 `remember: false`。
- 勾选后登录请求携带 `remember: true`。
- 右侧面板和新增结构保留稳定的 `data-test-id`。

验证命令：

```bash
go test ./internal/httpapi
cd web && npm run test
cd web && npm run build
git diff --check
```
