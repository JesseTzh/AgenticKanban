FROM node:22.22.2-bookworm AS web-builder
WORKDIR /src/web
COPY web/package.json web/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY web/ ./
RUN npm run build

FROM golang:1.26.3-bookworm AS go-builder
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
COPY --from=web-builder /src/web/dist ./web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/agentic-kanban ./cmd/server

FROM debian:bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata && rm -rf /var/lib/apt/lists/*
COPY --from=go-builder /out/agentic-kanban /app/agentic-kanban
COPY migrations /app/migrations
COPY configs /app/configs
COPY --from=web-builder /src/web/dist /app/web/dist
ENV APP_ENV=prod HTTP_ADDR=:8080 SQLITE_PATH=/app/data/agentic-kanban.db
VOLUME ["/app/data", "/app/configs"]
EXPOSE 8080
CMD ["/app/agentic-kanban"]
