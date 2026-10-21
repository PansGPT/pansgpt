import { test, expect } from "@playwright/test";
for (const width of [375, 1440]) {
  for (const theme of ["Light", "OLED Dark", "Sepia"]) {
    test(`${width}px ${theme}: auth screens, validation and theme persistence`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await page.getByLabel("Appearance").selectOption({ label: theme });
      if (width === 375) {
        await expect(page.getByRole("region", { name: "Welcome to PansGPT" })).toBeVisible();
        await page.screenshot({
          path: `test-results/welcome-${width}-${theme.replaceAll(" ", "-")}.png`,
          fullPage: true,
          animations: "disabled",
        });
        await page.getByRole("button", { name: "Log in", exact: true }).click();
      } else {
        await expect(page.getByRole("complementary", { name: "About PansGPT" })).toBeVisible();
        expect(
          await page
            .locator(".auth-card")
            .evaluate((element) => getComputedStyle(element).borderRadius)
        ).toBe("0px");
        const hero = await page.getByRole("complementary", { name: "About PansGPT" }).boundingBox();
        const mark = await page.locator(".auth-story > .auth-brand-art").boundingBox();
        if (!hero || !mark) throw new Error("The desktop artwork is missing.");
        expect(mark.x + mark.width).toBeGreaterThan(hero.x + hero.width);
        expect(mark.y + mark.height).toBeGreaterThan(hero.y + hero.height);
        expect(
          await page
            .locator(".auth-story")
            .evaluate((element) => getComputedStyle(element, "::after").content)
        ).toBe("none");
        await page.getByRole("button", { name: "Pause animation", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Resume animation", exact: true })
        ).toHaveAttribute("aria-pressed", "true");
        await page.getByRole("button", { name: "Resume animation", exact: true }).click();
      }
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      const palette = await page.locator(".auth-card").evaluate((element) => {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable.");
        const pixel = (color: string): number[] => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          return Array.from(context.getImageData(0, 0, 1, 1).data);
        };
        const style = getComputedStyle(element);
        const token = pixel(style.getPropertyValue("--bg-primary"));
        let surface = element as Element | null;
        let actual: number[] = [];
        while (surface) {
          actual = pixel(getComputedStyle(surface).backgroundColor);
          if (actual[3] === 255) break;
          surface = surface.parentElement;
        }
        return { token, actual, font: style.fontFamily };
      });
      expect(palette.actual).toEqual(palette.token);
      expect(palette.font).toContain("Plus Jakarta Sans");
      if (theme === "OLED Dark") expect(palette.actual.slice(0, 3)).toEqual([0, 0, 0]);
      if (theme === "Light") expect(palette.actual.slice(0, 3)).toEqual([255, 255, 255]);
      if (theme === "Sepia") expect(palette.actual[0]!).toBeGreaterThan(palette.actual[2]!);
      const signIn = page.getByRole("button", { name: "Sign in", exact: true });
      expect(
        await signIn.evaluate((element) => {
          const style = getComputedStyle(element);
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas is unavailable.");
          const luminance = (color: string): number => {
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            const rgb = Array.from(context.getImageData(0, 0, 1, 1).data)
              .slice(0, 3)
              .map((value) => {
                const channel = value / 255;
                return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
              });
            return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
          };
          const text = luminance(style.color),
            background = luminance(style.backgroundColor);
          return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
        })
      ).toBeGreaterThanOrEqual(4.5);
      expect((await signIn.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      await page.screenshot({
        path: `test-results/login-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByLabel("Email address")).toBeFocused();
      await page.getByLabel(/^Password\s*\*?$/).fill("private-value");
      await page.getByRole("button", { name: "Show password", exact: true }).click();
      await expect(page.getByLabel(/^Password\s*\*?$/)).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Hide password", exact: true }).click();
      await expect(page.getByLabel(/^Password\s*\*?$/)).toHaveAttribute("type", "password");
      await page.getByRole("link", { name: "Create an account" }).click();
      await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
      await expect(page.getByLabel("Appearance")).toHaveValue(
        theme === "Light" ? "light" : theme === "Sepia" ? "sepia" : "dark"
      );
      await page.screenshot({
        path: `test-results/signup-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await page.getByLabel("Email address").fill("student@example.test");
      await page.getByLabel(/^Password\s*\*?$/).fill("short");
      await page.getByLabel(/^Confirm password\s*\*?$/).fill("different");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(page.getByText("Passwords must match.")).toBeVisible();
      await page.goto("/forgot-password?error=link_expired");
      await expect(page.getByRole("main").getByRole("alert")).toContainText("expired");
      await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/auth-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
        animations: "disabled",
      });
    });
  }
}
test("callback failures stay generic and unauthenticated recovery remains protected", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?next=/update-password&error_description=sensitive-internal-error"
  );
  await expect(page).toHaveURL(/\/forgot-password\?error=link_expired/);
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
    "sensitive-internal-error"
  );
  await page.goto("/update-password");
  await expect(page).toHaveURL(/\/forgot-password\?error=recovery_required/);
  await page.goto("/onboarding?invite=keep-me");
  await expect(page).toHaveURL(/\/login\?next=%2Fonboarding%3Finvite%3Dkeep-me/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/signup\?invite=keep-me/);
});
test("request failures are announced and entered email is preserved", async ({ page }) => {
  await page.route("**/auth/v1/recover*", (route) =>
    route.fulfill({
      status: 429,
      headers: { "x-supabase-api-version": "2024-01-01" },
      contentType: "application/json",
      body: JSON.stringify({ error_code: "over_email_send_rate_limit", msg: "internal detail" }),
    })
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("wait");
  await expect(page.getByLabel("Email address")).toHaveValue("student@example.test");
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled();
});

test("configured OAuth options preserve the desktop bridge and report handoff failure", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ external: { google: true, apple: false } }),
    })
  );
  await page.addInitScript(() => {
    window.pansgptBridge = {
      auth: {
        getSession: async () => null,
        beginOAuth: async () => {
          throw new Error("Synthetic native handoff failure");
        },
        signOut: async () => undefined,
        onOAuthSuccess: () => () => undefined,
      },
    };
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("sign-in option");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});

test("keyboard users can skip to and submit the form", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to form" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email address")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
});

test("mobile welcome opens a sheet, preserves input on cancel and respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).not.toBeVisible();
  expect(
    await page
      .locator(".auth-mobile-art .auth-art-glow")
      .evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).animationName === "none")
      )
  ).toBe(true);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  expect(
    await page.getByRole("main").evaluate((element) => getComputedStyle(element).position)
  ).toBe("fixed");
  await page.getByLabel("Email address").fill("draft@example.test");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByLabel("Email address")).toHaveValue("draft@example.test");
  await page.setViewportSize({ width: 375, height: 500 });
  await page.getByRole("button", { name: "Sign in", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeInViewport();
  await page.goto("/signup");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
});
