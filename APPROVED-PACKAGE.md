# Approved-пакет v1 — МАКЕТ

> Throwaway-прототип для тикета #7. **Не мержить, PR не открывать.**
> Отвечает на вопрос «как выглядит approved», а не сдаёт готовую спеку.

## 1. Что открывает ревьюер (оглавление)

| # | Артефакт | Что проверить |
|---|---|---|
| 1 | `contract/openapi.yaml` | Сгенерирован из TypeSpec (`make generate` без диффа), версия `1.0.0` |
| 2 | `contract/calendar.tsp` + `contract/calendar/` | Типы/операции/ошибки/правила, CRUD типов отсутствует (Out of scope) |
| 3 | `GLOSSARY.md` | 5 терминов, без синонимов |
| 4 | `docs/adr/0001–0005` | Сетка, окно, уникальность, часы, сиды — все `Status: accepted` |
| 5 | `python_project_386/tests/` | 14 тестов, покрытие ≥ 80%, conformance-тесты против спеки |
| 6 | `templates/index.html` | UI на сгенерированном SDK (`calendar-sdk.js`), без прямых `fetch` |
| 7 | CI (`test`, `lint`, `generate`) | Всё зелёное на мерж-коммите |
| 8 | Release PR | `chore(main): release … 1.0.0`, смержен после этого пакета |

## 2. Чеклист approved-гейта

- [ ] `make test` зелено (покрытие ≥ 80%)
- [ ] `make lint` чисто
- [ ] `make check` без замечаний
- [ ] `make generate` без диффа (CI job `generate` зелёный)
- [ ] Контракт `1.0.0`, код соответствует контракту (сверка D1–D12 закрыта)
- [ ] `/code-review` агента: стандарты + соответствие спеке — без блокеров
- [ ] Ревьюер-человек посмотрел дифф и нажал merge

## 3. Пример diff до approved (иллюстрация, не план работ)

```diff
# contract/calendar.tsp
- enum Versions { v1: "0.1.0" }
+ enum Versions { v1: "1.0.0" }

# calendar_store.py — прошлые слоты сегодня (решение #5)
- taken = is_slot_taken(owner_id, start)
+ taken = is_slot_taken(owner_id, start) or start < now

# views.py — отмена прошлого слота запрещена (решение #5)
+ if slot_start < today: return 400 {"error": ...}

# contract — задокументировать наивные даты и часы 9:00–18:00 (решения #5, ADR-0004)
```

## 4. Шаблон resolution-записи в Decisions-so-far (карта #2)

```md
- #N: <что решено> (<артефакт>, <ключевой факт>). Продолжение — <куда>. Тикет закрыт.
```

Пример: `- #7: формат approved-пакета принят (этот файл; реакция: ок). Тикет закрыт.`
