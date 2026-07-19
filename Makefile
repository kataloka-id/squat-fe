SHELL := /bin/sh

FRONTEND_PORT ?= 3001
BACKEND_DIR := ../kataloka-main-be

.PHONY: help install local orchestrator stop

help:
	@printf '%s\n' 'make local   Run backend (3000) and frontend (3001) in one terminal.'
	@printf '%s\n' 'make install Install dependencies for both projects.'
	@printf '%s\n' 'make orchestrator [ARGS="..."]  Start Codex with access to both workspaces.'
	@printf '%s\n' 'make stop    Stop processes listening on ports 3000 and 3001.'

install:
	@test -d "$(BACKEND_DIR)" || { echo "Backend directory not found: $(BACKEND_DIR)"; exit 1; }
	npm ci
	cd "$(BACKEND_DIR)" && npm ci

local:
	@test -d "$(BACKEND_DIR)" || { echo "Backend directory not found: $(BACKEND_DIR)"; exit 1; }
	@test -d node_modules || npm ci
	@test -d "$(BACKEND_DIR)/node_modules" || (cd "$(BACKEND_DIR)" && npm ci)
	@echo "Starting backend at http://localhost:3000 ..."
	@cd "$(BACKEND_DIR)" && npm run dev & backend_pid=$$!; \
		trap 'kill "$$backend_pid" 2>/dev/null || true' EXIT INT TERM; \
		echo "Starting frontend at http://localhost:$(FRONTEND_PORT) ..."; \
		echo "Press Ctrl+C to stop both services."; \
		npm run dev -- --port $(FRONTEND_PORT)

orchestrator:
	@./scripts/kataloka-orchestrator $(ARGS)

stop:
	@pids="$$(lsof -tiTCP:3000 -sTCP:LISTEN; lsof -tiTCP:$(FRONTEND_PORT) -sTCP:LISTEN)"; \
	if [ -z "$$pids" ]; then \
		echo "No process is listening on ports 3000 or $(FRONTEND_PORT)."; \
	else \
		echo "Stopping process(es): $$pids"; \
		kill $$pids; \
	fi
