import { test, expect } from "@playwright/test";

test.describe("設定画面", () => {
	test("設定ページが表示される", async ({ page }) => {
		await page.goto("/settings");
		await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
	});

	test("自宅位置の入力フィールドが存在する", async ({ page }) => {
		await page.goto("/settings");
		await expect(page.getByLabel("緯度")).toBeVisible();
		await expect(page.getByLabel("経度")).toBeVisible();
	});

	test("プッシュ通知トグルが存在する", async ({ page }) => {
		await page.goto("/settings");
		await expect(page.getByRole("switch")).toBeVisible();
	});
});
