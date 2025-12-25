# Build Stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod and sum files
COPY go.mod go.sum ./
# 设置Go代理为国内镜像，加速依赖下载
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/server/main.go

# Final Stage
FROM alpine:latest

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/server .
# Copy config directory (will be mounted/overridden in compose, but good to have structure)
COPY --from=builder /app/configs ./configs

# Expose port
EXPOSE 8080

# Run
CMD ["./server"]
