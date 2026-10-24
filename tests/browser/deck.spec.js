import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const brief = JSON.parse(await readFile(new URL('../../data/briefs/2026-w43.json', import.meta.url), 'utf8'));
const archive = JSON.parse(await readFile(new URL('../../data/briefs/index.json', import.meta.url), 'utf8'));

// Use a stable archived week for behavior tests so a weekly content update can
// change the latest card count without invalidating these navigation assertions.
test.beforeEach(async ({ page }) => {
  await page.route('**/data/briefs/index.json', route => route.fulfill({ json: { briefs: ['2026-w43'] } }));
});

test('the published archive opens its latest brief', async ({ page }) => {
  await page.unroute('**/data/briefs/index.json');
  await page.goto('/');
  await expect(page.locator('.deck')).toBeVisible();
  await expect(page).toHaveTitle(`City Ops Brief W${Number(archive.briefs[0].slice(6))}`);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

async function openDeck(page, url = '/') {
  await page.goto(url);
  await expect(page.locator('.slide')).toHaveCount(brief.cards.length + 2);
}

test('deep links, buttons, keyboard and hash changes keep position in sync', async ({ page }) => {
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));
  await openDeck(page, '/?brief=2026-w43#c05');
  await expect(page.locator('.index a[aria-current]')).toHaveAttribute('href', '#c05');
  await page.getByRole('button', { name: 'Next card' }).click();
  await expect(page).toHaveURL(/#c06$/);
  await page.locator('#c06').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page).toHaveURL(/#c05$/);
  await page.evaluate(() => { location.hash = 'c02'; });
  await expect(page.locator('.index a[aria-current]')).toHaveAttribute('href', '#c02');
  await page.locator('.deck-controls').getByRole('link', { name: 'Sources' }).click();
  await expect(page).toHaveURL(/#c17$/);
  await expect(page.getByRole('button', { name: 'Next card' })).toBeDisabled();
  await page.locator('.deck-controls').getByRole('link', { name: 'Cover' }).click();
  await expect(page).toHaveURL(/#c00$/);
  await expect(page.getByRole('button', { name: 'Previous card' })).toBeDisabled();
  expect(exceptions).toEqual([]);
});

test('scrolling and navigation work without IntersectionObserver', async ({ page }) => {
  await page.addInitScript(() => { delete window.IntersectionObserver; });
  await openDeck(page);
  await page.locator('.deck').evaluate(deck => { deck.scrollTop = document.getElementById('c03').offsetTop; });
  await expect(page).toHaveURL(/#c03$/);
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/#c04$/);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`cards remain readable at ${viewport.width} by ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openDeck(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const clipped = await page.locator('.card-in').evaluateAll(cards => cards.flatMap((card, i) => {
      const text = card.querySelector('.card-main,.cover-main');
      return card.scrollHeight > card.clientHeight + 2 || text.clientHeight < 100 ? [i] : [];
    }));
    expect(clipped).toEqual([]);
    await page.locator('.deck-controls').getByRole('link', { name: 'Sources' }).click();
    await expect(page).toHaveURL(/#c17$/);
    await expect(page.locator('#c17')).toBeFocused();
  });
}

test('unknown brief does not silently substitute a different week', async ({ page }) => {
  await page.goto('/?brief=2099-w01');
  await expect(page.getByRole('alert')).toContainText('is not available');
  await expect(page.locator('.deck')).toHaveCount(0);
  await page.getByRole('link', { name: 'Open latest brief' }).click();
  await expect(page.locator('.deck')).toBeVisible();
});

test('failed fetches offer retry and malformed data never reaches the deck', async ({ page }) => {
  await page.route('**/data/briefs/2026-w43.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('HTTP 503');
  await page.unroute('**/data/briefs/2026-w43.json');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.deck')).toBeVisible();
  const bad = structuredClone(brief);
  bad.cards[0].links = [['javascript:alert(1)', 'Unsafe']];
  await page.route('**/data/briefs/2026-w43.json', route => route.fulfill({ json: bad }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Invalid brief');
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});

test('an empty archive shows a recoverable error', async ({ page }) => {
  await page.route('**/data/briefs/index.json', route => route.fulfill({ json: { briefs: [] } }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Invalid brief list');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('archive picker opens the selected week and resets the card', async ({ page }) => {
  await page.route('**/data/briefs/index.json', route => route.fulfill({ json: { briefs: ['2026-w44', '2026-w43'] } }));
  const next = { ...brief, week: 44, start: '2026-10-25', end: '2026-11-01', cards: [{ ...brief.cards[0], mg: undefined }] };
  await page.route('**/data/briefs/2026-w44.json', route => route.fulfill({ json: next }));
  await openDeck(page, '/?brief=2026-w43');
  await page.getByLabel('Choose a brief').selectOption('2026-w44');
  await expect(page).toHaveURL(/\?brief=2026-w44#c00$/);
  await expect(page).toHaveTitle('City Ops Brief W44');
});
