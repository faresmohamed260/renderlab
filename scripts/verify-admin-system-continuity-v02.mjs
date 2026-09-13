import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outDir = path.join(root, 'artifacts', 'admin-system-continuity-v02');
const prototype = path.join(root, 'design', 'prototypes', 'admin-system-continuity-v02', 'index.html');
const url = pathToFileURL(prototype).href;
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function verifyViewport({ name, width, height, reducedMotion = 'no-preference' }) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });

  await page.getByRole('heading', { name: 'Admin', level: 1 }).waitFor();
  await page.getByText('Privileged operations', { exact: true }).waitFor();
  await page.getByRole('heading', { name: 'Access', level: 2 }).waitFor();
  await page.getByRole('heading', { name: 'Generation', level: 2 }).waitFor();
  await page.getByRole('heading', { name: 'Health', level: 2 }).waitFor();
  await page.getByText('Default or blank means inherit the global value.').waitFor();
  await page.getByText('it is not an SLA or ETA', { exact: false }).waitFor();

  const rowCount = await page.locator('[data-admin-row]').count();
  if (rowCount !== 3) throw new Error(`${name}: expected 3 Settings-style top-level rows, got ${rowCount}`);

  if (await page.locator('[data-admin-zone-rail]').count()) {
    throw new Error(`${name}: rejected v0.1 zone rail must not exist`);
  }

  const register = page.locator('[data-admin-register]');
  const registerStyle = await register.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      radius: style.borderTopLeftRadius,
      borderTop: style.borderTopWidth,
      overflow: style.overflow,
    };
  });
  if (registerStyle.borderTop !== '1px') throw new Error(`${name}: register must retain 1px Settings border`);

  const selfRole = page.locator('#role-self');
  const selfStatus = page.locator('#status-self');
  if (!(await selfRole.isDisabled()) || !(await selfStatus.isDisabled())) {
    throw new Error(`${name}: acting-account role/status controls must remain visibly disabled`);
  }

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  if (overflow.scrollWidth > overflow.innerWidth || overflow.bodyScrollWidth > overflow.innerWidth) {
    throw new Error(`${name}: horizontal overflow ${JSON.stringify(overflow)}`);
  }

  const shell = await page.locator('[data-ui-shell="horizontal"]').evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  });
  const expectedShellHeight = width <= 640 ? 64 : 72;
  if (shell.height !== expectedShellHeight) {
    throw new Error(`${name}: expected UI-074 header height ${expectedShellHeight}, got ${shell.height}`);
  }

  const firstRow = page.locator('[data-admin-row="access"]');
  const labelCell = firstRow.locator('.labelCell');
  const valueCell = firstRow.locator('.valueCell');
  const geometry = await Promise.all([
    labelCell.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { width: Math.round(rect.width), display: style.display, borderRight: style.borderRightWidth, borderBottom: style.borderBottomWidth };
    }),
    valueCell.evaluate((node) => ({ width: Math.round(node.getBoundingClientRect().width) })),
  ]);

  if (width > 640) {
    if (geometry[0].width < 160 || geometry[0].width > 176) throw new Error(`${name}: Settings-style label column drifted: ${JSON.stringify(geometry[0])}`);
    if (geometry[0].borderRight !== '1px') throw new Error(`${name}: desktop label/value separator missing`);
  } else {
    if (geometry[0].borderRight !== '0px' || geometry[0].borderBottom !== '1px') {
      throw new Error(`${name}: narrow label band must match Settings collapse grammar: ${JSON.stringify(geometry[0])}`);
    }
  }

  // Prove ordinary keyboard traversal exists, then clear focus before visual capture so
  // screenshots represent the settled interface rather than a synthetic verifier state.
  await page.keyboard.press('Tab');
  const firstFocus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || document.activeElement?.tagName);
  if (!firstFocus) throw new Error(`${name}: no keyboard focus target found`);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });

  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    height: document.documentElement.scrollHeight,
    rows: [...document.querySelectorAll('[data-admin-row]')].map((node) => Math.round(node.getBoundingClientRect().height)),
    registerRadius: getComputedStyle(document.querySelector('[data-admin-register]')).borderTopLeftRadius,
  }));
  console.log(`${name}:`, JSON.stringify(metrics));
  await context.close();
}

try {
  await verifyViewport({ name: 'admin-system-continuity-desktop-1440', width: 1440, height: 1100 });
  await verifyViewport({ name: 'admin-system-continuity-mobile-390', width: 390, height: 844 });
  await verifyViewport({ name: 'admin-system-continuity-mobile-390-reduced', width: 390, height: 844, reducedMotion: 'reduce' });
} finally {
  await browser.close();
}
