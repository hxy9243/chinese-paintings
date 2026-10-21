import { test, expect } from "./fixtures";
test("palette choice updates actual scene materials, preserves geometry and survives reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?capture=1");
  await page.waitForFunction(() => Boolean((window as any).qingmingStudy), {
    timeout: 120000,
  });
  const frame = () =>
    page.evaluate(() =>
      (window as any).qingmingStudy.frame(8, { zoom: 2.5, angle: 30 }),
    );
  const original = await frame();
  const before = await page.locator(".study-stage").screenshot();
  await page
    .getByRole("combobox", { name: "Color palette", exact: true })
    .selectOption("indigo-amber");
  await expect(page.locator(".study-shell")).toHaveAttribute(
    "data-palette",
    "indigo-amber",
  );
  const indigo = await frame();
  expect(indigo.palette).toBe("indigo-amber");
  expect(indigo.triangles).toBe(original.triangles);
  expect((await page.locator(".study-stage").screenshot()).equals(before)).toBe(
    false,
  );
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).qingmingStudy), {
    timeout: 120000,
  });
  await expect(
    page.getByRole("combobox", { name: "Color palette", exact: true }),
  ).toHaveValue("indigo-amber");
  expect((await frame()).palette).toBe("indigo-amber");
  await page
    .getByRole("combobox", { name: "Color palette", exact: true })
    .selectOption("silk");
  await frame();
  await expect(page.locator(".study-shell")).toHaveAttribute(
    "data-palette",
    "silk",
  );
  expect((await page.locator(".study-stage").screenshot()).equals(before)).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});
