import { expect, type Page, test } from "@playwright/test";

const output = (name: string) => `test-results/phase2b-${name}.png`;

async function waitForPage(page: Page) {
  await page.goto("/");
  await expect(page.locator(".hero-sequence")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function positionSection(
  page: Page,
  selector: string,
  offset = 0,
) {
  await page.locator(selector).evaluate((element, localOffset) => {
    const top = window.scrollY + element.getBoundingClientRect().top;

    window.scrollTo(0, top + Number(localOffset));
  }, offset);
  await page.waitForTimeout(450);
}

async function loadDocumentImages(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.max(500, Math.round(page.viewportSize()!.height * 0.8));

  for (let y = 0; y <= height; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(35);
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
}

test("capture Phase 2B visual review set", async ({ browser, page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitForPage(page);

  await positionSection(page, ".hero-release", -360);
  await page.screenshot({ path: output("01-hero-release") });

  await positionSection(page, ".what-happens", -400);
  await page.screenshot({ path: output("02-phase2a-transition") });

  await positionSection(page, ".preaching-depth", 260);
  await page.screenshot({ path: output("03-word-depth-desktop") });

  await positionSection(page, ".every-generation", 0);
  await page.screenshot({ path: output("05-every-generation") });

  await positionSection(page, ".what-to-expect", 0);
  await page.screenshot({ path: output("06-what-to-expect") });

  await positionSection(page, ".plan-visit", 0);
  await page.screenshot({ path: output("07-plan-your-visit") });

  await positionSection(page, ".final-invitation", 0);
  await page.screenshot({ path: output("08a-final-invitation") });

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await page.waitForTimeout(450);
  await page.screenshot({ path: output("08b-final-footer") });

  await loadDocumentImages(page);
  await page.screenshot({
    path: output("11-desktop-1440-full"),
    fullPage: true,
  });

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const mobile = await mobileContext.newPage();
  await waitForPage(mobile);
  await positionSection(mobile, ".the-word", 360);
  await mobile.screenshot({ path: output("04-word-mobile-static") });
  await loadDocumentImages(mobile);
  await mobile.screenshot({
    path: output("10-mobile-390-full"),
    fullPage: true,
  });
  await mobileContext.close();

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const reduced = await reducedContext.newPage();
  await waitForPage(reduced);
  await positionSection(reduced, ".the-word", 0);
  await reduced.screenshot({ path: output("09-reduced-motion") });
  await reducedContext.close();
});
