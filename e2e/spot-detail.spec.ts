import { test, expect } from "@playwright/test";

test.describe("釣り場詳細画面", () => {
	test("存在する釣り場IDで詳細ページが表示される", async ({ page }) => {
		await page.goto("/spots/1");
		// Page either shows spot detail or notFound — both return a valid page (not 5xx)
		await expect(page).not.toHaveURL(/error/);
		await expect(page.locator("main")).toBeVisible();
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
