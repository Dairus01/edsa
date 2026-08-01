import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { hashTargetIds, navigationItems } from "../src/config/navigation";
import { scripture } from "../src/content/scripture";

const renderedScripture = [
  scripture.restoration,
  scripture.word,
  scripture.generations,
];

async function waitForHero(page: Page) {
  await expect(page.locator("#home")).toHaveAttribute("aria-busy", "false");
}

async function expectTargetBelowNavigation(page: Page, id: string) {
  await expect
    .poll(() =>
      page.evaluate((targetId) => {
        const target = document.getElementById(targetId)!;
        const navigation = document.querySelector(".site-header")!;

        return (
          target.getBoundingClientRect().top >=
          navigation.getBoundingClientRect().bottom + 10
        );
      }, id),
    )
    .toBe(true);
}

test("navigation targets and Scripture remain centralized and semantic", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

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
  for (const entry of renderedScripture) {
    const moment = page.locator(`[data-scripture-moment="${entry.id}"]`);

    await expect(moment).toHaveCount(1);
    await expect(moment.locator("p")).toHaveText(entry.text);
    await expect(moment.locator("cite")).toHaveText(
      `${entry.reference} · KJV`,
    );
  }
});

test("verse wording is sourced only from scripture.ts", () => {
  const componentFiles = [
    "src/components/sections/IdentityManifesto.tsx",
    "src/components/sections/TheWord.tsx",
    "src/components/sections/EveryGeneration.tsx",
    "src/components/sections/FinalInvitation.tsx",
    "src/components/content/ScriptureMoment.tsx",
  ].map((file) => readFileSync(join(process.cwd(), file), "utf8"));

  for (const entry of Object.values(scripture)) {
    expect(componentFiles.every((source) => !source.includes(entry.text))).toBe(
      true,
    );
    expect(entry.translation).toBe("KJV");
  }
});

test("desktop anchors navigate and focus section headings", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForHero(page);

  const about = page
    .locator(".site-header__nav--desktop")
    .getByRole("link", { name: "About" });

  await about.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#identity$/);
  await expect(about).toHaveAttribute("aria-current", "location");
  await expectTargetBelowNavigation(page, "identity");
  await expect
    .poll(() =>
      page
        .locator("#identity h2")
        .evaluate((heading) => document.activeElement === heading),
    )
    .toBe(true);
});

test("mobile menu dismisses cleanly and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await waitForHero(page);

  const trigger = page.getByRole("button", { name: "Menu", exact: true });

  await trigger.click();
  await expect(page.locator("#site-navigation-dialog")).toBeVisible();
  await page
    .locator(".mobile-navigation__links")
    .getByRole("link", { name: "Visit", exact: true })
    .click();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#visit$/);
  await expectTargetBelowNavigation(page, "visit");
});
