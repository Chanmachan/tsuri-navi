import { test, expect } from "@playwright/test";

test.describe("ホーム画面", () => {
	test("ページタイトルと釣り場一覧が表示される", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/釣りナビ/);
		await expect(page.getByRole("heading", { name: "釣りナビ" })).toBeVisible();
	});

	test("ボトムナビが表示される", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("link", { name: /ホーム/ })).toBeVisible();
		await expect(page.getByRole("link", { name: /マップ/ })).toBeVisible();
		await expect(page.getByRole("link", { name: /設定/ })).toBeVisible();
	});

	test("釣り場一覧セクションが存在する", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByRole("heading", { name: "釣り場一覧" })).toBeVisible();
	});
});
