import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Browser, type Page, test } from "@playwright/test";

const expectedOrder = [
  "hero-release",
  "who-we-are",
  "what-we-believe",
  "what-happens-here",
  "the-word",
  "every-generation",
  "what-to-expect",
  "plan-your-visit",
  "final-invitation",
  "footer",
];

const expectedHeadings = [
  "Church is more than something you watch.",
  "A Word for where you are.",
  "Tomorrow’s church is already in the room.",
  "Your first visit does not have to feel unfamiliar.",
  "Plan your visit.",
  "There is a place for you here.",
];

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  return errors;
}

async function waitForHero(page: Page) {
  const hero = page.locator(".hero-sequence");

  await expect(hero).toHaveAttribute("aria-busy", "false");
  return hero;
}

async function createCoarsePage(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  return { context, page };
}

test("approved hero settings and logo removal remain intact", async ({
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

  expect(heroConfig).toMatch(
    /desktop:\s*\{[\s\S]*?scrollScreens:\s*2\.25/,
  );
  expect(heroConfig).toMatch(
    /mobile:\s*\{[\s\S]*?scrollScreens:\s*1\.75/,
  );
  expect(heroSource).toContain("source.scrollScreens");

  await page.goto("/");
  await waitForHero(page);

  await expect(page.locator(".hero-sequence__brand-stage")).toHaveCount(0);
  await expect(page.locator(".hero-sequence__brand-logo")).toHaveCount(0);
  await expect(page.locator(".hero-release img")).toHaveCount(1);
  await expect(page.locator(".hero-release + img")).toHaveCount(0);
  await expect(page.locator(".site-footer img")).toHaveCount(0);
});

test("Phase 2B is complete, semantic, and in the approved order", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await waitForHero(page);

  await expect(page.locator("h1")).toHaveCount(1);
  for (const heading of expectedHeadings) {
    await expect(
      page.getByRole("heading", { level: 2, name: heading }),
    ).toBeAttached();
  }

  const order = await page
    .locator("[data-phase2-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-phase2-section")),
    );

  expect(order).toEqual(expectedOrder);
  expect(errors).toEqual([]);
});

test("visit details and external actions use centralized confirmed content", async ({
  page,
}) => {
  const visitSource = readFileSync(
    join(process.cwd(), "src/components/sections/PlanYourVisit.tsx"),
    "utf8",
  );

  expect(visitSource).toContain("church.services.sunday.time");
  expect(visitSource).toContain("church.services.wednesday.time");
  expect(visitSource).toContain("church.address.line1");
  expect(visitSource).not.toContain('"8:00 PM"');
  expect(visitSource).not.toContain('"5:00 PM"');

  await page.goto("/");
  await waitForHero(page);

  const visit = page.locator("#visit");

  await expect(visit).toBeAttached();
  await expect(visit.getByText("8:00 PM", { exact: true })).toBeAttached();
  await expect(visit.getByText("5:00 PM", { exact: true })).toBeAttached();
  await expect(visit.getByText("107 Okpe Road", { exact: true })).toBeAttached();
  await expect(
    visit.getByText("Opposite Odebala Plaza", { exact: true }),
  ).toBeAttached();
  await expect(
    visit.getByText("Sapele, Delta State 331107", { exact: true }),
  ).toBeAttached();

  await expect(visit.getByRole("link", { name: "Get Directions" })).toHaveAttribute(
    "href",
    "https://maps.app.goo.gl/TRLRY64LkofajeFf9",
  );
  await expect(visit.getByRole("link", { name: "Instagram" })).toHaveAttribute(
    "href",
    "https://www.instagram.com/edsa.intl/",
  );
  await expect(visit.getByRole("link", { name: "Facebook" })).toHaveAttribute(
    "href",
    "https://www.facebook.com/people/Eagles-Dominion-Synergy-Assembly-EDSA/61584296051802/",
  );

  const externalLinks = page.locator('a[target="_blank"]');
  const safeRel = await externalLinks.evaluateAll((links) =>
    links.every((link) => {
      const rel = link.getAttribute("rel") ?? "";

      return rel.includes("noopener") && rel.includes("noreferrer");
    }),
  );

  expect(await externalLinks.count()).toBeGreaterThan(0);
  expect(safeRel).toBe(true);
});

test("navigation exposes early visit access without an image logo", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const header = page.locator(".site-header");
  const visitLink = header.getByRole("link", { name: "Visit" });

  await expect(header.getByText("EDSA", { exact: true })).toBeVisible();
  await expect(header.locator("img")).toHaveCount(0);
  await expect(visitLink).toHaveAttribute("href", "#visit");
  await visitLink.click();
  await expect(page).toHaveURL(/#visit$/);
});

test("preaching images are lazy, local, and carry neutral descriptions", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const images = page.locator(".preaching-depth img");

  await expect(images).toHaveCount(4);
  const attributes = await images.evaluateAll((nodes) =>
    nodes.map((node) => {
      const image = node as HTMLImageElement;

      return {
        alt: image.alt,
        loading: image.loading,
        src: image.getAttribute("src") ?? "",
      };
    }),
  );

  expect(attributes.every((image) => image.loading === "lazy")).toBe(true);
  expect(
    attributes.every((image) =>
      decodeURIComponent(image.src).includes("/images/preaching/"),
    ),
  ).toBe(true);
  expect(attributes.every((image) => image.alt.length > 0)).toBe(true);
  expect(attributes.map((image) => image.alt).join(" ")).not.toMatch(
    /Senior Pastor|Pastor.?s Wife|Youth Pastor/i,
  );

  const preloads = await page
    .locator('head link[rel="preload"][as="image"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );

  expect(preloads.some((href) => href.includes("preaching"))).toBe(false);
});

test("preaching depth is bounded and reversible on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

  const depth = page.locator(".preaching-depth");
  const layers = depth.locator("[data-preaching-layer]");

  await depth.scrollIntoViewIfNeeded();
  await expect(depth).toHaveAttribute("data-depth-enabled", "true");
  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".preaching-depth");

    if (root) {
      window.scrollTo(0, root.offsetTop + root.offsetHeight * 0.72);
    }
  });
  await expect
    .poll(async () => Number(await depth.getAttribute("data-progress")))
    .toBeGreaterThan(0.5);

  const transforms = await layers.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).transform),
  );

  expect(transforms.every((transform) => transform !== "none")).toBe(true);

  await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>(".preaching-depth");

    if (root) {
      window.scrollTo(
        0,
        window.scrollY + root.getBoundingClientRect().top,
      );
    }
  });
  await expect
    .poll(async () => Number(await depth.getAttribute("data-progress")))
    .toBeLessThan(0.05);
});

test("reduced motion and coarse pointers use the static preaching flow", async ({
  browser,
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForHero(page);

  let depth = page.locator(".preaching-depth");

  await expect(depth).toHaveAttribute("data-depth-enabled", "false");
  await expect(depth).toHaveAttribute("data-reduced-motion", "true");
  await expect(depth.locator(".preaching-depth__mobile-beat")).toHaveCount(4);

  const { context, page: coarsePage } = await createCoarsePage(browser);

  await coarsePage.goto("/");
  await waitForHero(coarsePage);
  depth = coarsePage.locator(".preaching-depth");
  await expect(depth).toHaveAttribute("data-depth-enabled", "false");
  await expect(depth).toHaveAttribute("data-coarse-pointer", "true");
  await context.close();
});

test("duplicated scrub imagery exposes one semantic image", async ({ page }) => {
  await page.goto("/");
  await waitForHero(page);

  const scrubImages = page.locator(".see-through-scrub img");
  const semanticImages = await scrubImages.evaluateAll((images) =>
    images.filter(
      (image) =>
        image.getAttribute("aria-hidden") !== "true" &&
        (image.getAttribute("alt") ?? "").length > 0,
    ).length,
  );

  expect(semanticImages).toBe(1);
});

test("all target viewports stay free of horizontal overflow", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await waitForHero(page);

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 430, height: 932 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(60);
    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));

    expect(
      width.scroll,
      `${viewport.width}x${viewport.height} overflowed`,
    ).toBeLessThanOrEqual(width.client + 1);
  }

  expect(errors).toEqual([]);
});

test("content remains reachable at 200 percent text size", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);
  await page.addStyleTag({
    content: ":root { font-size: 200% !important; }",
  });
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  const layout = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
    footerBottom: document
      .querySelector(".site-footer")
      ?.getBoundingClientRect().bottom,
    viewportHeight: window.innerHeight,
  }));

  expect(layout.overflow).toBe(false);
  expect(layout.footerBottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  await expect(page.getByText("©", { exact: false })).toBeAttached();
});

test("interactive touch targets meet the 44 pixel minimum", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const tooSmall = await page
    .locator(
      ".site-header a, .plan-visit a, .final-invitation a, .site-footer a",
    )
    .evaluateAll((links) =>
      links
        .filter((link) => getComputedStyle(link).display !== "none")
        .map((link) => {
          const bounds = link.getBoundingClientRect();

          return {
            text: link.textContent?.trim() ?? "",
            width: bounds.width,
            height: bounds.height,
          };
        })
        .filter((link) => link.width < 44 || link.height < 44),
    );

  expect(tooSmall).toEqual([]);
});

test("public copy contains no unconfirmed leadership claims", () => {
  const content = readFileSync(
    join(process.cwd(), "src/content/homepage.ts"),
    "utf8",
  );

  expect(content).not.toMatch(
    /Senior Pastor|Pastor.?s Wife|Youth Pastor|senior pastor|lead pastor/i,
  );
});
