import { test, expect } from "@playwright/test";

test.describe("釣り場詳細画面", () => {
	test("存在する釣り場IDで詳細ページが表示される", async ({ page }) => {
		const response = await page.goto("/spots/1");
		expect(response?.status()).toBe(200);
		// Verify a spot-detail-specific element is present (not a generic notFound page)
		await expect(page.locator("main h1")).toBeVisible();
	});

	test("存在しないIDは404になる", async ({ page }) => {
		const response = await page.goto("/spots/99999");
		expect(response?.status()).toBe(404);
	});

	test("不正なIDは404になる", async ({ page }) => {
		const response = await page.goto("/spots/abc");
		expect(response?.status()).toBe(404);
	});
});
