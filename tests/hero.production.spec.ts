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

test("production smoke has versioned frames, optimized branding, and clean static fallback", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const frameRequests: string[] = [];
  const logoRequests: string[] = [];

  page.on("request", (request) => {
    if (request.url().includes("/sequences/hero/")) {
      frameRequests.push(request.url());
    }

    if (request.url().includes("/brand/")) {
      logoRequests.push(request.url());
    }
  });

  await page.goto("/");
  const hero = page.locator(".hero-sequence");

  await expect(hero).toHaveAttribute("aria-busy", "false");
  await expect(hero).toHaveAttribute("data-canvas-ready", "true");
  await expect
    .poll(() => frameRequests.length)
    .toBeGreaterThan(0);
  expect(
    frameRequests.every((request) =>
      request.includes("v=2026-07-30-hero-1"),
    ),
  ).toBe(true);

  await page.screenshot({
    path: "test-results/hero-production-desktop.png",
    fullPage: false,
  });
  await page.evaluate(() => {
    const release =
      document.querySelector<HTMLElement>(".hero-release");

    window.scrollTo(
      0,
      Math.max(
        0,
        (release?.offsetTop ?? document.documentElement.scrollHeight) -
          window.innerHeight * 1.05,
      ),
    );
  });
  await expect
    .poll(() =>
      logoRequests.some((request) =>
        request.includes("/brand/edsa-logo.optimized.svg"),
      ),
    )
    .toBe(true);
  await expect(hero).toHaveAttribute("data-logo-status", "ready");
  await expect
    .poll(async () =>
      Number(await hero.getAttribute("data-logo-transition")),
    )
    .toBeGreaterThan(0.99);

  await page.screenshot({
    path: "test-results/hero-production-final.png",
    fullPage: false,
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 568, height: 320 });
  await expect(hero).toHaveAttribute("data-static-layout", "true");
  await expect(
    page.getByText("Continue to discover who we are."),
  ).toBeAttached();
  await page.screenshot({
    path: "test-results/hero-production-reduced-landscape.png",
    fullPage: true,
  });

  expect(errors).toEqual([]);
});
