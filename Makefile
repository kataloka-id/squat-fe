SHELL := /bin/sh

# Canonical local origins. Keep these coupled with .env.local and the backend
# local CORS configuration; `make local` must never silently switch to 127.0.0.1.
override FRONTEND_HOST := localhost
override FRONTEND_PORT := 3001
override BACKEND_HOST := localhost
override BACKEND_PORT := 3000
BACKEND_DIR := ../kataloka-main-be
BACKEND_DIR_ABS := $(abspath $(BACKEND_DIR))
FRONTEND_DIR_ABS := $(CURDIR)
RUN_DIR ?= /tmp/kataloka-local-$(shell id -u)
# Backend owns database configuration. `neon-dev` sets this to `neon`, which
# makes the backend load its ignored .env.neon file.
BACKEND_NODE_ENV ?= local

.PHONY: help install build local neon-dev local-neon-dev db-neon-dev-migrate db-neon-dev-seed db-neon-dev-provision-admin restart-local orchestrator stop

help:
	@printf '%s\n' 'make local   Run backend (localhost:3000) and frontend (localhost:3001) in one terminal.'
	@printf '%s\n' 'make neon-dev (or make local-neon-dev)  Run local frontend/backend using backend Neon configuration for branch dev.'
	@printf '%s\n' 'make db-neon-dev-migrate NEON_DEV_CONFIRM=...  Apply approved schema migrations to Neon branch dev.'
	@printf '%s\n' 'make db-neon-dev-seed NEON_DEV_CONFIRM=...  Run the approved Neon branch dev seed.'
	@printf '%s\n' 'make db-neon-dev-provision-admin NEON_DEV_CONFIRM=...  Provision one Neon branch dev admin account.'
	@printf '%s\n' 'make restart-local Stop tracked local services, then start the canonical localhost workflow.'
	@printf '%s\n' 'make install Install dependencies for both projects.'
	@printf '%s\n' 'make build   Build backend, then frontend.'
	@printf '%s\n' 'make orchestrator [ARGS="..."]  Start Codex with access to both workspaces.'
	@printf '%s\n' 'make stop    Stop verified local Kataloka service process trees.'

install:
	@test -d "$(BACKEND_DIR)" || { echo "Backend directory not found: $(BACKEND_DIR)"; exit 1; }
	npm ci
	cd "$(BACKEND_DIR)" && npm ci

build:
	@test -d "$(BACKEND_DIR)" || { echo "Backend directory not found: $(BACKEND_DIR)"; exit 1; }
	@test -d node_modules || npm ci
	@test -d "$(BACKEND_DIR)/node_modules" || (cd "$(BACKEND_DIR)" && npm ci)
	@echo "Building backend ..."
	@cd "$(BACKEND_DIR)" && npm run build
	@echo "Building frontend ..."
	@npm run build

local: build
	@$(MAKE) --no-print-directory stop
	@mkdir -p "$(RUN_DIR)"
	@preflight_port() { \
		service="$$1"; host="$$2"; port="$$3"; \
		pids="$$(lsof -nP -tiTCP:"$$port" -sTCP:LISTEN 2>/dev/null || true)"; \
		if [ -n "$$pids" ]; then \
			echo "Cannot start $$service: http://$$host:$$port is already in use by PID(s): $$pids."; \
			echo "Stop the owning process, then run make restart-local again."; \
			exit 1; \
		fi; \
	}; \
	preflight_port backend "$(BACKEND_HOST)" "$(BACKEND_PORT)"; \
	preflight_port frontend "$(FRONTEND_HOST)" "$(FRONTEND_PORT)"
	@echo "Starting backend at http://$(BACKEND_HOST):$(BACKEND_PORT) ..."
	@terminate_tree() { \
		for child_pid in $$(pgrep -P "$$1" 2>/dev/null || true); do terminate_tree "$$child_pid"; done; \
		kill -TERM "$$1" 2>/dev/null || true; \
	}; \
	cleanup() { make --no-print-directory stop >/dev/null || true; }; \
	on_interrupt() { trap - INT TERM; cleanup; exit 0; }; \
	wait_for_exit() { \
		service_pid="$$1"; attempt=0; \
		while kill -0 "$$service_pid" 2>/dev/null && [ "$$attempt" -lt 30 ]; do sleep 0.1; attempt=$$((attempt + 1)); done; \
		! kill -0 "$$service_pid" 2>/dev/null; \
	}; \
	record_service() { \
		service="$$1"; service_pid="$$2"; expected_cwd="$$3"; \
		attempt=0; \
		while [ "$$attempt" -lt 30 ]; do \
			started_at="$$(ps -p "$$service_pid" -o lstart= 2>/dev/null | tr -s ' ' | sed 's/^ //')"; \
			actual_cwd="$$(lsof -p"$$service_pid" -a -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"; \
			if [ -n "$$started_at" ] && [ "$$actual_cwd" = "$$expected_cwd" ]; then \
				printf '%s\n%s\n%s\n' "$$service_pid" "$$started_at" "$$expected_cwd" > "$(RUN_DIR)/$$service.pid"; \
				return 0; \
			fi; \
			sleep 0.1; attempt=$$((attempt + 1)); \
		done; \
		echo "Failed to verify the $$service process identity; stopping PID $$service_pid."; \
		terminate_tree "$$service_pid"; \
		if ! wait_for_exit "$$service_pid"; then echo "PID $$service_pid is still exiting after 3 seconds."; fi; \
		return 1; \
	}; \
	wait_for_listener() { \
		port="$$1"; attempt=0; \
		while [ "$$attempt" -lt 50 ]; do \
			if lsof -nP -iTCP:"$$port" -sTCP:LISTEN >/dev/null 2>&1; then return 0; fi; \
			sleep 0.1; attempt=$$((attempt + 1)); \
		done; \
		return 1; \
	}; \
	cd "$(BACKEND_DIR)" && PORT=$(BACKEND_PORT) NODE_ENV=$(BACKEND_NODE_ENV) exec npm run dev & backend_pid=$$!; \
	if ! record_service backend "$$backend_pid" "$(BACKEND_DIR_ABS)"; then exit 1; fi; \
	trap cleanup EXIT; \
	trap on_interrupt INT TERM; \
	if ! wait_for_listener "$(BACKEND_PORT)"; then \
		echo "Backend did not begin listening on http://$(BACKEND_HOST):$(BACKEND_PORT) within 5 seconds."; \
		terminate_tree "$$backend_pid"; \
		if ! wait_for_exit "$$backend_pid"; then echo "PID $$backend_pid is still exiting after 3 seconds."; fi; \
		rm -f "$(RUN_DIR)/backend.pid"; exit 1; \
	fi; \
		echo "Starting frontend at http://$(FRONTEND_HOST):$(FRONTEND_PORT) ..."; \
		echo "Press Ctrl+C to stop both services."; \
		VITE_API_URL=http://$(BACKEND_HOST):$(BACKEND_PORT) npm run dev -- --host $(FRONTEND_HOST) --port $(FRONTEND_PORT) --strictPort & frontend_pid=$$!; \
	if ! record_service frontend "$$frontend_pid" "$(FRONTEND_DIR_ABS)"; then exit 1; fi; \
		wait "$$frontend_pid"; frontend_status=$$?; \
	if [ "$$frontend_status" -eq 130 ]; then exit 0; fi; \
	exit "$$frontend_status"

# The Neon URL is loaded only by the backend from its ignored .env.neon file.
# This target does not run migrations; it starts the same local API and browser
# workflow as `make local`.
local-neon-dev:
	@$(MAKE) --no-print-directory local BACKEND_NODE_ENV=neon

# Short alias for the documented local-Neon workflow.
neon-dev: local-neon-dev

# Database writes are implemented and guarded by the backend workspace. These
# wrappers keep the developer entrypoint in this repository without exposing
# the Neon URL to the frontend.
db-neon-dev-migrate:
	@$(MAKE) --no-print-directory -C "$(BACKEND_DIR)" db-neon-dev-migrate NEON_DEV_CONFIRM="$(NEON_DEV_CONFIRM)"

db-neon-dev-seed:
	@$(MAKE) --no-print-directory -C "$(BACKEND_DIR)" db-neon-dev-seed NEON_DEV_CONFIRM="$(NEON_DEV_CONFIRM)"

db-neon-dev-provision-admin:
	@$(MAKE) --no-print-directory -C "$(BACKEND_DIR)" db-neon-dev-provision-admin NEON_DEV_CONFIRM="$(NEON_DEV_CONFIRM)"

restart-local:
	@$(MAKE) --no-print-directory local

orchestrator:
	@./scripts/kataloka-orchestrator $(ARGS)

stop:
	@kill_tree() { \
		for child_pid in $$(pgrep -P "$$1" 2>/dev/null || true); do kill_tree "$$child_pid"; done; \
		kill -TERM "$$1" 2>/dev/null || true; \
	}; \
	process_cwd() { lsof -p"$$1" -a -d cwd -Fn 2>/dev/null | sed -n 's/^n//p'; }; \
	process_started_at() { ps -p "$$1" -o lstart= 2>/dev/null | tr -s ' ' | sed 's/^ //'; }; \
	pid_listens_on_port() { \
		listener_pid="$$1"; port="$$2"; listener_pids="$$(lsof -nP -tiTCP:"$$port" -sTCP:LISTEN 2>/dev/null || true)"; \
		case " $$listener_pids " in *" $$listener_pid "*) return 0 ;; *) return 1 ;; esac; \
	}; \
	stop_recorded_tree() { \
		service="$$1"; service_pid="$$2"; expected_cwd="$$3"; expected_started_at="$$4"; source="$$5"; \
		if [ "$$(process_started_at "$$service_pid")" != "$$expected_started_at" ] || [ "$$(process_cwd "$$service_pid")" != "$$expected_cwd" ]; then \
			echo "Skipped $$service ($$source): process identity changed before it could be stopped."; \
			skipped="$$skipped $$service"; \
			return 1; \
		fi; \
		kill_tree "$$service_pid"; \
		attempt=0; \
		while kill -0 "$$service_pid" 2>/dev/null && [ "$$attempt" -lt 30 ]; do sleep 0.1; attempt=$$((attempt + 1)); done; \
		if kill -0 "$$service_pid" 2>/dev/null; then \
			echo "Sent stop to $$service ($$source), but PID $$service_pid is still exiting after 3 seconds."; \
			still_exiting="$$still_exiting $$service"; \
			return 1; \
		fi; \
		stopped="$$stopped $$service"; \
		return 0; \
	}; \
	stop_untracked_listener() { \
		service="$$1"; listener_pid="$$2"; expected_cwd="$$3"; port="$$4"; listener_started_at="$$5"; \
		if [ "$$(process_started_at "$$listener_pid")" != "$$listener_started_at" ] || [ "$$(process_cwd "$$listener_pid")" != "$$expected_cwd" ] || ! pid_listens_on_port "$$listener_pid" "$$port"; then \
			echo "Skipped $$service listener PID $$listener_pid: process identity or port ownership changed before it could be stopped."; \
			skipped="$$skipped $$service"; \
			return 1; \
		fi; \
		kill -TERM "$$listener_pid" 2>/dev/null || true; \
		attempt=0; \
		while kill -0 "$$listener_pid" 2>/dev/null && [ "$$attempt" -lt 30 ]; do sleep 0.1; attempt=$$((attempt + 1)); done; \
		if kill -0 "$$listener_pid" 2>/dev/null; then \
			echo "Sent stop to $$service listener PID $$listener_pid, but it is still exiting after 3 seconds."; \
			still_exiting="$$still_exiting $$service"; \
			return 1; \
		fi; \
		stopped="$$stopped $$service"; \
		return 0; \
	}; \
	stopped=""; still_exiting=""; skipped=""; checked_pids=" "; \
	for service in backend frontend; do \
		case "$$service" in \
			backend) expected_cwd="$(BACKEND_DIR_ABS)"; port="$(BACKEND_PORT)" ;; \
			frontend) expected_cwd="$(FRONTEND_DIR_ABS)"; port="$(FRONTEND_PORT)" ;; \
		esac; \
		pid_file="$(RUN_DIR)/$$service.pid"; \
		if [ -f "$$pid_file" ]; then \
			service_pid="$$(sed -n '1p' "$$pid_file")"; \
			expected_started_at="$$(sed -n '2p' "$$pid_file")"; \
			recorded_cwd="$$(sed -n '3p' "$$pid_file")"; \
			actual_started_at="$$(process_started_at "$$service_pid")"; \
			actual_cwd="$$(process_cwd "$$service_pid")"; \
			case "$$service_pid" in *[!0-9]*|'') actual_started_at="" ;; esac; \
			if [ "$$recorded_cwd" = "$$expected_cwd" ] && [ -n "$$expected_started_at" ] && [ "$$actual_started_at" = "$$expected_started_at" ] && [ "$$actual_cwd" = "$$recorded_cwd" ]; then \
				checked_pids="$$checked_pids$$service_pid "; \
				if stop_recorded_tree "$$service" "$$service_pid" "$$recorded_cwd" "$$expected_started_at" "recorded process"; then rm -f "$$pid_file"; fi; \
			elif [ -n "$$actual_started_at" ]; then \
				echo "Skipped $$service: its recorded PID no longer matches the local service identity."; \
				skipped="$$skipped $$service"; \
				rm -f "$$pid_file"; \
			else \
				echo "Removed stale $$service process record."; \
				rm -f "$$pid_file"; \
			fi; \
		fi; \
		for listener_pid in $$(lsof -nP -tiTCP:"$$port" -sTCP:LISTEN 2>/dev/null || true); do \
			case "$$listener_pid" in *[!0-9]*|'') echo "Skipped untracked $$service listener with an invalid PID on port $$port."; skipped="$$skipped $$service"; continue ;; esac; \
			case "$$checked_pids" in *" $$listener_pid "*) continue ;; esac; \
			listener_cwd="$$(process_cwd "$$listener_pid")"; \
			listener_started_at="$$(process_started_at "$$listener_pid")"; \
			if [ -n "$$listener_started_at" ] && [ "$$listener_cwd" = "$$expected_cwd" ] && pid_listens_on_port "$$listener_pid" "$$port"; then \
				checked_pids="$$checked_pids$$listener_pid "; \
				stop_untracked_listener "$$service" "$$listener_pid" "$$expected_cwd" "$$port" "$$listener_started_at"; \
			else \
				echo "Skipped untracked $$service listener PID $$listener_pid on port $$port: expected working directory $$expected_cwd."; \
				skipped="$$skipped $$service"; \
			fi; \
		done; \
	done; \
	if [ -n "$$stopped" ]; then echo "Stopped process tree(s):$$stopped"; fi; \
	if [ -n "$$still_exiting" ]; then echo "Service process tree(s) still exiting:$$still_exiting"; exit 1; fi; \
	if [ -z "$$stopped" ] && [ -z "$$still_exiting" ] && [ -z "$$skipped" ]; then echo "No local service process is running."; fi
