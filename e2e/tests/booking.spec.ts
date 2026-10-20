import { expect, test, type Page } from "@playwright/test";

const MOSCOW_TZ = "Europe/Moscow";

function moscowDate(offsetDays: number): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOSCOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function openSlots(page: Page, date: string, typeLabel?: string): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Показать слоты" })).toBeVisible();
  if (typeLabel) {
    await page.getByLabel("Тип встречи").selectOption({ label: typeLabel });
  }
  await page.getByLabel("Дата").fill(date);
  await page.getByRole("button", { name: "Показать слоты" }).click();
}

async function bookFirstAvailableSlot(
  page: Page,
  options: { date: string; typeLabel?: string; name: string; email: string },
): Promise<string> {
  await openSlots(page, options.date, options.typeLabel);
  const slot = page.locator(".slot:not(.taken)").first();
  await expect(slot).toBeVisible();
  const label = ((await slot.textContent()) ?? "").trim();
  await slot.click();
  await page.getByPlaceholder("Ваше имя").fill(options.name);
  await page.getByPlaceholder("Email").fill(options.email);
  await page.getByRole("button", { name: "Забронировать" }).click();
  return label;
}

test("гость бронирует слот и видит подтверждение", async ({ page }) => {
  const date = moscowDate(1);
  const label = await bookFirstAvailableSlot(page, {
    date,
    name: "Гость Один",
    email: "guest-one@example.com",
  });

  await expect(page.locator("#msg")).toContainText(/Готово! Запись №\d+ создана/);
  await expect(page.locator("#my")).toContainText("guest-one@example.com");

  const taken = page.locator(".grid .slot.taken").filter({ hasText: label });
  await expect(taken).toBeVisible();
  await expect(taken).toBeDisabled();
});

test("второй гость получает отказ на занятый слот", async ({ browser }) => {
  const date = moscowDate(2);
  const firstGuest = await browser.newContext();
  const secondGuest = await browser.newContext();
  const firstPage = await firstGuest.newPage();
  const secondPage = await secondGuest.newPage();

  await openSlots(firstPage, date);
  await openSlots(secondPage, date);

  const firstSlot = firstPage.locator(".slot:not(.taken)").first();
  const secondSlot = secondPage.locator(".slot:not(.taken)").first();
  await expect(firstSlot).toBeVisible();
  await expect(secondSlot).toBeVisible();
  const label = ((await firstSlot.textContent()) ?? "").trim();
  expect(((await secondSlot.textContent()) ?? "").trim()).toBe(label);

  await firstSlot.click();
  await firstPage.getByPlaceholder("Ваше имя").fill("Гость А");
  await firstPage.getByPlaceholder("Email").fill("guest-a@example.com");
  await firstPage.getByRole("button", { name: "Забронировать" }).click();
  await expect(firstPage.locator("#msg")).toContainText(/Готово! Запись №\d+ создана/);

  await secondSlot.click();
  await secondPage.getByPlaceholder("Ваше имя").fill("Гость Б");
  await secondPage.getByPlaceholder("Email").fill("guest-b@example.com");
  const [conflict] = await Promise.all([
    secondPage.waitForResponse(
      (response) => response.url().includes("/api/bookings/") && response.request().method() === "POST",
    ),
    secondPage.getByRole("button", { name: "Забронировать" }).click(),
  ]);
  expect(conflict.status()).toBe(409);
  await expect(secondPage.locator("#msg")).toContainText("слот уже занят");
  await expect(secondPage.locator("#my")).not.toContainText("guest-b@example.com");

  await firstGuest.close();
  await secondGuest.close();
});

test("владелец создаёт тип, а гость на него записывается", async ({ page }) => {
  const title = `Знакомство ${Date.now()}`;
  const date = moscowDate(3);
  const guestEmail = "guest-owner@example.com";

  await page.goto("/owner/");
  await expect(page.locator("#ownerTypes")).toContainText("Звонок 30 минут");

  await page.getByPlaceholder("Название типа встречи").fill(title);
  await page.getByPlaceholder("Описание (необязательно)").fill("Создан в e2e");
  await page.getByRole("button", { name: "Создать тип встречи" }).click();
  await expect(page.locator("#msg")).toContainText(/Тип встречи №\d+ создан/);
  await expect(page.locator("#ownerTypes")).toContainText(title);

  await bookFirstAvailableSlot(page, {
    date,
    typeLabel: `${title} (30 мин)`,
    name: "Гость Владельца",
    email: guestEmail,
  });
  await expect(page.locator("#msg")).toContainText(/Готово! Запись №\d+ создана/);

  await page.goto("/owner/");
  const upcoming = page.locator("#ownerBookings");
  await expect(upcoming).toContainText("Гость Владельца");
  await expect(upcoming).toContainText(guestEmail);
  await expect(upcoming).toContainText(title);
  await expect(upcoming).toContainText("подтверждена");
});
