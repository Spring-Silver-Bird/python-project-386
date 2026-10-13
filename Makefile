.PHONY: install start dev migrate test lint lint-fix check contract docker-build docker-up docker-down collectstatic

install:
	uv sync

start:
	uv run gunicorn python_project_386.wsgi:application --chdir python_project_386 --bind 127.0.0.1:8000 --workers 2

dev:
	uv run python python_project_386/manage.py runserver 127.0.0.1:8000

migrate:
	uv run python python_project_386/manage.py migrate

collectstatic:
	uv run python python_project_386/manage.py collectstatic --noinput

test:
	uv run pytest --cov --cov-report=term --cov-fail-under=80

lint:
	uv run ruff check .
	uv run ruff format --check .

lint-fix:
	uv run ruff check --fix .
	uv run ruff format .

check:
	uv run python python_project_386/manage.py check

contract:
	node -e "const m=process.version.match(/v(\d+)/); if (+m[1] < 22) { console.error('contract needs Node >= 22, current ' + process.version + ' (try: nvm use 22)'); process.exit(1); }"
	cd contract && npm ci --no-audit --no-fund
	cd contract && npx tsp compile calendar.tsp --emit @typespec/openapi3
	# @versioned emitter writes openapi.<version>.yaml; single version expected
	cp contract/tsp-output/@typespec/openapi3/openapi.*.yaml contract/openapi.yaml

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down
