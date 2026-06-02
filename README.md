# AgenticKanban 核心设计说明

AgenticKanban 是一个以 Kanban 为核心驱动的 Agentic Coding 项目管理系统，用于将需求提出、技术拆解、代码实现、代码审核和人工测试串联为一套标准化流程，使人类与 Agent 能够围绕同一套任务状态协同工作。

## 一、项目与看板

用户可以创建项目。

每个项目默认包含一个 `AgenticKanban` 看板，用于管理该项目下的需求、任务、代码提交、测试结果和完成状态。

## 二、标准流程阶段

### 1. 需求澄清

需求澄清必须由人工完成。需求明确后，由人工手动将任务标记为
`Agentic Ready`，开放给 Agent 执行技术拆解。

### 2. 技术拆解

Agent 将拆解结果推送回系统后，任务进入技术拆解阶段并标记为
`Pending Human Review`。人工审核通过后任务标记为 `Agentic Ready`，
Agent 可以领取并执行开发。

审核不通过时任务标记为 `Need Redo`。人工补充审核意见后，需要手动再次
开放给 Agent。审核意见会保留，并在 Agent 再次领取时作为上下文返回。

### 3. 代码审核

Agent 完成开发后提交 Git Commit SHA。系统只接受已经由仓库 Webhook 同步
的 SHA。关联成功后，任务进入代码审核阶段并自动标记为 `Agentic Ready`。

代码审核由 Agent 执行。Agent 返回审核意见和是否通过，任务进入
`Pending Human Review`。人工最终确认通过后，任务进入测试验收；人工否决
或确认 Agent 的不通过意见后，任务返回技术拆解阶段并标记为 `Need Redo`。

### 4. 测试验证

该阶段仅由人工执行，不开放 Agent 领取。测试通过后可以标记任务完成。测试
失败时，同一任务返回技术拆解阶段并标记为 `Need Redo`，等待人工补充上下文
并再次开放给 Agent。

所有任务都可以被同项目中的其他任务引用，作为 Agent 执行任务时的上下文参考。

## 三、Agent 工作方式

Agent，例如 Codex，可以根据自身技能，从 Kanban 中获取标记为 `Agentic Ready` 的任务，并按照流程逐一完成。

Agent 参与的核心原则是：

- 只领取 `Agentic Ready` 状态的任务。
- 产出结果必须可追踪。
- 关键节点需要人工确认。
- 代码变更必须关联 Git 提交记录。
- 同项目中的所有任务均可被引用为后续任务的上下文。

## 四、Agent 密钥

登录用户可以在 `Agent 密钥` 页面创建自己的访问密钥。密钥明文只在创建时
显示一次，Agent 使用以下请求头访问 `/api/agent/*` 接口：

```http
Authorization: Bearer <agent-key>
```

系统会按密钥记录执行来源，并可追踪到创建该密钥的用户。管理员可以查看全部
密钥元数据，普通用户只能查看自己的密钥。

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
必须存在该目录以及其中的 `index.html`，否则服务会直接退出。

## Docker Compose

```bash
cp configs/config.example.env .env
docker compose up --build
```

## 测试

```bash
go test ./...
cd web && npm ci && npm test
```

## 本地演示数据

需要为本地测试补充完整演示数据时，执行：

```bash
go run ./cmd/seed
```

脚本默认写入 `data/agentic-kanban.db`，也可以通过 `SQLITE_PATH` 指定其他
SQLite 文件。脚本会先执行数据库迁移，再补充固定的演示记录。重复执行时
不会清空或覆盖现有数据，只会写入缺失的演示记录。

脚本会补充多个项目、各流程阶段的任务、子任务、仓库、Commit、审批、
代码审核、测试验收、完成状态和任务引用数据。以下账号仅用于本地测试：

| 用户名 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `admin123` | 管理员 |
| `manager` | `manager123` | 经理 |
| `developer` | `developer123` | 开发者 |

## 数据访问代码生成

新增 `queries` 文件后执行：

```bash
go run github.com/sqlc-dev/sqlc/cmd/sqlc@v1.31.1 generate
```
