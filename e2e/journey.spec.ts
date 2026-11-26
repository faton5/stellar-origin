import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const apod = {
  status: 'ok',
  apod: {
    date: '2001-01-01',
    title: 'A Real Test Galaxy',
    explanationHtml: '<p>Original science text.</p>',
    creditHtml: 'Credit: Test observer',
    copyrightHtml: '© Test owner',
    alt: 'A galaxy',
    mediaType: 'image',
    articleUrl: 'https://science.nasa.gov/image-article/test/',
    imageUrl: 'https://assets.science.nasa.gov/test.jpg'
  }
};

test('journey reveals a dated APOD and astronomy without leaving the birth date in the URL', async ({ page }) => {
  await page.route('**/api/apod', route => route.fulfill({ json: apod }));
  await page.goto('/');
  await page.getByLabel('Date of birth').fill('2001-01-01');
  await page.getByRole('button', { name: 'Explore your universe' }).click();
  await expect(page.getByText('A Real Test Galaxy')).toBeVisible();
  await expect(page.getByText('Original science text.')).toBeVisible();
  await expect(page.getByText('Credit: Test observer')).toBeVisible();
  await expect(page.getByText('© Test owner')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Your moon/i })).toBeVisible();
  await expect(page.locator('.moon-data').getByText(/in \d+ d \d+ h/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Solar system/i })).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('pre-archive birthday does not claim an APOD exists', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/apod', route => route.fulfill({ json: { status: 'before_archive', message: 'Before archive' } }));
  await page.goto('/');
  await page.getByLabel('Date of birth').fill('1988-02-29');
  await page.getByRole('button', { name: 'Explore your universe' }).click();
  await expect(page.getByRole('heading', { name: /Your moon/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/APOD archive begins/i)).toBeVisible({ timeout: 15_000 });
});

test('language can be changed and reduced motion skips travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Français' }).click();
  await expect(page.getByLabel('Date de naissance')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explorer votre univers' })).toBeVisible();
});

test('time travel refreshes the APOD and comparison shows both media and lunar positions', async ({ page }) => {
  await page.route('**/api/apod', route => {
    const { date } = route.request().postDataJSON() as { date: string };
    return route.fulfill({ json: { status: 'ok', apod: { ...apod.apod, date, title: `APOD ${date}` } } });
  });
  await page.goto('/');
  await page.getByLabel('Date of birth').fill('2001-01-01');
  await page.getByRole('button', { name: 'Explore your universe' }).click();
  await expect(page.getByRole('heading', { name: 'APOD 2001-01-01' })).toBeVisible();
  await page.getByRole('button', { name: /Webb launch/ }).click();
  await expect(page.getByRole('heading', { name: 'APOD 2021-12-25' })).toBeVisible();
  await page.getByLabel('Second date').fill('2005-01-01');
  await page.getByRole('button', { name: 'Compare dates' }).click();
  const comparison = page.locator('.comparison-grid');
  await expect(comparison.getByRole('img', { name: 'A galaxy' })).toHaveCount(2);
  await expect(comparison.getByRole('link', { name: /APOD 2005-01-01/ })).toBeVisible();
  await expect(comparison.getByText('Planetary positions')).toHaveCount(2);
});

test('passport export defaults to private and creates the selected PNG dimensions', async ({ page }) => {
  await page.route('**/api/apod', route => route.fulfill({ json: apod }));
  await page.goto('/');
  await page.getByLabel('Date of birth').fill('2001-01-01');
  await page.getByRole('button', { name: 'Explore your universe' }).click();
  const privacy = page.getByLabel('Include birth date and APOD title');
  await expect(privacy).not.toBeChecked();
  const [privateDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(privateDownload.suggestedFilename()).toBe('stellar-origin-square.png');
  const square = await readFile((await privateDownload.path())!);
  expect([square.readUInt32BE(16), square.readUInt32BE(20)]).toEqual([1080, 1080]);

  await privacy.check();
  await page.getByLabel('Format').selectOption('story');
  const [storyDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(storyDownload.suggestedFilename()).toBe('stellar-origin-story-2001-01-01.png');
  const story = await readFile((await storyDownload.path())!);
  expect([story.readUInt32BE(16), story.readUInt32BE(20)]).toEqual([1080, 1920]);
});

test('solar viewer falls back to 2D and supports keyboard selection without WebGL', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
      if (args[0] === 'webgl' || args[0] === 'webgl2') return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.route('**/api/apod', route => route.fulfill({ json: apod }));
  await page.goto('/');
  await page.getByLabel('Date of birth').fill('2001-01-01');
  await page.getByRole('button', { name: 'Explore your universe' }).click();
  const solar = page.getByRole('region', { name: 'Solar System explorer' });
  await expect(solar.getByText('2D MAP')).toBeVisible();
  await solar.focus();
  await solar.press('ArrowRight');
  await expect(solar.getByRole('button', { name: 'Mars', exact: true }).last()).toHaveAttribute('aria-pressed', 'true');
});

test('3D scene mounts without React root errors', async ({ page }) => {
  const rootErrors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error' && message.text().includes('synchronously unmount a root')) rootErrors.push(message.text());
  });
  await page.route('**/api/apod', route => route.fulfill({ json: apod }));
  await page.goto('/?date=2001-01-01');
  const solar = page.getByRole('region', { name: 'Solar System explorer' });
  await expect(solar).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(solar.locator('canvas')).toHaveCount(0);
  await solar.scrollIntoViewIfNeeded();
  await expect(solar.locator('canvas')).toBeVisible();
  await page.waitForTimeout(500);
  expect(rootErrors).toEqual([]);
});
