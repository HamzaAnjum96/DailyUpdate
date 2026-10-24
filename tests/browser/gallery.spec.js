import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/templates.html');
  await expect(page.locator('.g-tpl')).toHaveCount(8);
});

test('all examples render and the gallery fits a narrow screen', async ({ page }) => {
  await expect(page.locator('#week-no')).toHaveText('W43');
  await expect(page.locator('.g-msg.err').filter({ hasText: /\S/ })).toHaveCount(0);
  for (const preview of await page.locator('.g-tpl .mg svg').all()) {
    expect(await preview.locator(':scope > *').count()).toBeGreaterThan(0);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('invalid JSON clears the old preview and reset restores the example', async ({ page }) => {
  const bars = page.locator('#mg-bars');
  await expect(bars).toHaveAccessibleName(/"mg" params/);
  await bars.fill('{');
  await expect(bars).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#msg-bars')).toContainText('JSON:');
  await expect(page.locator('#bars .mg svg > *')).toHaveCount(0);
  await page.locator('#bars .g-reset').click();
  await expect(bars).not.toHaveAttribute('aria-invalid', 'true');
  await expect(bars).toBeFocused();
  await expect(page.locator('#msg-bars')).toBeEmpty();
  expect(await page.locator('#bars .mg svg > *').count()).toBeGreaterThan(0);
});

test('rejects non-object JSON and prevents switching template kind', async ({ page }) => {
  const editor = page.locator('#mg-count');
  for (const value of ['null', '[]', '42', '"text"']) {
    await editor.fill(value);
    await expect(page.locator('#msg-count')).toContainText('JSON object');
    await expect(page.locator('#count .mg svg > *')).toHaveCount(0);
  }
  await editor.fill('{"kind":"target"}');
  await expect(page.locator('#msg-count')).toContainText('Use kind "count"');
  await expect(page.locator('#count .mg svg > *')).toHaveCount(0);
  await editor.fill('{"value":"42","caption":"A valid count"}');
  await expect(page.locator('#msg-count')).toBeEmpty();
  expect(await page.locator('#count .mg svg > *').count()).toBeGreaterThan(0);
});

test('invalid template parameters cannot produce a misleading preview', async ({ page }) => {
  const bars = page.locator('#mg-bars');
  await bars.fill('{"kind":"bars","was":0,"now":8}');
  await expect(bars).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#msg-bars')).toContainText('finite prices');
  await expect(page.locator('#bars .mg svg > *')).toHaveCount(0);
  await bars.fill('{"kind":"bars","was":20,"now":8}');
  await expect(page.locator('#msg-bars')).toBeEmpty();
  await expect(page.locator('#bars .mg svg')).toContainText('-60%');
});

test('invalid week starts show an error and recover without page exceptions', async ({ page }) => {
  const exceptions = [];
  page.on('pageerror', (error) => exceptions.push(error.message));
  const week = page.locator('#week-start');
  await week.fill('');
  await expect(week).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#week-error')).toContainText('Choose a Sunday');
  await expect(page.locator('.g-tpl .mg svg > *')).toHaveCount(0);
  await week.fill('2026-10-19');
  await expect(page.locator('#week-error')).toContainText('must start on a Sunday');
  await week.fill('2026-10-18');
  await expect(page.locator('#week-error')).toBeEmpty();
  await expect(week).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#week-no')).toHaveText('W43');
  expect(await page.locator('#week .mg svg > *').count()).toBeGreaterThan(0);
  expect(exceptions).toEqual([]);
});
