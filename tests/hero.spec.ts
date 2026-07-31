import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  test,
} from "@playwright/test";

interface SequenceMetrics {
  engineKey: string;
  sourceKey: "desktop" | "mobile";
  loadingMode: "FULL" | "CONSERVATIVE";
  queueDepth: number;
  maxQueueDepth: number;
  activeDecodes: number;
  maxActiveDecodes: number;
  decodedFrames: number;
  maxDecodedFrames: number;
  decodedFrameBudget: number;
  networkRequests: number;
  uniqueNetworkRequests: number;
  fetchedPayloadBytes: number;
  backgroundRequests: number;
  duplicateJobsAvoided: number;
  droppedQueueJobs: number;
  staleDecodeResults: number;
  documentVisible: boolean;
  heroActive: boolean;
  userProgressed: boolean;
  disposed: boolean;
}

interface SequenceDebugRegistry {
  activeEngineKey: string | null;
  engines: Record<string, SequenceMetrics>;
}

interface NetworkMeasurement {
  urls: string[];
  compressedBytes: number;
  entries: Array<{ url: string; bytes: number }>;
}

interface ResourceMeasurement {
  totalRequests: number;
  uniqueUrls: number;
  transferredBytes: number;
  encodedBodyBytes: number;
  cacheHits: number;
}

async function waitForReady(page: Page) {
  const hero = page.locator(".hero-sequence");

  await expect(hero).toHaveAttribute("aria-busy", "false");
  await expect(hero).not.toHaveAttribute("data-ready-engine-key", "");
  return hero;
}

async function readDebug(page: Page) {
  return page.evaluate(() => {
    const registry = (
      window as Window & {
        __EDSA_HERO_SEQUENCE_DEBUG__?: SequenceDebugRegistry;
      }
    ).__EDSA_HERO_SEQUENCE_DEBUG__;

    if (!registry?.activeEngineKey) {
      return null;
    }

    return registry.engines[registry.activeEngineKey] ?? null;
  });
}

async function readSequenceResources(
  page: Page,
  source?: "desktop" | "mobile",
) {
  return page.evaluate((sequenceSource) => {
    const entries = performance
      .getEntriesByType("resource")
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          entry instanceof PerformanceResourceTiming &&
          entry.name.includes("/sequences/hero/") &&
          (!sequenceSource ||
            entry.name.includes(
              `/sequences/hero/${sequenceSource}/`,
            )),
      );

    return {
      totalRequests: entries.length,
      uniqueUrls: new Set(entries.map((entry) => entry.name)).size,
      transferredBytes: entries.reduce(
        (total, entry) => total + entry.transferSize,
        0,
      ),
      encodedBodyBytes: entries.reduce(
        (total, entry) => total + entry.encodedBodySize,
        0,
      ),
      cacheHits: entries.filter(
        (entry) => entry.transferSize === 0,
      ).length,
    } satisfies ResourceMeasurement;
  }, source);
}

function measureSequenceNetwork(page: Page): NetworkMeasurement {
  const measurement: NetworkMeasurement = {
    urls: [],
    compressedBytes: 0,
    entries: [],
  };

  page.on("response", (response) => {
    if (!response.url().includes("/sequences/hero/")) {
      return;
    }

    const bytes = Number(
      response.headers()["content-length"] ?? 0,
    );

    measurement.urls.push(response.url());
    measurement.compressedBytes += bytes;
    measurement.entries.push({ url: response.url(), bytes });
  });

  return measurement;
}

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
  await page.waitForTimeout(40);
}

async function createTouchPage(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(() => {
    const connection = new EventTarget() as EventTarget & {
      saveData: boolean;
      effectiveType: string;
      downlink: number;
    };

    connection.saveData = false;
    connection.effectiveType = "4g";
    connection.downlink = 10;
    Object.defineProperties(navigator, {
      connection: {
        configurable: true,
        value: connection,
      },
      deviceMemory: {
        configurable: true,
        value: 8,
      },
    });
  });
  const page = await context.newPage();

  return { context, page };
}

test("desktop readiness, bounded rapid scrub, and no-scroll network budget", async ({
  page,
}) => {
  const errors = trackUnexpectedErrors(page);
  const network = measureSequenceNetwork(page);

  await page.addInitScript(() => {
    const connection = new EventTarget() as EventTarget & {
      saveData: boolean;
      effectiveType: string;
      downlink: number;
    };

    connection.saveData = false;
    connection.effectiveType = "4g";
    connection.downlink = 10;
    Object.defineProperties(navigator, {
      connection: {
        configurable: true,
        value: connection,
      },
      deviceMemory: {
        configurable: true,
        value: 8,
      },
    });
  });
  await page.goto("/");
  const hero = await waitForReady(page);
  await expect(hero).toHaveAttribute("data-sequence-source", "desktop");
  await expect(hero).toHaveAttribute("data-loading-mode", "FULL");
  await expect(hero).toHaveAttribute("data-canvas-ready", "true");
  await page.waitForTimeout(800);

  const withoutScroll = {
    requests: new Set(network.urls).size,
    bytes: network.compressedBytes,
    resources: await readSequenceResources(page, "desktop"),
  };

  expect(withoutScroll.requests).toBeLessThanOrEqual(16);
  expect(withoutScroll.bytes).toBeLessThan(1_000_000);

  await scrollToProgress(page, 0.35);
  await page.waitForTimeout(100);
  const beforeHidden = await readDebug(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute(
    "data-loading-mode",
    "CONSERVATIVE",
  );
  await page.waitForTimeout(500);
  const whileHidden = await readDebug(page);

  expect(whileHidden?.backgroundRequests ?? 0).toBeLessThanOrEqual(
    (beforeHidden?.backgroundRequests ?? 0) + 2,
  );

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute("data-loading-mode", "FULL");

  for (const progress of [
    0.1, 0.35, 0.72, 0.98, 0.64, 0.25, 0.84, 0.15, 1, 0,
  ]) {
    await scrollToProgress(page, progress);
  }

  await page.waitForTimeout(900);
  const metrics = await readDebug(page);
  const resources = await readSequenceResources(page, "desktop");

  expect(metrics).not.toBeNull();
  expect(metrics?.maxQueueDepth).toBeLessThanOrEqual(20);
  expect(metrics?.maxActiveDecodes).toBeLessThanOrEqual(2);
  expect(metrics?.maxDecodedFrames).toBeLessThanOrEqual(
    metrics?.decodedFrameBudget ?? 0,
  );
  expect(metrics?.duplicateJobsAvoided).toBeGreaterThan(0);
  expect(metrics?.backgroundRequests).toBeGreaterThan(0);
  expect(errors).toEqual([]);

  console.log(
    "DESKTOP_METRICS",
    JSON.stringify({ withoutScroll, resources, metrics }),
  );
});

test("touch breakpoint switches both directions and disposes obsolete engines", async ({
  browser,
}) => {
  const { context, page } = await createTouchPage(browser);
  const errors = trackUnexpectedErrors(page);
  const network = measureSequenceNetwork(page);

  await page.goto("/");
  let hero = await waitForReady(page);
  await expect(hero).toHaveAttribute("data-sequence-source", "desktop");
  const desktopEngineKey = await hero.getAttribute(
    "data-active-engine-key",
  );

  network.urls.length = 0;
  network.compressedBytes = 0;
  network.entries.length = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  hero = await waitForReady(page);
  await expect(hero).toHaveAttribute("data-sequence-source", "mobile");
  await expect(hero).toHaveAttribute("data-loading-mode", "FULL");
  await page.waitForTimeout(800);
  const mobileEngineKey = await hero.getAttribute(
    "data-active-engine-key",
  );
  const mobileEntries = network.entries.filter(({ url }) =>
    url.includes("/sequences/hero/mobile/"),
  );
  const mobileWithoutScroll = {
    requests: new Set(mobileEntries.map(({ url }) => url)).size,
    bytes: mobileEntries.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    resources: await readSequenceResources(page, "mobile"),
  };

  expect(mobileEngineKey).not.toBe(desktopEngineKey);
  expect(mobileWithoutScroll.requests).toBeLessThanOrEqual(16);
  expect(mobileWithoutScroll.bytes).toBeLessThan(2_000_000);
  expect(
    await page.evaluate((previousEngineKey) => {
      const registry = (
        window as Window & {
          __EDSA_HERO_SEQUENCE_DEBUG__?: SequenceDebugRegistry;
        }
      ).__EDSA_HERO_SEQUENCE_DEBUG__;

      return Boolean(
        previousEngineKey &&
          registry?.engines[previousEngineKey]?.disposed,
      );
    }, desktopEngineKey),
  ).toBe(true);

  for (const progress of [0.12, 0.7, 0.95, 0.4, 0.82, 0.05]) {
    await scrollToProgress(page, progress);
  }
  await page.waitForTimeout(700);
  const mobileMetrics = await readDebug(page);
  const mobileResources = await readSequenceResources(
    page,
    "mobile",
  );

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(hero).toHaveAttribute("data-sequence-source", "mobile");
  await page.route(
    "**/sequences/hero/desktop/frame-0001.webp*",
    async (route) => {
      const response = await route.fetch();

      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ response });
    },
  );
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(hero).toHaveAttribute("data-sequence-source", "desktop");
  const replacementState = await hero.evaluate((element) => ({
    busy: element.getAttribute("aria-busy"),
    readyEngineKey: element.getAttribute("data-ready-engine-key"),
    staticLayout: element.getAttribute("data-static-layout"),
  }));

  expect(replacementState).toEqual({
    busy: "true",
    readyEngineKey: "",
    staticLayout: "false",
  });
  hero = await waitForReady(page);

  const oldMobileEngineDisposed = await page.evaluate(
    ({ current, previous }) => {
      const registry = (
        window as Window & {
          __EDSA_HERO_SEQUENCE_DEBUG__?: SequenceDebugRegistry;
        }
      ).__EDSA_HERO_SEQUENCE_DEBUG__;

      return Boolean(
        current &&
          previous &&
          registry?.activeEngineKey === current &&
          !registry.engines[current]?.disposed &&
          registry.engines[previous]?.disposed,
      );
    },
    {
      current: await hero.getAttribute("data-active-engine-key"),
      previous: mobileEngineKey,
    },
  );

  expect(oldMobileEngineDisposed).toBe(true);
  expect(errors).toEqual([]);
  console.log(
    "MOBILE_METRICS",
    JSON.stringify({
      withoutScroll: mobileWithoutScroll,
      resources: mobileResources,
      metrics: mobileMetrics,
    }),
  );
  await context.close();
});

test("reduced motion changes at runtime and remains reachable in extreme viewports", async ({
  page,
}) => {
  const errors = trackUnexpectedErrors(page);

  await page.goto("/");
  const hero = await waitForReady(page);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).toHaveAttribute("data-static-layout", "true");
  await expect(hero).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator(".pin-spacer")).toHaveCount(0);

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 568, height: 320 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 160, height: 284 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(
      page.getByText("Continue to discover who we are."),
    ).toBeAttached();

    const layout = await page.evaluate(() => ({
      horizontalOverflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));

    expect(layout.horizontalOverflow).toBe(false);
    expect(layout.scrollHeight).toBeGreaterThanOrEqual(
      layout.clientHeight,
    );
  }

  await page.addStyleTag({
    content: ":root { font-size: 200% !important; }",
  });
  await page.setViewportSize({ width: 320, height: 568 });
  const largeTextLayout = await page.evaluate(() => ({
    horizontalOverflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
    bottom: document.documentElement.scrollHeight,
  }));

  expect(largeTextLayout.horizontalOverflow).toBe(false);
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect(
    page.getByText("Continue to discover who we are."),
  ).toBeInViewport();

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(hero).toHaveAttribute("data-static-layout", "false");
  await waitForReady(page);
  expect(errors).toEqual([]);
});

test("Save-Data stays conservative and hidden pages pause background preload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const connection = new EventTarget() as EventTarget & {
      saveData: boolean;
      effectiveType: string;
      downlink: number;
    };

    connection.saveData = true;
    connection.effectiveType = "4g";
    connection.downlink = 10;
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: connection,
    });
  });

  const network = measureSequenceNetwork(page);

  await page.goto("/");
  const hero = await waitForReady(page);
  await expect(hero).toHaveAttribute(
    "data-loading-mode",
    "CONSERVATIVE",
  );
  await page.waitForTimeout(700);
  const beforeScrub = new Set(network.urls).size;
  const beforeScrubBytes = network.compressedBytes;

  expect(beforeScrub).toBeLessThanOrEqual(16);

  for (const progress of [0.1, 0.9, 0.2, 0.8, 0.05, 1, 0.4]) {
    await scrollToProgress(page, progress);
  }

  await page.waitForTimeout(600);
  const conservativeMetrics = await readDebug(page);
  const conservativeResources = await readSequenceResources(
    page,
    "desktop",
  );

  expect(conservativeMetrics?.backgroundRequests).toBe(0);
  expect(conservativeMetrics?.maxQueueDepth).toBeLessThanOrEqual(20);
  expect(conservativeMetrics?.maxDecodedFrames).toBeLessThanOrEqual(
    conservativeMetrics?.decodedFrameBudget ?? 0,
  );

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(hero).toHaveAttribute(
    "data-loading-mode",
    "CONSERVATIVE",
  );

  const hiddenStart = await readDebug(page);
  await page.waitForTimeout(500);
  const hiddenEnd = await readDebug(page);

  expect(hiddenEnd?.backgroundRequests).toBe(
    hiddenStart?.backgroundRequests,
  );

  console.log(
    "CONSERVATIVE_METRICS",
    JSON.stringify({
      withoutScroll: {
        requests: beforeScrub,
        bytes: beforeScrubBytes,
      },
      resources: conservativeResources,
      metrics: conservativeMetrics,
    }),
  );
});

test("poster survives unavailable canvas context", async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext =
      HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === "2d") {
        return null;
      }

      return originalGetContext.call(
        this,
        contextId as "bitmaprenderer",
        ...args,
      );
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto("/");
  const hero = await waitForReady(page);

  await expect(hero).toHaveAttribute("data-canvas-error", "true");
  await expect(hero).toHaveAttribute("data-canvas-ready", "false");
  await expect(
    page.locator(".hero-sequence__poster"),
  ).toHaveAttribute("data-visible", "true");
  await expect(page.locator(".hero-sequence__poster")).toBeVisible();
});

test("late official logo crossfades independently and failure retains final frame", async ({
  browser,
}) => {
  const lateContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const latePage = await lateContext.newPage();

  await latePage.route(
    "**/brand/edsa-logo.optimized.svg",
    async (route) => {
      const response = await route.fetch();

      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.fulfill({ response });
    },
  );
  await latePage.goto("/");
  let hero = await waitForReady(latePage);
  await scrollToProgress(latePage, 1);
  await expect(hero).toHaveAttribute("data-logo-status", "loading");
  const beforeLoadOpacity = Number(
    await latePage
      .locator(".hero-sequence__brand-stage")
      .evaluate((element) => getComputedStyle(element).opacity),
  );

  expect(beforeLoadOpacity).toBe(0);
  await expect(hero).toHaveAttribute("data-logo-status", "ready");
  await expect
    .poll(async () =>
      Number(
        await latePage
          .locator(".hero-sequence__brand-stage")
          .evaluate((element) => getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0.95);
  await lateContext.close();

  const failureContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const failurePage = await failureContext.newPage();

  await failurePage.route(
    "**/brand/edsa-logo.optimized.svg",
    (route) => route.abort(),
  );
  await failurePage.goto("/");
  hero = await waitForReady(failurePage);
  await scrollToProgress(failurePage, 1);
  await expect(hero).toHaveAttribute("data-logo-status", "error");
  await expect(hero).toHaveAttribute("data-canvas-ready", "true");
  await expect(
    failurePage.locator('[data-hero-copy="welcome"]'),
  ).toBeVisible();
  const failureOpacity = Number(
    await failurePage
      .locator(".hero-sequence__brand-stage")
      .evaluate((element) => getComputedStyle(element).opacity),
  );

  expect(failureOpacity).toBe(0);
  await failureContext.close();
});

test("terminal frame failure clears aria-busy and exposes a semantic static fallback", async ({
  page,
}) => {
  await page.route(
    "**/sequences/hero/desktop/frame-0001.webp*",
    (route) => route.abort(),
  );
  await page.goto("/");
  const hero = page.locator(".hero-sequence");
  const alert = page.getByRole("alert");

  await expect(alert).toBeVisible();
  await expect(hero).toHaveAttribute("aria-busy", "false");
  await expect(hero).toHaveAttribute("data-static-layout", "true");
  await expect(
    page.getByText("Eagle’s Dominion", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Nothing Missing.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Continue to discover who we are."),
  ).toBeVisible();
});
