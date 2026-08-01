import { expect, type Page, test } from "@playwright/test";

const output = (name: string) => `test-results/post-hero-${name}.png`;

async function waitForPage(page: Page) {
  await page.goto("/");
  await expect(page.locator("#home")).toHaveAttribute("aria-busy", "false");
}

async function positionSection(page: Page, selector: string) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(180);
}

async function loadDocumentImages(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(600, Math.round(page.viewportSize()!.height * 0.85));

  for (let y = 0; y <= height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(25);
  }
}

test("capture post-hero visual review set", async ({ browser, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForPage(page);

  for (const [name, selector] of [
    ["01-hero-cta", "#home"],
    ["02-quick-access", ".quick-access"],
    ["03-identity", "#identity"],
    ["04-experience", "#experience"],
    ["05-word", "#the-word"],
    ["06-generations", "#generations"],
    ["07-visit", "#visit"],
    ["08-invitation", "#invitation"],
    ["09-footer", "#footer"],
  ] as const) {
    await positionSection(page, selector);
    await page.screenshot({ path: output(name) });
  }

  await loadDocumentImages(page);
  await page.screenshot({ path: output("10-desktop-full"), fullPage: true });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await mobileContext.newPage();
  await waitForPage(mobile);
  await loadDocumentImages(mobile);
  await mobile.screenshot({ path: output("11-mobile-full"), fullPage: true });
  await mobileContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reduced = await reducedContext.newPage();
  await waitForPage(reduced);
  await loadDocumentImages(reduced);
  await reduced.screenshot({ path: output("12-reduced-full"), fullPage: true });
  await reducedContext.close();
});
