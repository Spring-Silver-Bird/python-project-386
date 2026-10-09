# Календарь звонков


[![hexlet-check](https://github.com/Spring-Silver-Bird/python-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/Spring-Silver-Bird/python-project-386/actions)
[![ci](https://github.com/Spring-Silver-Bird/python-project-386/actions/workflows/ci.yml/badge.svg)](https://github.com/Spring-Silver-Bird/python-project-386/actions/workflows/ci.yml)

Сервис бронирования звонков (каркас). Django-бэкенд + Django-templates фронтенд.

Учебный проект Хекслета: https://ru.hexlet.io/programs/python
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Django
- gunicorn
- psycopg2 (psycopg2-binary)
- python-dotenv
- whitenoise
- Docker + Docker Compose
- pytest + pytest-django, ruff, uv

## Установка

```bash
git clone https://github.com/Spring-Silver-Bird/python-project-386.git
cd python-project-386
cp .env.example .env
make install
make migrate
```

## Использование

Локально (бэкенд + фронтенд на `http://127.0.0.1:8000`):

```bash
make dev    # dev-сервер Django
make start  # prod-режим через gunicorn
```

Проверки:

```bash
make test   # pytest, покрытие >= 80%
make lint   # ruff check + format --check
make check  # manage.py check
```

Docker (бэкенд + Postgres, фронт на `http://localhost:8000`):

```bash
cp .env.example .env
make docker-up
make docker-down
```

Коммиты — Conventional Commits (`feat: ...`, `fix: ...`, ...). После мержа в `main` `release-please` сам создаёт release-PR. Подробнее — в `AGENTS.md`.

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
