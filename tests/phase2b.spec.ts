import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Browser, type Page, test } from "@playwright/test";

import { navigationItems } from "../src/config/navigation";

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return errors;
}

async function waitForHero(page: Page) {
  const hero = page.locator("#home");

  await expect(hero).toHaveAttribute("aria-busy", "false");
  return hero;
}

async function createCoarsePage(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  return { context, page: await context.newPage() };
}

test("approved hero pin values and sequence implementation remain intact", async ({
  page,
}) => {
  const heroConfig = readFileSync(
    join(process.cwd(), "src/components/hero/heroConfig.ts"),
    "utf8",
  );
  const heroSource = readFileSync(
    join(process.cwd(), "src/components/hero/HeroSequence.tsx"),
    "utf8",
  );

  expect(heroConfig).toMatch(/desktop:\s*\{[\s\S]*?scrollScreens:\s*2\.25/);
  expect(heroConfig).toMatch(/mobile:\s*\{[\s\S]*?scrollScreens:\s*1\.75/);
  expect(heroSource).toContain("source.scrollScreens");

  await page.goto("/");
  await waitForHero(page);
  await expect(page.locator(".hero-sequence__brand-stage")).toHaveCount(0);
  await expect(page.locator(".hero-release img")).toHaveCount(1);
});

test("hero exposes unequal visit and discovery actions in the first viewport", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const primary = page.locator('[data-hero-copy="identity"]').getByRole("link", {
    name: "Plan Your Visit",
  });
  const secondary = page
    .locator('[data-hero-copy="identity"]')
    .getByRole("link", { name: "Discover EDSA" });

  await expect(primary).toHaveAttribute("href", "#visit");
  await expect(secondary).toHaveAttribute("href", "#identity");
  await expect(primary).toBeVisible();
  await expect(secondary).toBeVisible();
  expect(await primary.evaluate((node) => getComputedStyle(node).backgroundColor))
    .not.toBe(await secondary.evaluate((node) => getComputedStyle(node).backgroundColor));
});

test("quick access immediately follows the preserved hero release", async ({ page }) => {
  await page.goto("/");
  await waitForHero(page);

  await expect(page.locator(".hero-release + .quick-access")).toHaveCount(1);
  const rail = page.locator(".quick-access");

  await expect(rail.getByText("Sunday", { exact: true })).toBeVisible();
  await expect(rail.getByText("8:00 PM", { exact: true })).toBeVisible();
  await expect(rail.getByText("Wednesday", { exact: true })).toBeVisible();
  await expect(rail.getByText("5:00 PM", { exact: true })).toBeVisible();
  await expect(rail.getByText("Sapele", { exact: true })).toBeVisible();
});

test("desktop navigation contains exactly five primary links with Visit emphasized", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

  const nav = page.locator(".site-header__nav--desktop");

  await expect(nav.locator("a")).toHaveCount(5);
  expect(navigationItems.map((item) => item.label)).toEqual([
    "About",
    "Experience",
    "The Word",
    "Generations",
    "Visit",
  ]);
  await expect(nav.getByRole("link", { name: "Visit" })).toHaveClass(
    /site-header__visit/,
  );
});

test("location data drives Visit, service times, directions, and social icons", async ({
  page,
}) => {
  const visitSource = readFileSync(
    join(process.cwd(), "src/components/sections/VisitEDSA.tsx"),
    "utf8",
  );

  expect(visitSource).toContain("primaryLocation.services");
  expect(visitSource).toContain("primaryLocation.address.line1");
  expect(visitSource).not.toContain('"8:00 PM"');
  expect(visitSource).not.toContain('"5:00 PM"');

  await page.goto("/");
  await waitForHero(page);
  const visit = page.locator("#visit");

  await expect(visit.getByText("8:00 PM", { exact: true })).toBeAttached();
  await expect(visit.getByText("5:00 PM", { exact: true })).toBeAttached();
  await expect(visit.getByText("107 Okpe Road", { exact: false })).toBeAttached();
  await expect(visit.getByText("Opposite Odebala Plaza", { exact: false })).toBeAttached();
  await expect(visit.locator('[data-location-count="1"]')).toHaveCount(0);
  await expect(visit).toHaveAttribute("data-location-count", "1");

  const instagram = visit.getByRole("link", { name: "Follow EDSA on Instagram" });
  const facebook = visit.getByRole("link", { name: "Follow EDSA on Facebook" });

  await expect(instagram.locator("svg")).toHaveCount(1);
  await expect(facebook.locator("svg")).toHaveCount(1);
  await expect(instagram).toHaveAttribute("target", "_blank");
  await expect(facebook).toHaveAttribute("target", "_blank");
});

test("exactly four homepage Scripture moments render", async ({ page }) => {
  await page.goto("/");
  await waitForHero(page);

  const moments = page.locator("blockquote.scripture-moment");

  await expect(moments).toHaveCount(4);
  await expect(page.getByText("Psalm 147:3", { exact: false })).toBeAttached();
  await expect(page.getByText("2 Timothy 3:16", { exact: false })).toBeAttached();
  await expect(page.getByText("Psalm 145:4", { exact: false })).toBeAttached();
  await expect(page.getByText("Matthew 11:28", { exact: false })).toBeAttached();
  await expect(page.getByText("Psalm 133:1", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Acts 2:42", { exact: false })).toHaveCount(0);
});

test("preaching stage uses three unique, lazy, neutrally described photographs", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);
  const images = page.locator(".preaching-depth img");

  await expect(images).toHaveCount(3);
  const attributes = await images.evaluateAll((nodes) =>
    nodes.map((node) => ({
      alt: (node as HTMLImageElement).alt,
      loading: (node as HTMLImageElement).loading,
      src: decodeURIComponent(node.getAttribute("src") ?? ""),
    })),
  );

  expect(new Set(attributes.map((image) => image.src)).size).toBe(3);
  expect(attributes.every((image) => image.loading === "lazy")).toBe(true);
  expect(attributes.every((image) => image.src.includes("/images/preaching/"))).toBe(true);
  expect(attributes.map((image) => image.alt).join(" ")).not.toMatch(
    /Senior Pastor|Pastor.?s Wife|Youth Pastor/i,
  );
});

test("reduced motion and coarse pointers use the complete static preaching flow", async ({
  browser,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForHero(page);
  await expect(page.locator(".preaching-depth")).toHaveAttribute(
    "data-depth-enabled",
    "false",
  );
  await expect(page.locator(".preaching-depth__mobile-beat")).toHaveCount(3);

  const coarse = await createCoarsePage(browser);
  await coarse.page.goto("/");
  await waitForHero(coarse.page);
  await expect(coarse.page.locator(".preaching-depth")).toHaveAttribute(
    "data-coarse-pointer",
    "true",
  );
  await coarse.context.close();
});

test("no duplicate ids, runtime errors, unsafe external links, or horizontal overflow", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await waitForHero(page);
  const integrity = await page.evaluate(() => {
    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
      (element) => element.id,
    );
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const unsafeLinks = [...document.querySelectorAll<HTMLAnchorElement>(
      'a[target="_blank"]',
    )].filter(
      (link) =>
        !link.rel.includes("noopener") || !link.rel.includes("noreferrer"),
    );

    return {
      duplicateIds,
      unsafeLinks: unsafeLinks.length,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    };
  });

  expect(integrity).toEqual({ duplicateIds: [], unsafeLinks: 0, overflow: false });
  expect(errors).toEqual([]);
});
