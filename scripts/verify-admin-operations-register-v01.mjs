import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = path.join(root, 'artifacts', 'admin-operations-register-v01');
const prototype = path.join(root, 'design', 'prototypes', 'admin-operations-register-v01', 'index.html');
const url = pathToFileURL(prototype).href;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function verifyViewport({ name, width, height, reducedMotion = 'no-preference' }) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });

  await page.getByRole('heading', { name: 'Admin', level: 1 }).waitFor();
  await page.getByText('01 / Access').waitFor();
  await page.getByText('02 / Generation').waitFor();
  await page.getByText('03 / Health').waitFor();
  await page.getByText('Design fixture / not product data').waitFor();
  await page.getByText('Default means inherit global').waitFor();
  await page.getByText('it is not an SLA or ETA').waitFor();

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (overflow.scrollWidth > overflow.innerWidth || overflow.bodyScrollWidth > overflow.innerWidth) {
    throw new Error(`${name}: horizontal overflow ${JSON.stringify(overflow)}`);
  }

  const zoneCount = await page.locator('.zone').count();
  if (zoneCount !== 3) throw new Error(`${name}: expected 3 zones, got ${zoneCount}`);

  const cards = await page.locator('.account-row').count();
  if (cards !== 3) throw new Error(`${name}: expected 3 access records, got ${cards}`);

  // The acting account must visibly remain protected in the design fixture.
  const selfRole = page.locator('#role-self');
  const selfStatus = page.locator('#status-self');
  if (!(await selfRole.isDisabled()) || !(await selfStatus.isDisabled())) {
    throw new Error(`${name}: self-account controls must be disabled in the design fixture`);
  }

  // Verify ordinary keyboard focus remains visible/reachable in document order.
  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || document.activeElement?.tagName);
  if (!firstFocus) throw new Error(`${name}: no keyboard focus target found`);

  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: true,
  });

  const metrics = await page.evaluate(() => ({
    width: window.innerWidth,
    height: document.documentElement.scrollHeight,
    zones: [...document.querySelectorAll('.zone')].map((node) => Math.round(node.getBoundingClientRect().height)),
  }));
  console.log(`${name}:`, JSON.stringify(metrics));
  await context.close();
}

try {
  await verifyViewport({ name: 'admin-operations-register-desktop-1440', width: 1440, height: 1100 });
  await verifyViewport({ name: 'admin-operations-register-mobile-390', width: 390, height: 844 });
  await verifyViewport({ name: 'admin-operations-register-mobile-390-reduced', width: 390, height: 844, reducedMotion: 'reduce' });
} finally {
  await browser.close();
}
