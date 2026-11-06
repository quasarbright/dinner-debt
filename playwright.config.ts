// End-to-end tests for live sessions. Run with `npm run test:e2e`, which
// starts the Firebase emulators and then runs Playwright. Playwright starts
// the dev server (in emulator mode) itself.
// First time on a new machine: `npx playwright install chromium`.
import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/dinner-debt/`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'react-scripts start',
    url: `http://localhost:${PORT}/dinner-debt/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      BROWSER: 'none',
      REACT_APP_FIREBASE_EMULATORS: 'true',
    },
  },
});
