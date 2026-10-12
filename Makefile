PYTHON ?= python3
DOCKER ?= $(or $(shell command -v docker),$(wildcard /Applications/Docker.app/Contents/Resources/bin/docker),docker)
PNPM ?= pnpm
ifneq ($(wildcard /Applications/Docker.app/Contents/Resources/bin/docker),)
export PATH := /Applications/Docker.app/Contents/Resources/bin:$(PATH)
endif
.PHONY: bootstrap dev stop web test e2e lint typecheck security migrations tools
bootstrap:
	$(PYTHON) scripts/bootstrap.py
dev: bootstrap
	$(DOCKER) compose up --build --wait
	.venv/bin/python scripts/configure-identity.py
	@echo "RailRaksha: http://localhost:3000 | Demo mailbox: http://localhost:8025"
stop:
	$(DOCKER) compose down
web: bootstrap
	$(PYTHON) scripts/run-web.py
test:
	$(PNPM) test
	cd services/api && ../../.venv/bin/pytest
e2e:
	$(PNPM) e2e
lint:
	$(PNPM) lint
	.venv/bin/ruff check scripts services/api
typecheck:
	$(PNPM) typecheck
	.venv/bin/mypy services/api/railraksha services/api/migrations
security:
	$(PYTHON) scripts/security-checks.py
tools:
	$(PYTHON) scripts/install-check-tools.py
migrations:
	$(PYTHON) scripts/test-migrations.py
