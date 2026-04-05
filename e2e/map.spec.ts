import { test, expect } from "@playwright/test";

test.describe("マップ画面", () => {
	test("マップページが表示される", async ({ page }) => {
		await page.goto("/map");
		await expect(page.locator("main")).toBeVisible();
	});

	test("ボトムナビのマップリンクで遷移できる", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("link", { name: /マップ/ }).click();
		await expect(page).toHaveURL("/map");
	});
});
