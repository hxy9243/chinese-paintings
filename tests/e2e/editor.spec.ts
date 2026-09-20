import { test, expect, type Page } from "@playwright/test";
async function point(page: Page, x: number, y: number) {
  await page.getByRole("button", { name: "Fit painting", exact: true }).click();
  const canvas = page.locator(".scene-canvas canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw Error("Missing canvas");
  const scale = Math.min(box.width / 1600, box.height / 800);
  await canvas.click({
    position: {
      x: (box.width - 1600 * scale) / 2 + x * scale,
      y: (box.height - 800 * scale) / 2 + y * scale,
    },
  });
}
async function place(
  page: Page,
  category: string,
  name: string,
  x: number,
  y: number,
) {
  await page.getByRole("tab", { name: category, exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
  await point(page, x, y);
  await page.getByRole("button", { name: "Place here", exact: true }).click();
}
test("guided composition, edit, history, persistence, reference and export", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Riverside shop", exact: true }),
  ).toBeEnabled();
  await place(page, "Buildings", "Riverside shop", 260, 610);
  await expect(
    page.getByRole("heading", { name: "Make room for a market" }),
  ).toBeVisible();
  await place(page, "Market stands", "Market table", 495, 765);
  await place(page, "Boats", "River skiff", 420, 395);
  await place(page, "Trees", "Old river tree", 150, 115);
  await expect(
    page.getByRole("heading", { name: "A little world, made by you" }),
  ).toBeVisible();
  await expect(page.locator("footer")).toContainText("4 / 40");
  await point(page, 260, 575);
  await page.getByRole("button", { name: "Variation", exact: true }).click();
  await expect(page.locator(".selection-toolbar")).toContainText(
    "Tiled dwelling",
  );
  await page.getByRole("button", { name: "Move", exact: true }).click();
  await point(page, 370, 610);
  await page.getByRole("button", { name: "Place here", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Riverside shop", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("footer")).toContainText("4 / 40");
  await page.getByRole("button", { name: "Peek at a composition" }).click();
  await expect(page.locator(".reference-badge")).toBeVisible();
  await page.getByRole("button", { name: "Return to my scene" }).click();
  await expect(page.locator("footer")).toContainText("4 / 40");
  await page
    .getByRole("button", { name: "Share your scene", exact: true })
    .click();
  await expect(page.locator(".share-preview")).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  expect(
    await page
      .locator(".share-preview")
      .evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight]),
  ).toEqual([1080, 1920]);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save image", exact: true }).click();
  const file = await downloaded;
  await file.saveAs(testInfo.outputPath("sharing-card.png"));
  await page.getByRole("button", { name: "Close / 关闭" }).click();
  await page
    .getByRole("button", { name: "Switch language / 切换语言" })
    .click();
  await expect(page.locator("h1")).toContainText("一桥烟火");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  }
  await page.screenshot({
    path: testInfo.outputPath("editor.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("invalid placement and corrupt saves are safe", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("qingming-scene-v1", "{broken"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Riverside shop", exact: true }),
  ).toBeEnabled();
  await expect(page.locator(".storage-warning")).toBeVisible();
  await page
    .getByRole("button", { name: "Riverside shop", exact: true })
    .click();
  await point(page, 400, 350);
  await expect(page.getByRole("status")).toContainText("Boats belong on water");
  expect(
    await page.evaluate(() => localStorage.getItem("qingming-scene-v1")),
  ).toBe("{broken");
  await point(page, 260, 610);
  await page.getByRole("button", { name: "Place here", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("qingming-scene-v1")),
  ).toBe("{broken");
  await page.getByRole("button", { name: "Back up & save new scene" }).click();
  await expect(page.locator(".storage-warning")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some(
        (k) =>
          k.startsWith("qingming-scene-v1-backup-") &&
          localStorage.getItem(k) === "{broken",
      ),
    ),
  ).toBe(true);
});
test("small viewport has no horizontal overflow and palette collapses", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Riverside shop", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Collapse elements" }).click();
  await expect(page.locator(".asset-cards")).toHaveCount(0);
  await page.getByRole("button", { name: "Expand elements" }).click();
  await expect(page.locator(".asset-cards")).toBeVisible();
  await page.getByRole("button", { name: "Pause life", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume life", exact: true }),
  ).toBeVisible();
});
