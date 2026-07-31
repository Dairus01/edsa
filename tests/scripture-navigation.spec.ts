import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import {
  hashTargetIds,
  navigationItems,
} from "../src/config/navigation";
import { scripture } from "../src/content/scripture";

const scriptureEntries = Object.values(scripture);

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
  await expect(page.locator("#home")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function expectTargetBelowNavigation(page: Page, id: string) {
  await expect
    .poll(() =>
      page.evaluate((targetId) => {
        const target = document.getElementById(targetId);
        const navigation = document.querySelector(".site-header");

        if (!target || !navigation) {
          return null;
        }

        const targetTop = target.getBoundingClientRect().top;
        const navBottom = navigation.getBoundingClientRect().bottom;

        return (
          targetTop >= navBottom + 10 &&
          targetTop <= navBottom + 50
        );
      }, id),
    )
    .toBe(true);

  const geometry = await page.evaluate((targetId) => {
    const target = document.getElementById(targetId)!;
    const navigation = document.querySelector(".site-header")!;

    return {
      targetTop: target.getBoundingClientRect().top,
      navBottom: navigation.getBoundingClientRect().bottom,
    };
  }, id);

  expect(geometry.targetTop).toBeGreaterThanOrEqual(
    geometry.navBottom + 10,
  );
}

test("navigation and Scripture are centrally configured and semantic", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(
    page.locator('.site-header__wordmark[href="#home"]'),
  ).toHaveText("EDSA");
  await expect(page.locator(".site-header img")).toHaveCount(0);

  for (const item of navigationItems) {
    await expect(
      page
        .locator(".site-header__nav--desktop")
        .getByRole("link", { name: item.label, exact: true }),
    ).toHaveAttribute("href", item.href);
  }

  for (const id of hashTargetIds) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }

  const duplicateIds = await page.evaluate(() => {
    const counts = new Map<string, number>();

    document.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
      counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    });

    return [...counts.entries()].filter(([, count]) => count > 1);
  });

  expect(duplicateIds).toEqual([]);
  await expect(page.locator("blockquote.scripture-moment")).toHaveCount(6);

  for (const entry of scriptureEntries) {
    const moment = page.locator(
      `[data-scripture-moment="${entry.id}"]`,
    );

    await expect(moment).toHaveCount(1);
    await expect(moment.locator("p")).toHaveText(entry.text);
    await expect(moment.locator("cite")).toHaveText(
      `${entry.reference} · KJV`,
    );
  }

  expect(await page.locator("body").innerText()).not.toMatch(
    /\b(NIV|NLT|ESV|NKJV|AMP|CSB|NASB)\b/,
  );
  expect(errors).toEqual([]);
});

test("verse wording is sourced only from scripture.ts", () => {
  const componentFiles = [
    "src/components/sections/WhoWeAre.tsx",
    "src/components/sections/WhatWeBelieve.tsx",
    "src/components/sections/WhatHappensHere.tsx",
    "src/components/sections/TheWord.tsx",
    "src/components/sections/EveryGeneration.tsx",
    "src/components/sections/FinalInvitation.tsx",
    "src/components/content/ScriptureMoment.tsx",
  ].map((file) =>
    readFileSync(join(process.cwd(), file), "utf8"),
  );

  for (const entry of scriptureEntries) {
    expect(
      componentFiles.every((source) => !source.includes(entry.text)),
    ).toBe(true);
    expect(entry.translation).toBe("KJV");
  }
});

test("desktop anchors navigate, activate, and focus headings", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

  const about = page
    .locator(".site-header__nav--desktop")
    .getByRole("link", { name: "About" });

  await about.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#who-we-are$/);
  await expect(about).toHaveAttribute("aria-current", "location");
  await expectTargetBelowNavigation(page, "who-we-are");
  await expect
    .poll(() =>
      page.locator("#who-we-are h2").evaluate(
        (heading) => document.activeElement === heading,
      ),
    )
    .toBe(true);

  await page
    .locator(".site-header__nav--desktop")
    .getByRole("link", { name: "The Word" })
    .click();
  await expect(page).toHaveURL(/#the-word$/);
  await expectTargetBelowNavigation(page, "the-word");
  await expect(
    page
      .locator(".site-header__nav--desktop")
      .getByRole("link", { name: "The Word" }),
  ).toHaveAttribute("aria-current", "location");
  expect(errors).toEqual([]);
});

test("direct hashes and browser history restore stable section offsets", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.setViewportSize({ width: 1440, height: 900 });

  for (const id of ["who-we-are", "the-word", "visit"]) {
    await page.goto(`/#${id}`);
    await waitForHero(page);
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expectTargetBelowNavigation(page, id);
  }

  await page.goto("/");
  await waitForHero(page);
  await page
    .locator(".site-header__nav--desktop")
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/#who-we-are$/);
  await page
    .locator(".site-header__nav--desktop")
    .getByRole("link", { name: "Visit", exact: true })
    .click();
  await expect(page).toHaveURL(/#visit$/);

  await page.goBack();
  await expect(page).toHaveURL(/#who-we-are$/);
  await expectTargetBelowNavigation(page, "who-we-are");
  await page.goForward();
  await expect(page).toHaveURL(/#visit$/);
  await expectTargetBelowNavigation(page, "visit");
  expect(errors).toEqual([]);
});

test("navigation bypasses the hero from start, midpoint, and later sections", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);
  const desktopNav = page.locator(".site-header__nav--desktop");

  await desktopNav
    .getByRole("link", { name: "Visit", exact: true })
    .click();
  await expectTargetBelowNavigation(page, "visit");

  await page.goto("/");
  await waitForHero(page);
  await page.evaluate(() => {
    const release = document.querySelector<HTMLElement>(".hero-release");
    const range = Math.max(
      1,
      (release?.offsetTop ?? window.innerHeight) - window.innerHeight,
    );

    window.scrollTo(0, range * 0.5);
  });
  await desktopNav
    .getByRole("link", { name: "Visit", exact: true })
    .click();
  await expect(page).toHaveURL(/#visit$/);
  await expectTargetBelowNavigation(page, "visit");

  const integration = await page.evaluate(() => {
    const target = document.getElementById("visit")!;
    const canvas = document.querySelector<HTMLElement>(
      ".hero-sequence__canvas",
    );

    return {
      pinSpacerCount: document.querySelectorAll(".pin-spacer").length,
      targetVisible: target.getBoundingClientRect().top < window.innerHeight,
      canvasOverTarget:
        Boolean(canvas) &&
        canvas!.getBoundingClientRect().bottom >
          target.getBoundingClientRect().top,
    };
  });

  expect(integration.pinSpacerCount).toBe(1);
  expect(integration.targetVisible).toBe(true);
  expect(integration.canvasOverTarget).toBe(false);

  await page.locator("#invitation").scrollIntoViewIfNeeded();
  await desktopNav.getByRole("link", { name: "The Word" }).click();
  await expectTargetBelowNavigation(page, "the-word");
  expect(errors).toEqual([]);
});

test("mobile menu traps interaction, dismisses cleanly, and navigates", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const trigger = page.getByRole("button", {
    name: "Menu",
    exact: true,
  });

  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-navigation-dialog")).toBeVisible();
  await expect(page.locator("body")).toHaveClass(/navigation-menu-open/);
  expect(
    await page.evaluate(() =>
      document
        .querySelector("#site-navigation-dialog")
        ?.matches(":modal"),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      document
        .querySelector("#site-navigation-dialog")
        ?.contains(document.activeElement),
    ),
  ).toBe(true);

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("body")).not.toHaveClass(
    /navigation-menu-open/,
  );
  await expect(trigger).toBeFocused();

  await trigger.click();
  const wordLink = page
    .locator(".mobile-navigation__links")
    .getByRole("link", { name: "The Word" });

  await wordLink.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#the-word$/);
  await expectTargetBelowNavigation(page, "the-word");
  await expect
    .poll(() =>
      page.locator("#the-word h2").evaluate(
        (heading) => document.activeElement === heading,
      ),
    )
    .toBe(true);
  await expect(page.locator("body")).not.toHaveClass(
    /navigation-menu-open/,
  );
  expect(errors).toEqual([]);
});

test("navigation remains usable with reduced motion, large text, and target viewports", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);
  const trigger = page.getByRole("button", {
    name: "Menu",
    exact: true,
  });

  await trigger.click();
  await page
    .locator(".mobile-navigation__links")
    .getByRole("link", { name: "Visit", exact: true })
    .click();
  await expectTargetBelowNavigation(page, "visit");

  await page.addStyleTag({
    content: ":root { font-size: 200% !important; }",
  });
  await trigger.click();
  const mobileLayout = await page.evaluate(() => ({
    overflow:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1,
    modal: document
      .querySelector(".mobile-navigation__panel")
      ?.getBoundingClientRect(),
    tooSmall: [...document.querySelectorAll<HTMLElement>(
      ".mobile-navigation button, .mobile-navigation a, .site-header__menu-trigger",
    )]
      .filter((element) => getComputedStyle(element).display !== "none")
      .some((element) => {
        const bounds = element.getBoundingClientRect();

        return bounds.width < 44 || bounds.height < 44;
      }),
  }));

  expect(mobileLayout.overflow).toBe(false);
  expect(mobileLayout.tooSmall).toBe(false);
  expect(mobileLayout.modal?.width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");

  for (const viewport of [
    { width: 844, height: 390 },
    { width: 1024, height: 768 },
    { width: 1100, height: 800 },
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );

    expect(
      overflow,
      `${viewport.width}x${viewport.height} overflowed`,
    ).toBe(false);
  }

  expect(errors).toEqual([]);
});
