import sharp from "sharp";
import { test, expect } from "./isolated-io";
import { contrastRatio } from "./composited-contrast";

type FocusDiagnosticWindow = Window & { readPrimitiveMenuFocus?: () => unknown };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    function describe(target: EventTarget | null) {
      if (!(target instanceof Element)) return null;
      return {
        tag: target.localName,
        role: target.getAttribute("role"),
        slot: target.getAttribute("data-slot"),
        state: target.getAttribute("data-state"),
        text: target.matches('button, [role^="menuitem"]') ? target.textContent?.trim() : undefined,
      };
    }

    const events: object[] = [];
    for (const type of ["focusin", "focusout", "keydown", "pointerdown", "pointermove"]) {
      document.addEventListener(type, event => {
        events.push({
          type: event.type,
          time: event.timeStamp,
          target: describe(event.target),
          relatedTarget: event instanceof FocusEvent ? describe(event.relatedTarget) : undefined,
          key: event instanceof KeyboardEvent ? event.key : undefined,
          pointerType: event instanceof PointerEvent ? event.pointerType : undefined,
        });
      }, { capture: true });
    }
    (window as FocusDiagnosticWindow).readPrimitiveMenuFocus = () => ({
      activeElement: describe(document.activeElement),
      events,
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const diagnostics = await page.evaluate(() => (window as FocusDiagnosticWindow).readPrimitiveMenuFocus?.())
    .catch((error: unknown) => ({ collectionError: String(error) }));
  console.log("PRIMITIVE_MENU_FOCUS " + JSON.stringify({ test: testInfo.title, diagnostics }));
});

const modes = [
  { name: "default", contrast: "no-preference", forcedColors: "none" },
  { name: "higher contrast", contrast: "more", forcedColors: "none" },
  { name: "forced colors", contrast: "no-preference", forcedColors: "active" },
] as const;

for (const { name, contrast, forcedColors } of modes) {
  test("keyboard focus has a visible menu outline in " + name, async ({ page, io }) => {
    await page.emulateMedia({ contrast, forcedColors });
    await page.goto("/primitives");
    await expect(page.locator('[data-primitives-ready="true"]')).toBeAttached();
    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.focus();
    await trigger.press("Enter");
    const menu = page.getByRole("menu");
    const samples = [
      menu.getByRole("menuitem", { name: "First", exact: true }),
      menu.getByRole("menuitemradio", { name: "Selected option" }),
      menu.getByRole("menuitemcheckbox", { name: "Checked option" }),
    ];
    await expect(samples[1]!).toHaveAttribute("aria-checked", "true");
    await expect(samples[2]!).toHaveAttribute("aria-checked", "true");
    await expect(samples[1]!).toHaveCSS("outline-style", "none");

    for (const [index, item] of samples.entries()) {
      if (index === 1) {
        await page.keyboard.press("ArrowDown"); // Second
        await page.keyboard.press("ArrowDown"); // Selected option
      } else if (index === 2) {
        await page.keyboard.press("ArrowDown"); // Checked option
      }
      await expect(item).toBeFocused();
      const cascade = await item.evaluate(el => {
        const matches: { selector: string; layers: string[]; value: string; priority: string }[] = [];
        function walk(rules: CSSRuleList, layers: string[]) {
          for (const rule of rules) {
            if (rule instanceof CSSStyleRule) {
              try {
                if (el.matches(rule.selectorText) && rule.style.getPropertyValue("outline-offset"))
                  matches.push({ selector: rule.selectorText, layers, value: rule.style.getPropertyValue("outline-offset"), priority: rule.style.getPropertyPriority("outline-offset") });
              } catch { /* CSS nesting or unsupported selector */ }
            }
            if (rule instanceof CSSMediaRule && !matchMedia(rule.conditionText).matches) continue;
            if ("cssRules" in rule) {
              const nested = rule as CSSGroupingRule;
              const name = rule.constructor.name === "CSSLayerBlockRule" ? (rule as CSSLayerBlockRule).name : "";
              walk(nested.cssRules, name ? [...layers, name] : layers);
            }
          }
        }
        for (const sheet of document.styleSheets) {
          try { walk(sheet.cssRules, []); } catch { /* inaccessible stylesheet */ }
        }
        return { computed: getComputedStyle(el).outlineOffset, className: el.className, matches };
      });
      console.log("PRIMITIVE_MENU_CASCADE " + JSON.stringify({ mode: name, item: await item.textContent(), ...cascade }));
      await expect(item).toHaveCSS("outline-style", "solid");
      await expect(item).toHaveCSS("outline-width", "2px");
      await expect(item).toHaveCSS("outline-offset", "-2px");

      const edge = await item.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { x: Math.floor(rect.left + rect.width / 2), y: Math.ceil(rect.top) };
      });
      const { data, info } = await sharp(await page.screenshot({ animations: "disabled", scale: "css" }))
        .removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
      const pixel = (dy: number): [number, number, number] => {
        const i = ((edge.y + dy) * info.width + edge.x) * info.channels;
        return [data[i]!, data[i + 1]!, data[i + 2]!];
      };
      const adjacent = contrastRatio(pixel(0), pixel(-2)), fill = contrastRatio(pixel(0), pixel(3));
      console.log("PRIMITIVE_MENU_OUTLINE " + JSON.stringify({ mode: name, item: await item.textContent(), viewport: page.viewportSize(), edge, outline: pixel(0), adjacent: pixel(-2), fill: pixel(3), adjacentRatio: adjacent, fillRatio: fill }));
      expect(adjacent, "outline against adjacent menu").toBeGreaterThanOrEqual(3);
      expect(fill, "outline against focused fill").toBeGreaterThanOrEqual(3);
    }
    expect(io).toEqual([]);
  });
}
