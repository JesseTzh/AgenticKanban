# AgenticKanban 核心设计说明

AgenticKanban 是一个以 Kanban 为核心驱动的 Agentic Coding 项目管理系统，用于将需求提出、技术拆解、代码实现、代码审核、人工测试和完成归档串联为一套标准化流程，使人类与 Agent 能够围绕同一套任务状态协同工作。

## 一、项目与看板

用户可以创建项目。

每个项目默认包含一个 `AgenticKanban` 看板，用于管理该项目下的需求、任务、代码提交、测试结果和完成归档。

## 二、标准流程阶段

### 1. 需求池

需求池用于承载最初的任务想法、业务需求或临时记录。

需求录入后，可分为以下状态：

- `Not Ready`：需求尚不清晰，需要继续补充说明。
- `Agentic Ready`：需求目标、背景、边界和验收标准已明确，可以交由人工或 Agent 进行技术拆解。

### 2. 技术拆解

技术拆解用于将一个明确需求拆分为可执行的技术任务，例如前端任务、后端任务、接口任务、测试任务等。

拆解可以由人工完成，也可以由 Agent 完成。

如果由 Agent 完成，拆解结果需要先锁定，并等待人工确认。

本阶段状态定义：

- `Not Ready`：拆解结果不完整，任务边界不清晰，或缺少必要的实现说明。
- `Agentic Ready`：技术任务已拆解清楚，执行目标、影响范围、实现要求和验收方式已明确，可以交由人工或 Agent 开发。

### 3. 代码审核

技术任务进入开发后，可以由人工或 Agent 领取并完成代码实现。

开发完成后，需要将对应的 Git 提交记录关联到技术任务，由此形成代码审核任务。

本阶段状态定义：

- `Not Ready`：缺少有效 Git 提交记录，或提交内容与技术任务无法明确对应。
- `Agentic Ready`：代码提交已关联，变更内容清晰，具备进入人工或 Agent 代码审核的条件。

### 4. 测试验证

代码审核通过后，任务进入测试验证阶段。

该阶段由人工进行测试。

测试通过后，任务进入完成状态。

测试不通过时，任务将被打回技术拆解阶段，同时原代码审核任务被锁定，直到新的 Git 提交记录进入审核流程。

本阶段状态定义：

- `Not Ready`：测试条件不足，缺少可验证版本，或相关代码审核尚未完成。
- `Agentic Ready`：测试目标、测试范围和可验证版本已明确，可以交由人工执行测试验证。

### 5. 完成归档

测试通过的任务进入完成归档状态。

已完成任务可以在后续创建新需求时被选择，作为 Agent 执行任务时的上下文参考。

## 三、Agent 工作方式

Agent，例如 Codex，可以根据自身技能，从 Kanban 中获取标记为 `Agentic Ready` 的任务，并按照流程逐一完成。

Agent 参与的核心原则是：

- 只领取 `Agentic Ready` 状态的任务。
- 产出结果必须可追踪。
- 关键节点需要人工确认。
- 代码变更必须关联 Git 提交记录。
- 已完成任务可沉淀为后续任务的上下文。

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
代码审核、测试验收和归档数据。以下账号仅用于本地测试：

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
