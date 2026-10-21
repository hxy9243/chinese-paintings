import { test as base, expect } from "@playwright/test";

// Exercise the app without depending on Google's font CDN being reachable.
// Only its optional stylesheet is stubbed; app scripts, assets and shaders load
// normally, so their network or compilation failures still fail the tests.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("https://fonts.googleapis.com/**", route =>
      route.fulfill({ contentType: "text/css", body: "" }),
    );
    await use(page);
  },
});
export { expect };
