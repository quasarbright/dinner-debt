// Live bill status, end to end: a host and several friends, each in their own
// browser context (so each gets its own anonymous Firebase user), against the
// Firebase emulators. Run with `npm run test:e2e`.

import { expect, test, devices, type Browser, type Page } from '@playwright/test';
import { encodeFormState } from '../src/utils/shareUrl';

const data = encodeFormState({
  items: [
    { name: 'Nachos', cost: 12, portionsPaying: 1, totalPortions: 3 },
    { name: 'Beer', cost: 7, portionsPaying: 1, totalPortions: 1 },
    { name: 'Beer', cost: 7, portionsPaying: 1, totalPortions: 1 },
    { name: 'Burger', cost: 15, portionsPaying: 1, totalPortions: 1 },
  ],
  subtotal: 41,
  total: 44, // $3 tax
  tip: 20,
  tipIsRate: true,
  tipIncludedInTotal: false,
  venmoUsername: 'host-user',
});

const NACHOS = 0, BEER_1 = 1, BEER_2 = 2, BURGER = 3;

async function newPage(browser: Browser, device?: keyof typeof devices): Promise<Page> {
  const context = await browser.newContext(device ? devices[device] : {});
  return context.newPage();
}

const itemStatus = (host: Page, index: number) => host.locator('.host-item-status').nth(index);
const remaining = (host: Page) => host.getByTestId('remaining');

test('host shares, friends pay, everyone sees live status', async ({ browser }) => {
  // Host creates the session at the share step.
  const host = await newPage(browser, 'iPhone 13');
  await host.goto(`?mode=creator-wizard&data=${data}`);
  for (let i = 0; i < 3; i++) await host.locator('.btn-wizard-next').click();
  await expect(host.getByText("Who's paid")).toBeVisible();

  const hostUrl = new URL(host.url());
  const sessionId = hostUrl.searchParams.get('session')!;
  expect(sessionId).toMatch(/^[A-Za-z0-9]{20}$/);
  expect(hostUrl.searchParams.get('mode')).toBe('host');
  await expect(remaining(host)).toHaveText('$52.80'); // $44 + 20% tip
  await expect(host.locator('.btn-wizard-back')).toHaveCount(0); // bill is locked

  const friendLink = `?session=${sessionId}&data=${data}`;

  await test.step('friend A pays for 1/3 of the nachos and the first beer', async () => {
    // Desktop, so the Venmo link is https and we can observe the redirect.
    const friendA = await newPage(browser);
    const venmo = new Promise<string>(resolve =>
      friendA.route('**/venmo.com/**', route => {
        resolve(route.request().url());
        route.abort();
      })
    );
    await friendA.goto(friendLink);
    await friendA.locator('.item-checkbox-item', { hasText: 'Nachos' }).click();
    await friendA.locator('.item-checkbox-item', { hasText: 'Beer' }).first().click();
    await friendA.locator('.btn-wizard-next').click();
    await friendA.locator('.btn-wizard-next').click();
    await friendA.locator('.venmo-button').click();
    expect(await venmo).toContain('recipients=@host-user');

    await expect(itemStatus(host, NACHOS)).toHaveText('1/3 paid');
    await expect(itemStatus(host, BEER_1)).toHaveText('Paid');
    await expect(itemStatus(host, BEER_2)).toHaveText('Unpaid'); // same name and price, separate item
  });

  await test.step('host marks their own burger', async () => {
    await host.getByText('What did you have?').click();
    await host.locator('.host-section').first().locator('.item-checkbox-item', { hasText: 'Burger' }).click();
    await host.getByRole('button', { name: 'Save my items' }).click();
    await expect(itemStatus(host, BURGER)).toHaveText('Paid');
  });

  await test.step('friend B sees paid items grayed out without layout shift, then pays the rest', async () => {
    const friendB = await newPage(browser, 'iPhone 13');
    await friendB.goto(friendLink);
    const items = friendB.locator('.item-checkbox-item');
    await expect(items).toHaveCount(4);
    const boxesBefore = await items.evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));

    await expect(friendB.locator('.item-paid .item-checkbox-name')).toHaveText(['Beer', 'Burger']);
    const boxesAfter = await items.evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()));
    expect(boxesAfter).toEqual(boxesBefore);

    await friendB.locator('.item-checkbox-item', { hasText: 'Nachos' }).click();
    await friendB.locator('.item-checkbox-item:not(.item-paid)', { hasText: 'Beer' }).click();
    await friendB.locator('.btn-wizard-next').click();
    await friendB.locator('.split-config-card-header', { hasText: 'Nachos' }).click();
    await friendB.locator('.split-config-card-body select').nth(1).selectOption('2'); // 2 of 3 portions
    await friendB.locator('.btn-wizard-next').click();
    await friendB.locator('.venmo-button').click(); // venmo:// on phones; nothing to observe

    // 1/3 + 2/3 is exactly one: integer fractions, no float drift.
    await expect(itemStatus(host, NACHOS)).toHaveText('Paid');
    await expect(itemStatus(host, BEER_2)).toHaveText('Paid');
    await expect(remaining(host)).toHaveText('$0.00');
  });

  await test.step('out-of-band payment on a paid item warns the host, removing it clears the warning', async () => {
    await host.getByText('Someone paid another way?').click();
    await host.locator('.host-section').nth(1).locator('.item-checkbox-item', { hasText: 'Burger' }).click();
    await host.getByRole('button', { name: 'Mark paid' }).click();

    await expect(host.locator('.host-overpaid-warning')).toBeVisible();
    await expect(itemStatus(host, BURGER)).toHaveText('Overpaid (2×)');
    await expect(host.locator('.host-marked-entry')).toHaveCount(1);

    await host.getByRole('button', { name: 'Remove' }).click();
    await expect(host.locator('.host-overpaid-warning')).toHaveCount(0);
    await expect(itemStatus(host, BURGER)).toHaveText('Paid');
  });

  await test.step('host dashboard survives a reload', async () => {
    await host.reload();
    await expect(remaining(host)).toHaveText('$0.00');
  });
});

test('a link with an unknown session still works, without live status', async ({ browser }) => {
  const friend = await newPage(browser, 'iPhone 13');
  await friend.goto(`?session=NoSuchSession1234567&data=${data}`);
  await expect(friend.locator('.item-checkbox-item')).toHaveCount(4);
  await friend.waitForTimeout(2000);
  await expect(friend.locator('.item-paid')).toHaveCount(0);

  await friend.locator('.item-checkbox-item', { hasText: 'Burger' }).click();
  await friend.locator('.btn-wizard-next').click();
  await friend.locator('.btn-wizard-next').click();
  await expect(friend.locator('.venmo-button')).toContainText('$19.32'); // 15 + tax + tip share
});
