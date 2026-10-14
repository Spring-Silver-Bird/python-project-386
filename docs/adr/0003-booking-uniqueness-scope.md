# Уникальность брони по владельцу и времени

Status: accepted. Date: 2026-10-09.

Один активный (`confirmed`) Booking на связку `owner + slotStartAt`; `cancelled` не блокирует слот, `Slot.isAvailable` вычисляется. Так разрешаем повторную запись после отмены без ручной чистки.
