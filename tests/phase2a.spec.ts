import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { church } from "../src/content/church";
import { homepageImages } from "../src/content/imageUsage";
import { locations } from "../src/content/locations";

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return errors;
}

async function waitForHero(page: Page) {
  await expect(page.locator("#home")).toHaveAttribute("aria-busy", "false");
}

test("organisation and locations are independent, scalable content models", () => {
  expect(church.identity).not.toMatch(/community in Sapele/i);
  expect(locations).toHaveLength(1);
  expect(locations[0]).toMatchObject({
    id: "sapele",
    name: "Sapele",
    isPrimary: true,
    mapsUrl: "https://maps.app.goo.gl/TRLRY64LkofajeFf9",
  });
  expect(locations[0].services.map((service) => service.time)).toEqual([
    "8:00 PM",
    "5:00 PM",
  ]);
});

test("homepage image registry has no duplicate paths", () => {
  const paths = Object.values(homepageImages).map((image) => image.src);

  expect(new Set(paths).size).toBe(paths.length);
  expect(
    new Set(
      paths.filter((path) => decodeURIComponent(path).includes("/preaching/")),
    ).size,
  ).toBe(3);
});

test("new homepage scenes render in the required order", async ({ page }) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await waitForHero(page);

  const order = await page
    .locator("[data-homepage-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-homepage-section")),
    );

  expect(order).toEqual([
    "quick-access",
    "identity",
    "experience",
    "the-word",
    "ezra",
    "generations",
    "visit",
    "footer",
  ]);
  await expect(page.locator("h1")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("Manrope and Newsreader perform distinct typographic roles", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.querySelector("#identity p")!).fontFamily,
    heading: getComputedStyle(document.querySelector("#identity h2")!).fontFamily,
    scripture: getComputedStyle(
      document.querySelector("#identity .scripture-moment p")!,
    ).fontFamily,
  }));

  expect(fonts.body).toContain("Manrope");
  expect(fonts.heading).toContain("Manrope");
  expect(fonts.scripture).toContain("Newsreader");
});

test("post-hero length and section heights stay within the mobile budget", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const metrics = await page.evaluate(() => {
    const firstPostHeroScene = document.querySelector<HTMLElement>(
      ".hero-release",
    )!;
    const postHeroHeight =
      document.documentElement.scrollHeight - firstPostHeroScene.offsetTop;
    const sections = [...document.querySelectorAll<HTMLElement>(
      "[data-homepage-section]",
    )].map((section) => ({
      id: section.dataset.homepageSection,
      ratio: section.offsetHeight / window.innerHeight,
    }));

    return {
      ratio: postHeroHeight / window.innerHeight,
      sections,
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    };
  });

  expect(metrics.ratio).toBeLessThanOrEqual(10);
  expect(metrics.overflow).toBe(false);
  expect(metrics.sections.filter((section) => section.ratio > 1.5)).toEqual([]);
});

test("desktop post-hero length is substantially shorter than the audit baseline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

  const ratio = await page.evaluate(() => {
    const firstPostHeroScene = document.querySelector<HTMLElement>(
      ".hero-release",
    )!;

    return (
      (document.documentElement.scrollHeight -
        firstPostHeroScene.offsetTop) /
      window.innerHeight
    );
  });

  expect(ratio).toBeLessThanOrEqual(8.25);
  expect(ratio).toBeLessThan(17.39);
});

test("public copy removes old location-bound identity and repetitive invitation", async ({
  page,
}) => {
  const homepageSource = readFileSync(
    join(process.cwd(), "src/content/homepage.ts"),
    "utf8",
  );

  expect(homepageSource).not.toMatch(/Maybe you/i);

  await page.goto("/");
  await waitForHero(page);
  const copy = await page.locator("body").innerText();

  expect(copy).not.toMatch(/EDSA is a Christian community in Sapele/i);
  expect(copy).not.toMatch(/Maybe you have been in church/i);
});

test("required viewports remain free of horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await waitForHero(page);

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );

    expect(overflow, `${viewport.width}x${viewport.height}`).toBe(false);
  }
});
