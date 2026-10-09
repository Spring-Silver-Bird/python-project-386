# Календарь звонков

Сервис бронирования звонков: владельцы выставляют время, гости занимают слоты.

## Language

**Owner**:
Владелец календаря, к которому записываются на звонок.
_Avoid_: Host, User, Manager

**EventType**:
Тип встречи владельца с названием и описанием.
_Avoid_: MeetingType, Service

**Slot**:
Предложенное владельцем окно времени для записи.
_Avoid_: Window, Interval

**Booking**:
Занятый гостем слот.
_Avoid_: Reservation, Appointment, Record

**Guest**:
Человек, бронирующий звонок.
_Avoid_: Client, Visitor, Attendee
