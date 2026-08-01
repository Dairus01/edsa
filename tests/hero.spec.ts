import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  test,
} from "@playwright/test";

function trackUnexpectedErrors(page: Page) {
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

async function waitForReady(page: Page) {
  const hero = page.locator(".hero-sequence");

  await expect(hero).toHaveAttribute("aria-busy", "false");
  await expect(hero).toHaveAttribute("data-media-ready", "true");
  await expect(hero).not.toHaveAttribute("data-ready-engine-key", "");

  return hero;
}

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((nextProgress) => {
    const hero = document.querySelector<HTMLElement>(".hero-sequence");
    const release = document.querySelector<HTMLElement>(".hero-release");

    if (!hero || !release) {
      return;
    }

    const scrollRange = Math.max(
      1,
      release.offsetTop - hero.offsetTop - window.innerHeight,
    );

    window.scrollTo(0, scrollRange * nextProgress);
  }, progress);
}

async function readHeroMedia(page: Page) {
  return page.locator(".hero-sequence__video").evaluate((node) => {
    const video = node as HTMLVideoElement;

    return {
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      readyState: video.readyState,
      seeking: video.seeking,
      src: video.currentSrc || video.src,
    };
  });
}

async function createTouchPage(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  return { context, page };
}

test("hero uses one seek-optimized video and renders intermediate scroll states", async ({
  page,
}) => {
  const errors = trackUnexpectedErrors(page);
  const videoRequests: string[] = [];
  const frameRequests: string[] = [];

  page.on("request", (request) => {
    const url = request.url();

    if (url.includes("/videos/hero/")) {
      videoRequests.push(url);
    }
    if (/\/sequences\/hero\/desktop\/frame-\d+\.webp/.test(url)) {
      frameRequests.push(url);
    }
  });

  await page.goto("/");
  const hero = await waitForReady(page);
  const video = page.locator(".hero-sequence__video");

  await expect(hero).toHaveAttribute("data-sequence-source", "desktop");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute(
    "src",
    /\/videos\/hero\/desktop\.mp4\?v=2026-08-01-hero-video-1/,
  );
  await expect(
    page.getByText("Loading the opening frame", { exact: true }),
  ).toHaveCount(0);

  expect(new Set(videoRequests).size).toBe(1);
  expect(new Set(frameRequests).size).toBeLessThanOrEqual(1);

  const samples: Array<{ frame: number; time: number }> = [];

  for (const progress of [0.24, 0.52, 0.8]) {
    await scrollToProgress(page, progress);
    await expect
      .poll(async () => {
        const frame = Number(
          await hero.getAttribute("data-current-frame"),
        );
        const currentMedia = await readHeroMedia(page);

        return (
          frame > progress * 192 - 15 &&
          currentMedia.readyState >= 2 &&
          !currentMedia.seeking
        );
      })
      .toBe(true);

    const media = await readHeroMedia(page);
    const frame = Number(await hero.getAttribute("data-current-frame"));

    samples.push({ frame, time: media.currentTime });
    expect(media.paused).toBe(true);
  }

  expect(samples[0].frame).toBeGreaterThan(0);
  expect(samples[0].frame).toBeLessThan(100);
  expect(samples[1].frame).toBeGreaterThan(samples[0].frame);
  expect(samples[2].frame).toBeGreaterThan(samples[1].frame);
  expect(samples[0].time).toBeGreaterThan(0.5);
  expect(samples[1].time).toBeGreaterThan(samples[0].time);
  expect(samples[2].time).toBeGreaterThan(samples[1].time);
  expect(errors).toEqual([]);
});

test("touch breakpoint swaps desktop and mobile video sources without stale state", async ({
  browser,
}) => {
  const { context, page } = await createTouchPage(browser);
  const errors = trackUnexpectedErrors(page);

  await page.goto("/");
  let hero = await waitForReady(page);
  let media = await readHeroMedia(page);

  await expect(hero).toHaveAttribute("data-sequence-source", "desktop");
  expect(media.src).toContain("/videos/hero/desktop.mp4");

  await page.setViewportSize({ width: 390, height: 844 });
  hero = await waitForReady(page);
  media = await readHeroMedia(page);

  await expect(hero).toHaveAttribute("data-sequence-source", "mobile");
  expect(media.src).toContain("/videos/hero/mobile.mp4");

  await scrollToProgress(page, 0.55);
  await expect
    .poll(async () => Number(await hero.getAttribute("data-current-frame")))
    .toBeGreaterThan(50);

  await page.setViewportSize({ width: 1024, height: 768 });
  hero = await waitForReady(page);
  media = await readHeroMedia(page);

  await expect(hero).toHaveAttribute("data-sequence-source", "desktop");
  expect(media.src).toContain("/videos/hero/desktop.mp4");
  expect(errors).toEqual([]);

  await context.close();
});

test("reduced motion keeps a complete static story and can change at runtime", async ({
  page,
}) => {
  const errors = trackUnexpectedErrors(page);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const hero = page.locator(".hero-sequence");

  await expect(hero).toHaveAttribute("aria-busy", "false");
  await expect(hero).toHaveAttribute("data-static-layout", "true");
  await expect(hero).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator(".hero-sequence__video")).toHaveCount(0);
  await expect(page.locator(".pin-spacer")).toHaveCount(0);
  await expect(
    page.getByText("Continue to discover who we are."),
  ).toBeAttached();
  await expect(
    page.getByText("Loading the opening frame", { exact: true }),
  ).toHaveCount(0);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 568, height: 320 },
    { width: 160, height: 284 },
  ]) {
    await page.setViewportSize(viewport);
    const overflows = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );

    expect(overflows).toBe(false);
  }

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await waitForReady(page);
  await expect(hero).toHaveAttribute("data-static-layout", "false");
  expect(errors).toEqual([]);
});

test("video failure clears busy state and exposes a semantic static fallback", async ({
  page,
}) => {
  await page.route("**/videos/hero/desktop.mp4*", (route) =>
    route.abort(),
  );
  await page.goto("/");

  const hero = page.locator(".hero-sequence");
  const alert = hero.getByRole("alert");

  await expect(alert).toBeVisible();
  await expect(hero).toHaveAttribute("aria-busy", "false");
  await expect(hero).toHaveAttribute("data-static-layout", "true");
  await expect(page.locator(".hero-sequence__video")).toHaveCount(0);
  await expect(
    hero.getByText("Nothing Missing.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Continue to discover who we are."),
  ).toBeVisible();
});

test("hero media is cacheable and ends on the welcome state", async ({
  page,
}) => {
  const videoResponse = page.waitForResponse((response) =>
    response.url().includes("/videos/hero/desktop.mp4"),
  );

  await page.goto("/");
  const response = await videoResponse;
  const hero = await waitForReady(page);

  expect(response.headers()["cache-control"]).toContain(
    "max-age=31536000",
  );

  await scrollToProgress(page, 1);
  await expect
    .poll(async () => Number(await hero.getAttribute("data-current-frame")))
    .toBeGreaterThan(175);
  await expect(
    page.locator('[data-hero-copy="welcome"]'),
  ).toBeVisible();
  await expect(
    page.locator(".hero-sequence__brand-stage"),
  ).toHaveCount(0);
});
