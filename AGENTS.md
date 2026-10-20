# AGENTS.md

## 1. Назначение

Проект «Календарь звонков» — сервис бронирования звонков, бэкенд на Django.

Работа идёт по API-контракту: контракт — источник истины. Задача агента: не менять поведение без согласования с контрактом.

## 2. Технологии

- Django — бэкенд
- Docker + Docker Compose — запуск и сборка
- DRF (Django REST Framework) — только при необходимости, пока не установлен и не подключён
- БД не обязательна, допустимо хранение в памяти

## 3. Правила работы

- Сначала изучить контракт.
- Не придумывать новые эндпоинты без нужды.
- Не менять форматы запросов/ответов произвольно.
- Если меняется контракт — обновлять реализацию, и наоборот: изменения поведения отражать в контракте.

## 4. Доменные ограничения

- Слот — 30 минут.
- Окно записи — 14 дней от текущей даты.
- Нельзя создать две записи на одно и то же время.
- Бронирование должно проверяться на сервере.

## 5. Структура репозитория

- Django-проект — `python_project_386/` (там `manage.py`); внутренний пакет `python_project_386/python_project_386/` (`settings.py`, `urls.py`, `wsgi.py`). Приложений проекта пока нет — только `django.contrib.*`.
- Фронтенд — `frontend/` (`index.html`, `owner.html`, `app.css`, `app.js`, `owner.js`); данные получает только через API/SDK, сервер их в шаблон не подставляет.
- Контракт — TypeSpec: вход `contract/calendar.tsp`, части — в `contract/calendar/` (сущности, операции, ошибки); это источник истины. Генерация одной командой `make generate`: TypeSpec → `contract/openapi.yaml` → TS SDK (`contract/sdk/`) + бандл (`python_project_386/static/js/calendar-sdk.js`) + серверные типы (`python_project_386/contract_gen/`). Сгенерированное руками не правится. Если файла нет, уточнить у пользователя, не выдумывать эндпоинты.
- Тесты — `python_project_386/tests/` (pytest).
- Docker-файлы — `Dockerfile` и `docker-compose.yml` в корне репозитория.

## 6. Команды

Все команды выполняются из корня репозитория через `make` (используется `uv`):

- `make install` — установить зависимости (`uv sync`, создаёт `.venv` и `uv.lock`); перед запуском скопировать `.env.example` в `.env`
- `make dev` — запустить проект в dev-режиме (`runserver` на `127.0.0.1:8000`); `make start` — то же через `gunicorn`
- `make test` — прогнать тесты (`pytest --cov --cov-report=term --cov-fail-under=80`)
- `make contract` — сгенерировать `contract/openapi.yaml` из TypeSpec (требуется Node >= 22)
- `make generate` — вся цепочка: `contract` → TS SDK + бандл → серверные типы (pydantic)
- `make docker-build` — собрать Docker-образ; `make docker-up` — поднять бэкенд (+Postgres) в Docker
- Проверки после изменений: `make test`, `make lint` (`ruff check .` + `ruff format --check .`), `make check` (`manage.py check`)
- Коммиты — только Conventional Commits (`feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `refactor: ...`, `test: ...`, `ci: ...`): этого требует `release-please` — после мержа в `main` он сам создаёт release-PR

## 7. Что делать агенту

- Сначала читать контракт и существующий код.
- Потом вносить минимальные изменения.
- После изменений запускать проверки (`make test`, `make lint`, `make check`).

## 8. Что не делать

- Не переписывать весь проект без причины.
- Не ломать совместимость с контрактом.
- Не убирать обязательные проверки бронирования.
- Не удалять, не менять и не переименовывать `.github/workflows/hexlet-check.yml` (Hexlet auto-tests) и не переименовывать репозиторий.
- Не коммитить `.idea/` (локальный шум).

## Agent skills

### Issue tracker

Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout (one `GLOSSARY.md` + `docs/adr/`). See `docs/agents/domain.md`.
