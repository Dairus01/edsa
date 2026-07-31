import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
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

test("Phase 2A follows the hero in the correct semantic order", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await waitForHero(page);

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.locator(".who-we-are").getByRole("heading", {
      level: 2,
      name: "More than a Sunday gathering.",
    }),
  ).toBeAttached();
  await expect(
    page.locator(".what-we-believe").getByRole("heading", {
      level: 2,
      name: "We believe no life is beyond the reach of God.",
    }),
  ).toBeAttached();

  const order = await page
    .locator("[data-phase2-section]")
    .evaluateAll((elements) =>
      elements.map((element) =>
        element.getAttribute("data-phase2-section"),
      ),
    );

  expect(order.slice(0, 3)).toEqual([
    "hero-release",
    "who-we-are",
    "what-we-believe",
  ]);

  await expect(
    page.getByText(
      "EDSA is a Christian community in Sapele where ordinary people gather to pursue God, grow in faith, and build meaningful relationships.",
      { exact: true },
    ),
  ).toBeAttached();
  await expect(
    page.getByText(
      "You do not need to have everything figured out before you arrive.",
      { exact: true },
    ),
  ).toBeAttached();
  await expect(
    page.getByText(
      "People carry disappointment, unanswered questions, quiet battles, and parts of their story they do not know how to repair.",
      { exact: true },
    ),
  ).toBeAttached();
  await expect(
    page.getByText("We are people being transformed by grace.", {
      exact: true,
    }),
  ).toBeAttached();
  expect(errors).toEqual([]);
});

test("the scrub exposes one semantic image and reveals color with scroll", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const scrub = page.locator(".see-through-scrub");
  const reveal = scrub.locator("[data-reveal-layer]");
  const images = scrub.locator("img");

  await expect(images).toHaveCount(2);
  await expect(images.first()).toHaveAttribute(
    "alt",
    "Women worshipping together during an EDSA gathering in Sapele.",
  );
  await expect(reveal).toHaveAttribute("aria-hidden", "true");
  await expect(reveal.locator("img")).toHaveAttribute("alt", "");
  await expect(reveal.locator("img")).toHaveAttribute(
    "aria-hidden",
    "true",
  );

  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>(".who-we-are");

    window.scrollTo(0, section?.offsetTop ?? 0);
  });
  await expect
    .poll(async () => Number(await scrub.getAttribute("data-reveal")))
    .toBeLessThan(0.12);

  await page.evaluate(() => {
    const section = document.querySelector<HTMLElement>(".who-we-are");

    if (section) {
      window.scrollTo(
        0,
        section.offsetTop + section.offsetHeight - window.innerHeight,
      );
    }
  });
  await expect
    .poll(async () => Number(await scrub.getAttribute("data-reveal")))
    .toBeGreaterThan(0.98);

  const mask = await reveal.evaluate(
    (element) =>
      getComputedStyle(element).maskImage ||
      getComputedStyle(element).webkitMaskImage,
  );

  expect(mask).toContain("linear-gradient");
});

test("reduced motion keeps both photographs complete and static", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await waitForHero(page);

  const scrub = page.locator(".see-through-scrub");
  const depth = page.locator(".mouse-depth");

  await expect(scrub).toHaveAttribute("data-scrub-enabled", "false");
  await expect(scrub).toHaveAttribute("data-reduced-motion", "true");
  await expect(scrub).toHaveAttribute("data-reveal", "1.0000");
  await expect(depth).toHaveAttribute("data-depth-enabled", "false");
  await expect(depth).toHaveAttribute("data-reduced-motion", "true");

  const transforms = await depth.evaluate((element) => {
    const imageLayer = element.querySelector<HTMLElement>(
      ".mouse-depth__image-layer",
    );
    const light = element.querySelector<HTMLElement>(
      ".mouse-depth__light",
    );

    return {
      image: imageLayer
        ? getComputedStyle(imageLayer).transform
        : null,
      light: light ? getComputedStyle(light).transform : null,
    };
  });

  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(
    transforms.image,
  );
  expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(
    transforms.light,
  );
});

test("touch and coarse pointer contexts disable mouse depth", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto("/");
  await waitForHero(page);

  const depth = page.locator(".mouse-depth");

  await expect(depth).toHaveAttribute("data-depth-enabled", "false");
  await expect(depth).toHaveAttribute("data-coarse-pointer", "true");
  await context.close();
});

test("fine pointer depth is damped, restrained, and returns to neutral", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const depth = page.locator(".mouse-depth");

  await depth.scrollIntoViewIfNeeded();
  await expect(depth).toHaveAttribute("data-depth-enabled", "true");
  const bounds = await depth.boundingBox();

  expect(bounds).not.toBeNull();

  if (!bounds) {
    return;
  }

  await page.mouse.move(
    bounds.x + bounds.width * 0.88,
    bounds.y + bounds.height * 0.82,
  );
  await page.waitForTimeout(350);

  const displacement = await depth.evaluate((element) => {
    const layer = element.querySelector<HTMLElement>(
      ".mouse-depth__image-layer",
    );
    const matrix = new DOMMatrix(
      layer ? getComputedStyle(layer).transform : undefined,
    );

    return { x: matrix.m41, y: matrix.m42 };
  });

  expect(Math.abs(displacement.x)).toBeGreaterThan(0.5);
  expect(Math.abs(displacement.y)).toBeGreaterThan(0.5);
  expect(Math.hypot(displacement.x, displacement.y)).toBeLessThan(16);

  await page.mouse.move(1, 1);
  await expect
    .poll(async () =>
      depth.evaluate((element) => {
        const layer = element.querySelector<HTMLElement>(
          ".mouse-depth__image-layer",
        );
        const matrix = new DOMMatrix(
          layer ? getComputedStyle(layer).transform : undefined,
        );

        return Math.hypot(matrix.m41, matrix.m42);
      }),
    )
    .toBeLessThan(0.1);
});

test("Phase 2A has no horizontal overflow across required viewports", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await waitForHero(page);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await waitForHero(page);
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(80);

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(
      layout.scrollWidth,
      `${viewport.width}x${viewport.height} overflowed`,
    ).toBeLessThanOrEqual(layout.clientWidth + 1);
  }

  expect(errors).toEqual([]);
});

test("content remains readable at 200 percent text sizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await waitForHero(page);
  await page.addStyleTag({
    content: ":root { font-size: 200% !important; }",
  });
  await page.locator(".who-we-are").scrollIntoViewIfNeeded();

  const readability = await page.evaluate(() => {
    const bodyCopy = document.querySelector<HTMLElement>(
      ".who-we-are__body",
    );
    const headings = [...document.querySelectorAll<HTMLElement>("h2")];

    return {
      bodyFontSize: bodyCopy
        ? Number.parseFloat(getComputedStyle(bodyCopy).fontSize)
        : 0,
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
      headingsHaveWidth: headings.every(
        (heading) => heading.getBoundingClientRect().width > 0,
      ),
    };
  });

  expect(readability.bodyFontSize).toBeGreaterThanOrEqual(32);
  expect(readability.horizontalOverflow).toBe(false);
  expect(readability.headingsHaveWidth).toBe(true);
  await expect(
    page.getByText("There is room for your story here.", {
      exact: true,
    }),
  ).toBeAttached();
});

test("Phase 2 images are lazy and never inserted as head preloads", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const imageLoading = await page
    .locator(
      ".hero-release img, .see-through-scrub img, .mouse-depth img",
    )
    .evaluateAll((images) =>
      images.map((image) => ({
        loading: (image as HTMLImageElement).loading,
        src: (image as HTMLImageElement).getAttribute("src") ?? "",
      })),
    );
  const preloads = await page
    .locator('head link[rel="preload"][as="image"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    );

  expect(imageLoading).toHaveLength(4);
  expect(imageLoading.every((image) => image.loading === "lazy")).toBe(
    true,
  );
  expect(
    preloads.some(
      (href) =>
        href.includes("/images/worship/") ||
        href.includes("/images/community/"),
    ),
  ).toBe(false);
});

test("hero release is contiguous and motion resources declare cleanup", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  const continuity = await page.evaluate(() => {
    const release = document.querySelector<HTMLElement>(".hero-release");
    const heroBoundary =
      document.querySelector<HTMLElement>(".pin-spacer") ??
      document.querySelector<HTMLElement>(".hero-sequence");

    if (!release || !heroBoundary) {
      return null;
    }

    const releaseBounds = release.getBoundingClientRect();
    const heroBounds = heroBoundary.getBoundingClientRect();

    return {
      gap: releaseBounds.top - heroBounds.bottom,
      releaseHeight: releaseBounds.height,
      imageCount: release.querySelectorAll("img").length,
    };
  });

  expect(continuity).not.toBeNull();
  expect(Math.abs(continuity?.gap ?? 99)).toBeLessThanOrEqual(2);
  expect(continuity?.releaseHeight ?? 0).toBeGreaterThan(200);
  expect(continuity?.imageCount).toBe(1);

  const motionSources = [
    "src/components/motion/SeeThroughScrub.tsx",
    "src/components/motion/MouseDepth.tsx",
  ].map((file) =>
    readFileSync(join(process.cwd(), file), "utf8"),
  );

  for (const source of motionSources) {
    expect(source).toContain("cancelAnimationFrame");
    expect(source).toContain("observer?.disconnect()");
    expect(source).toContain("removeEventListener");
  }
});

test("the supplied Sunday time stays guarded in central content", () => {
  const source = readFileSync(
    join(process.cwd(), "src/content/church.ts"),
    "utf8",
  );

  expect(source).toContain('time: "8:00 PM"');
  expect(source).toMatch(
    /sunday:[\s\S]*?requiresVerification:\s*true/,
  );
});
