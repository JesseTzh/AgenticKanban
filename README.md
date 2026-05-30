# AgenticKanban MVP

AgenticKanban 是一个面向 Agentic Coding 工作流的 Kanban 项目管理系统。MVP 覆盖：登录权限、项目与默认看板、任务流转、Agent 领取/提交/人工确认、Git 多仓库配置、Webhook 同步 Commit、手动 Commit 关联、代码复核、测试验收、缺陷返工、完成归档与上下文引用。

## 默认账号

- 用户名：`admin`
- 密码：`admin123`

首次启动时自动创建，请在生产环境初始化后立即修改。

## 本地运行

环境要求：

- Go `1.26.3`
- Node.js `22.22.2`
- npm 使用 `web/package-lock.json` 中固定的依赖版本

```bash
go mod download
cd web && npm ci && npm run build && cd ..
go run ./cmd/server
```

访问：`http://localhost:8080`

后端会从 `WEB_DIST_PATH` 托管前端构建产物，默认值为 `web/dist`。启动时
必须存在该目录以及其中的 `index.html`，否则服务会直接退出。前端路由和
静态资源由 Go 后端提供，`/api/*` 仍保留为 JSON API。

## Docker Compose

部署环境要求：

- Docker Engine `29.5.2`
- Docker Compose `5.1.4`

```bash
cp configs/config.example.env .env
docker compose up --build
```

数据挂载：

```text
./data:/app/data
./configs:/app/configs
```

## 测试

```bash
go test ./...
cd web && npm ci && npm test
```

## 数据访问代码生成

项目固定使用 sqlc `1.31.1`。当前存量查询仍由 `internal/store` 维护；新增
`queries` 文件后可执行：

```bash
go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
```

SQLite 由 `modernc.org/sqlite v1.51.0` 提供，该驱动内嵌 SQLite `3.53.1`。

## Agent Token

登录后调用 `POST /api/agent-tokens` 创建 Agent Token，返回值中的 `token` 只展示一次。Agent 调用接口时使用：

```http
Authorization: Bearer <token>
```

## API 返回格式

所有 `/api/*` JSON 接口，包括浏览器接口、Agent 接口、Webhook 和 API
`404`，统一使用 envelope。该格式为破坏性变更，API 调用方需要从 `data`
读取成功结果，并从 `error` 读取失败详情。

成功响应：

```json
{
  "data": {},
  "error": null
}
```

失败响应：

```json
{
  "data": null,
  "error": {
    "code": "unauthorized",
    "message": "unauthorized"
  }
}
```

HTTP 状态码继续表达请求结果，例如 `201`、`400`、`401`、`403`、`404`
和 `409`。客户端应依据 HTTP 状态码或 `error.code` 分支处理，不应依赖
`error.message`。

## 关键规则

- Ristretto 只缓存 Session、权限、项目、阶段、任务详情等高频读取数据，不作为核心状态来源。
- 任务状态、流转记录、确认记录、测试记录、Webhook 事件、Commit 记录、归档内容全部写入 SQLite。
- Webhook 同步的 Commit 默认不关联任务。
- 系统不会根据 Commit Message、分支名、任务标题或关键词自动关联任务。
- 开发任务没有关联 Commit 时不能进入代码复核。
