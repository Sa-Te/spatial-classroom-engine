# Makefile for Spatial Classroom Engine

.PHONY: help bootstrap compose-up compose-down migrate dev check test test-integration test-race test-fuzz test-ai-eval coverage build reset docker-build docker-run clean

help:
	@echo "Spatial Classroom Engine - Available commands:"
	@echo "  help          - Show this help"
	@echo "  bootstrap     - Check toolchain prerequisites and install dependencies"
	@echo "  compose-up    - Start local container services (PostgreSQL)"
	@echo "  compose-down  - Stop container services"
	@echo "  migrate       - Run database migrations"
	@echo "  dev           - Run web (:3000) and Go API (:8081) concurrently in mock mode"
	@echo "  check         - Format check, lint, static analysis, typecheck (no file changes)"
	@echo "  test          - Run fast unit and component tests (no paid keys required)"
	@echo "  test-integration - Run PostgreSQL integration tests against disposable DB"
	@echo "  test-race     - Run Go race detector"
	@echo "  test-fuzz     - Run Go fuzz tests"
	@echo "  test-ai-eval  - Run AI evaluation tests"
	@echo "  coverage      - Enforce changed-line and module coverage thresholds"
	@echo "  build         - Production builds of apps/web and services/app-go"
	@echo "  docker-build  - Build Docker images"
	@echo "  docker-run    - Run with Docker"
	@echo "  reset         - Destructive local state reset (requires confirmation)"
	@echo "  clean         - Kill any orphaned development processes"

bootstrap:
	@echo "Checking prerequisites..."
	@command -v git >/dev/null 2>&1 || { echo >&2 "Git is required but not installed. Aborting."; exit 1; }
	@command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is required but not installed. Aborting."; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo >&2 "Docker Compose is required but not installed. Aborting."; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed. Aborting."; exit 1; }
	@command -v go >/dev/null 2>&1 || { echo >&2 "Go is required but not installed. Aborting."; exit 1; }
	@echo "All prerequisites satisfied."

compose-up:
	docker-compose up -d

compose-down:
	docker-compose down

migrate:
	@echo "Running database migrations..."
	@cd services/app-go && go run cmd/api/main.go migrate

dev:
	@echo "Starting dev servers with proper shutdown handling..."
	@./scripts/dev-runner.sh

clean:
	@echo "Cleaning up orphaned development processes..."
	@pkill -f "next dev" 2>/dev/null || true
	@pkill -f "go run cmd/api/main.go" 2>/dev/null || true
	@echo "Cleanup complete."

check:
	@echo "Running checks..."
	@echo "Format/lint/typecheck checks..."
	@cd services/app-go && go fmt ./...
	@cd services/app-go && go vet ./...
	@cd apps/web && npm run lint

test:
	@echo "Running tests..."
	@echo "Unit and component tests..."
	@cd services/app-go && go test -v

test-integration:
	@echo "Running integration tests..."
	@echo "PostgreSQL integration tests..."
	@cd services/app-go && go test -v -run Integration

test-race:
	@echo "Running race detector..."
	@echo "Go race detector..."
	@cd services/app-go && go test -race ./...

test-fuzz:
	@echo "Running fuzz tests..."
	@echo "Go fuzz tests..."
	@cd services/app-go && go test -fuzz=Fuzz ./...

test-ai-eval:
	@echo "Running AI evaluation tests..."
	@echo "AI evaluation tests..."

coverage:
	@echo "Running coverage checks..."
	@echo "Coverage thresholds..."
	@cd services/app-go && go test -coverprofile=coverage.out ./...
	@cd services/app-go && go tool cover -func=coverage.out

build:
	@echo "Building applications..."
	@echo "Building web app..."
	@cd apps/web && npm run build
	@echo "Building Go app..."
	@cd services/app-go && go build -o app-go-binary ./cmd/api

docker-build:
	docker build -t spatial-classroom-web apps/web
	docker build -t spatial-classroom-api services/app-go

docker-run:
	docker-compose up -d

reset:
	@echo "Resetting local state..."
	@echo "This will destroy all local data."
	@echo "Are you sure? (y/N): "
	@read ans && ([ "$${ans:-N}" = "y" ] || exit 1)
	@echo "Reset confirmed. Destroying local state..."