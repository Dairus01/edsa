import { expect, type Browser, type Page, test } from "@playwright/test";

const desktopIdentityViewports = [
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

const destinationIds = [
  "identity",
  "experience",
  "the-word",
  "generations",
  "visit",
] as const;

async function waitForHero(page: Page) {
  await expect(page.locator("#home")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

function overlapArea(
  first: { left: number; right: number; top: number; bottom: number },
  second: { left: number; right: number; top: number; bottom: number },
) {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left),
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top),
  );

  return width * height;
}

test("Identity reserves verse space without covering location or copy", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHero(page);

  for (const viewport of desktopIdentityViewports) {
    await page.setViewportSize(viewport);

    const geometry = await page.locator("#identity").evaluate((section) => {
      const location = section.querySelector<HTMLElement>(
        ".identity-manifesto__location",
      )!;
      const verse = section.querySelector<HTMLElement>(
        ".identity-manifesto__scripture",
      )!;
      const body = section.querySelector<HTMLElement>(
        ".identity-manifesto__body",
      )!;
      const bounds = section.getBoundingClientRect();

      return {
        body: body.getBoundingClientRect().toJSON(),
        location: location.getBoundingClientRect().toJSON(),
        section: bounds.toJSON(),
        verse: verse.getBoundingClientRect().toJSON(),
        locationVisibility: getComputedStyle(location).visibility,
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      };
    });

    expect(
      overlapArea(geometry.location, geometry.verse),
      `${viewport.width}x${viewport.height}: location/verse`,
    ).toBe(0);
    expect(
      overlapArea(geometry.body, geometry.verse),
      `${viewport.width}x${viewport.height}: body/verse`,
    ).toBe(0);
    expect(geometry.locationVisibility).toBe("visible");
    expect(geometry.location.bottom).toBeLessThanOrEqual(
      geometry.section.bottom + 1,
    );
    expect(geometry.verse.bottom).toBeLessThanOrEqual(
      geometry.section.bottom + 1,
    );
    expect(geometry.overflow).toBe(false);
  }
});

test("Identity follows the mobile image, headline, body, location, verse order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const tops = await page.locator("#identity").evaluate((section) =>
    [
      ".identity-manifesto__image",
      ".identity-manifesto__headline",
      ".identity-manifesto__body",
      ".identity-manifesto__location",
      ".identity-manifesto__scripture",
    ].map(
      (selector) =>
        section.querySelector<HTMLElement>(selector)!.getBoundingClientRect()
          .top,
    ),
  );

  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  await expect(
    page.getByText("Currently gathering in Sapele, Delta State."),
  ).toBeAttached();
});

test("all explicit section destinations clear the fixed navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#the-word");
  await waitForHero(page);

  for (const id of destinationIds) {
    await page.evaluate((targetId) => {
      window.history.pushState(null, "", `#${targetId}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, id);

    await expect
      .poll(
        () =>
          page.evaluate((targetId) => {
            const navigation = document.querySelector(".site-header")!;
            const heading = document.querySelector<HTMLElement>(
              `#${targetId} h2`,
            )!;

            return (
              heading.getBoundingClientRect().top -
              navigation.getBoundingClientRect().bottom
            );
          }, id),
        { message: id },
      )
      .toBeGreaterThanOrEqual(15);
  }

  await page.goBack();
  await page.goForward();
  await expect(page).toHaveURL(/#visit$/);
});

test("mobile footer and post-hero scenes remain content driven", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const metrics = await page.evaluate(() => ({
    footerRatio:
      document.querySelector<HTMLElement>("#footer")!.offsetHeight /
      window.innerHeight,
    sections: [...document.querySelectorAll<HTMLElement>(
      "[data-scroll-section]:not(#home)",
    )].map((section) => ({
      id: section.id,
      ratio: section.offsetHeight / window.innerHeight,
      stickyDescendants: [...section.querySelectorAll<HTMLElement>("*")].filter(
        (element) => getComputedStyle(element).position === "sticky",
      ).length,
    })),
  }));

  expect(metrics.footerRatio).toBeLessThanOrEqual(1.1);
  expect(metrics.sections.filter(({ ratio }) => ratio > 1.5)).toEqual([]);
  expect(metrics.sections.filter(({ stickyDescendants }) => stickyDescendants > 0)).toEqual(
    [],
  );
  await expect(page.locator("#footer")).toContainText(
    "107 Okpe Road, Sapele",
  );
});

test("hero identity and actions are visible without hydration", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();

  await page.goto("/");
  const identity = page.locator('[data-hero-copy="identity"]');

  await expect(identity.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(identity).not.toHaveCSS("opacity", "0");
  await expect(
    identity.getByRole("link", { name: "Plan Your Visit" }),
  ).toHaveAttribute("href", "#visit");
  await expect(
    identity.getByRole("link", { name: "Discover EDSA" }),
  ).toHaveAttribute("href", "#identity");
  await context.close();
});

async function trackEnhancementRuntime(page: Page) {
  const runtimeResponses: string[] = [];

  page.on("response", async (response) => {
    if (!response.url().includes("/_next/static/chunks/")) {
      return;
    }

    try {
      const body = await response.text();

      if (body.includes("edsa-preaching-depth-runtime-v1")) {
        runtimeResponses.push(response.url());
      }
    } catch {
      // A cancelled response is not an enhancement request.
    }
  });

  return runtimeResponses;
}

test("mobile and reduced-motion sessions do not request the preaching runtime", async ({
  browser,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      reducedMotion,
    });
    const page = await context.newPage();
    const runtimeResponses = await trackEnhancementRuntime(page);

    await page.goto("/");
    await waitForHero(page);
    await page.locator("#the-word").scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);

    await expect(page.locator(".preaching-depth")).toHaveAttribute(
      "data-enhancement-state",
      "disabled",
    );
    expect(runtimeResponses).toEqual([]);
    await context.close();
  }
});

test("touch tablets and large displays show all preaching scenes without collisions", async ({
  browser,
}) => {
  const viewports = [
    { name: "iPad Pro portrait", width: 1024, height: 1366 },
    { name: "iPad Pro landscape", width: 1366, height: 1024 },
    { name: "Asus Zenbook Fold portrait", width: 853, height: 1280 },
    { name: "Asus Zenbook Fold landscape", width: 1280, height: 853 },
    { name: "Nest Hub Max", width: 1280, height: 800 },
  ] as const;

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto("/");
    await waitForHero(page);
    await page.locator("#the-word").scrollIntoViewIfNeeded();

    const root = page.locator("#the-word .preaching-depth");
    await expect(root, viewport.name).toHaveAttribute(
      "data-enhancement-state",
      "disabled",
    );
    await expect(root, viewport.name).toHaveAttribute(
      "data-layout",
      "static",
    );
    await expect
      .poll(
        () =>
          root.locator("img").evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
        { message: viewport.name },
      )
      .toBe(true);

    const geometry = await root.evaluate((element) => {
      const bounds = (node: Element) =>
        node.getBoundingClientRect().toJSON();
      const layers = [
        ...element.querySelectorAll<HTMLElement>(
          ".preaching-depth__layer",
        ),
      ];
      const captions = [
        ...element.querySelectorAll<HTMLElement>(
          ".preaching-depth__mobile-beat",
        ),
      ];

      return {
        captions: captions.map((caption) => ({
          bounds: bounds(caption),
          display: getComputedStyle(caption).display,
          text: caption.textContent?.trim(),
        })),
        desktopBeatDisplay: getComputedStyle(
          element.querySelector<HTMLElement>(
            ".preaching-depth__beats",
          )!,
        ).display,
        documentOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
        layers: layers.map((layer) => ({
          bounds: bounds(layer),
          opacity: getComputedStyle(layer).opacity,
          position: getComputedStyle(layer).position,
        })),
      };
    });

    expect(geometry.layers, viewport.name).toHaveLength(3);
    expect(geometry.captions.map(({ text }) => text), viewport.name).toEqual([
      "Conviction for real life.",
      "Clarity for the road ahead.",
      "Truth carried forward.",
    ]);
    expect(geometry.desktopBeatDisplay, viewport.name).toBe("none");
    expect(geometry.documentOverflow, viewport.name).toBe(false);
    expect(
      new Set(
        geometry.layers.map(
          ({ bounds }) => `${Math.round(bounds.left)}:${Math.round(bounds.top)}`,
        ),
      ).size,
      `${viewport.name}: layer positions`,
    ).toBe(3);

    for (let index = 0; index < geometry.layers.length; index += 1) {
      const layer = geometry.layers[index];
      const caption = geometry.captions[index];

      expect(layer.position, `${viewport.name}: layer ${index}`).toBe(
        "relative",
      );
      expect(layer.opacity, `${viewport.name}: layer ${index}`).toBe("1");
      expect(caption.display, `${viewport.name}: caption ${index}`).toBe(
        "block",
      );
      expect(
        caption.bounds.left >= layer.bounds.left - 1 &&
          caption.bounds.right <= layer.bounds.right + 1 &&
          caption.bounds.top >= layer.bounds.top - 1 &&
          caption.bounds.bottom <= layer.bounds.bottom + 1,
        `${viewport.name}: caption ${index} containment`,
      ).toBe(true);

      for (let other = index + 1; other < geometry.layers.length; other += 1) {
        expect(
          overlapArea(layer.bounds, geometry.layers[other].bounds),
          `${viewport.name}: layers ${index}/${other}`,
        ).toBe(0);
        expect(
          overlapArea(caption.bounds, geometry.captions[other].bounds),
          `${viewport.name}: captions ${index}/${other}`,
        ).toBe(0);
      }
    }

    await context.close();
  }
});

test("responsive images expose measured sizes and a dedicated mobile poster", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const poster = page.locator(".hero-sequence__poster");
  await expect(poster).toHaveAttribute(
    "data-mobile-poster",
    "/sequences/hero/mobile-poster.webp",
  );
  await expect
    .poll(() => poster.evaluate((image) => (image as HTMLImageElement).currentSrc))
    .toContain("/sequences/hero/mobile-poster.webp");

  const belowFoldImages = page.locator(
    "#identity img, #experience img, #the-word img, #generations img, #visit img",
  );
  const delivery = await belowFoldImages.evaluateAll((images) =>
    images.map((image) => ({
      loading: (image as HTMLImageElement).loading,
      sizes: (image as HTMLImageElement).sizes,
    })),
  );

  expect(delivery.every(({ loading }) => loading === "lazy")).toBe(true);
  expect(delivery.every(({ sizes }) => sizes.length > 0)).toBe(true);
});
