SHELL := /bin/sh

FRONTEND_HOST ?= localhost
FRONTEND_PORT ?= 3001
BACKEND_HOST ?= localhost
BACKEND_PORT ?= 3000
BACKEND_DIR := ../kataloka-main-be
BACKEND_DIR_ABS := $(abspath $(BACKEND_DIR))
FRONTEND_DIR_ABS := $(CURDIR)
RUN_DIR ?= /tmp/kataloka-local

.PHONY: help install build local restart-local orchestrator stop

help:
	@printf '%s\n' 'make local   Run backend (localhost:3000) and frontend (localhost:3001) in one terminal.'
	@printf '%s\n' 'make restart-local Stop tracked local services, then start the canonical localhost workflow.'
	@printf '%s\n' 'make install Install dependencies for both projects.'
	@printf '%s\n' 'make build   Build backend, then frontend.'
	@printf '%s\n' 'make orchestrator [ARGS="..."]  Start Codex with access to both workspaces.'
	@printf '%s\n' 'make stop    Stop the service process trees started by make local.'

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
			actual_cwd="$$(lsof -a -p "$$service_pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"; \
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
	cd "$(BACKEND_DIR)" && PORT=$(BACKEND_PORT) NODE_ENV=local exec npm run dev & backend_pid=$$!; \
	if ! record_service backend "$$backend_pid" "$(BACKEND_DIR_ABS)"; then exit 1; fi; \
	trap 'make --no-print-directory stop >/dev/null || true' EXIT INT TERM; \
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
		wait "$$frontend_pid"

restart-local:
	@$(MAKE) --no-print-directory local

orchestrator:
	@./scripts/kataloka-orchestrator $(ARGS)

stop:
	@kill_tree() { \
		for child_pid in $$(pgrep -P "$$1" 2>/dev/null || true); do kill_tree "$$child_pid"; done; \
		kill -TERM "$$1" 2>/dev/null || true; \
	}; \
	process_cwd() { lsof -a -p "$$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p'; }; \
	stopped=""; still_exiting=""; \
	for service in backend frontend; do \
		pid_file="$(RUN_DIR)/$$service.pid"; \
		if [ -f "$$pid_file" ]; then \
			service_pid="$$(sed -n '1p' "$$pid_file")"; \
			expected_started_at="$$(sed -n '2p' "$$pid_file")"; \
			expected_cwd="$$(sed -n '3p' "$$pid_file")"; \
			actual_started_at="$$(ps -p "$$service_pid" -o lstart= 2>/dev/null | tr -s ' ' | sed 's/^ //')"; \
			actual_cwd="$$(process_cwd "$$service_pid")"; \
			if [ -n "$$expected_started_at" ] && [ "$$actual_started_at" = "$$expected_started_at" ] && [ "$$actual_cwd" = "$$expected_cwd" ]; then \
				kill_tree "$$service_pid"; \
				attempt=0; \
				while kill -0 "$$service_pid" 2>/dev/null && [ "$$attempt" -lt 30 ]; do sleep 0.1; attempt=$$((attempt + 1)); done; \
				if kill -0 "$$service_pid" 2>/dev/null; then \
					echo "Sent stop to $$service, but PID $$service_pid is still exiting after 3 seconds."; \
					still_exiting="$$still_exiting $$service"; \
				else \
					stopped="$$stopped $$service"; \
					rm -f "$$pid_file"; \
				fi; \
			elif [ -n "$$actual_started_at" ]; then \
				echo "Skipped $$service: its recorded PID no longer matches the local service identity."; \
				rm -f "$$pid_file"; \
			else \
				echo "Removed stale $$service process record."; \
				rm -f "$$pid_file"; \
			fi; \
		fi; \
	done; \
	if [ -n "$$stopped" ]; then echo "Stopped process tree(s):$$stopped"; fi; \
	if [ -n "$$still_exiting" ]; then echo "Service process tree(s) still exiting:$$still_exiting"; exit 1; fi; \
	if [ -z "$$stopped" ] && [ -z "$$still_exiting" ]; then echo "No local service process is running."; fi
