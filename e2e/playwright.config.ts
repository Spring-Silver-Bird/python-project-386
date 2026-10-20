import { defineConfig, devices } from "@playwright/test";

const PORT = 8000;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `uv run python python_project_386/manage.py runserver 127.0.0.1:${PORT} --noreload`,
    cwd: "..",
    url: `${BASE_URL}/api/owners/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
