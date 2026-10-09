FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY python_project_386 ./python_project_386
COPY .env.example ./.env.example

WORKDIR /app/python_project_386

RUN uv run python manage.py collectstatic --noinput || python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["sh", "-c", "uv run gunicorn python_project_386.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3 || gunicorn python_project_386.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]
