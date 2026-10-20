import { test, expect } from "@playwright/test";

test("the home page opens the 3D study and preserves existing local data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const saved = await page.evaluate(() => JSON.stringify(localStorage));
  await expect(
    page.getByRole("link", { name: "Back to the painting" }),
  ).toHaveCount(0);
  await expect(page.locator(".scene-canvas")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(
    page.getByRole("img", { name: "Rainbow Bridge constrained 3D study" }),
  ).toBeVisible();
  // Reduced-motion users can start and stop life without opening a menu.
  await expect(page.getByRole('button',{name:'Resume life',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Resume life',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pause life',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Pause life',exact:true}).click();
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "30",
  );
  await page.getByRole("button", { name: "Left −30°", exact: true }).click();
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "-30",
  );
  await page.getByRole("button", { name: "Right +30°", exact: true }).click();
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "30",
  );
  for (const [name, attribute] of [
    ["Tilt · X", "data-pitch"],
    ["Roll · Z", "data-roll"],
  ]) {
    const control = page.getByRole("slider", { name, exact: true });
    await control.focus();
    await control.press("End");
    await expect(page.locator(".study-stage")).toHaveAttribute(attribute, "30");
    await control.press("Home");
    await expect(page.locator(".study-stage")).toHaveAttribute(
      attribute,
      "-30",
    );
  }
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Right +30°", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".study-stage")).toHaveAttribute("data-pitch", "0");
  await expect(page.locator(".study-stage")).toHaveAttribute("data-roll", "0");
  const bounds = await page.locator(".study-canvas").boundingBox();
  if (bounds) {
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down({ button: "right" });
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 45,
      bounds.y + bounds.height / 2 + 25,
      { steps: 5 },
    );
    await page.mouse.up({ button: "right" });
  }
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "30",
  );
  await page
    .getByRole("button", { name: "Switch language / 切换语言" })
    .click();
  await expect(
    page.getByRole("button", { name: "画卷视角", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(saved);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/study-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("painting render supports bounded rotation and a plain-model comparison", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 30000 },
  );
  await expect(
    page.getByRole("button", { name: "Ink & wash", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("slider", { name: "Rotation angle" }),
  ).toHaveCount(0);
  const canvas = page.locator(".study-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Missing canvas");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y + 35, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "30",
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, y, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "-30",
  );
  const softness = page.getByRole("slider", { name: "Ink softness" });
  await expect(softness).toHaveValue("70");
  await softness.focus();
  await softness.press("End");
  await expect(softness).toHaveValue("100");
  await softness.press("Home");
  await expect(softness).toHaveValue("0");
  await softness.press("End");
  await page.getByRole("button", { name: "Plain model", exact: true }).click();
  await expect(softness).toBeDisabled();
  await expect(page.locator(".study-shell")).toHaveAttribute(
    "data-painting",
    "false",
  );
  await page.getByRole("button", { name: "Ink & wash", exact: true }).click();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-angle",
    "30",
  );
  await page.screenshot({
    path: `test-results/painting-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("selected passage focuses, overview, and supplied reference are reachable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/?view=3d");
  await expect(page.locator(".study-stage")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 45000 },
  );
  const explorer = page.getByRole("button", {
    name: "Explore the scroll",
    exact: true,
  });
  await expect(explorer).toHaveAttribute("aria-expanded", "false");
  await explorer.click();
  await expect(explorer).toHaveAttribute("aria-expanded", "true");
  for (const name of [
    "Bridge approach",
    "Far-bank shops",
    "River bend",
    "Whole passage",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("img", { name: "Rainbow Bridge constrained 3D study" }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: `test-results/passage-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Reference crop", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const img = dialog.getByRole("img");
  await expect(img).toBeVisible();
  await expect
    .poll(() =>
      img.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await page
    .getByRole("button", { name: "Original right", exact: true })
    .click();
  await expect
    .poll(() => page.locator(".original-strip").evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Bridge approach", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
