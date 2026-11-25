import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Production owns the font loader. Until it exists, log the real font without
// requiring the absent font or installing a fixture-only replacement.
const layoutSource = readFileSync(path.resolve("src/app/layout.tsx"), "utf8");
const productionFontLoader = /(?:from\s*|import\s*)[\x27\x22](?:next\/font\/[^\x27\x22]+|[^\x27\x22]*(?:fonts?|typography)(?:\/[^\x27\x22]+)?(?:\.[cm]?[jt]sx?)?)[\x27\x22]/i.test(layoutSource);


// Do not inject a stylesheet, force a font, or change geometry to make the
// fixture pass. Read the styles and actual platform glyph fonts Chromium used.
export async function inspectReviewFidelity(page: Page, state: string) {
  const data = await page.evaluate(({ state, productionFontLoader }) => {
    const fontName = (stack: string) => stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
    const root = document.documentElement, rootStyle = getComputedStyle(root);
    const tokens = Object.fromEntries([
      "--rl-canvas", "--rl-accent-primary", "--rl-on-accent", "--rl-surface-overlay",
      "--rl-surface-panel-layered", "--rl-material-panel", "--rl-type-family",
      "--rl-radius-control", "--rl-control-regular",
    ].map(name => [name, rootStyle.getPropertyValue(name).trim()]));
    const fail: string[] = [];
    for (const [name, value] of Object.entries(tokens)) if (!value) fail.push("Missing production token " + name);
    const font = rootStyle.fontFamily;
    const expectedFont = fontName(font);
    const semanticFont = fontName(tokens["--rl-type-family"]);
    if (productionFontLoader) {
      // next/font gives the CSS family a generated name while the font file
      // retains the family name Chromium reports for its rendered glyphs.
      const sharedFont = fontName(rootStyle.getPropertyValue("--font-sans"));
      if (!expectedFont || expectedFont !== sharedFont) fail.push("Root font stack does not use the shared font variable");
      if (![...document.fonts].some(face => fontName(face.family) === sharedFont && face.status === "loaded")) {
        fail.push("Shared font face is not loaded: " + sharedFont);
      }
    } else if (!expectedFont || !tokens["--rl-type-family"].includes(expectedFont)) {
      fail.push("Root font stack does not match semantic typography");
    }
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const header = document.querySelector(".preview-navigation-header");
    const workspace = document.querySelector(".create-preview-workspace");
    const grid = document.querySelector(".create-preview-grid");
    const documentSize = { width: root.scrollWidth, height: root.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight };
    const panels = [...document.querySelectorAll(".create-preview-controls, .create-preview-canvas, .create-preview-history")].map(el => {
      const bounds = box(el), style = getComputedStyle(el);
      const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return { selector: el.className, ...bounds, display: style.display, hit: !!hit && el.contains(hit) };
    });
    if (state === "create" && innerWidth === 1440) {
      if (!workspace || !grid || getComputedStyle(grid).display !== "grid") fail.push("Desktop Create workspace/grid missing");
      if (documentSize.height > innerHeight + 1) fail.push("Desktop Create exceeds viewport height: " + documentSize.height);
      if (!header || box(header).height > 100) fail.push("Desktop shell header absent or taller than 100px");
      if (panels.length !== 3 || panels.some(p => p.width < 100 || p.height < 100 || p.x < -1 || p.y < 0 || p.right > innerWidth + 1 || p.bottom > innerHeight + 1 || !p.hit)) fail.push("Desktop Create panel clipped, occluded or missing");
    }
    const filled = (s: CSSStyleDeclaration) => s.backgroundImage !== "none" || !["transparent", "rgba(0, 0, 0, 0)"].includes(s.backgroundColor);
    const glassSelector = state === "shell-open" ? ".preview-menu-glass" : state === "create" ? ".create-preview-controls" : state === "popover-open" ? '[data-slot="popover-content"]' : null;
    const material = glassSelector ? [...document.querySelectorAll(glassSelector)].filter(el => {
      const r = box(el); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest('[aria-hidden="true"]');
    }).map(el => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, image: s.backgroundImage, backdrop: s.backdropFilter, filled: filled(s) };
    }) : [];
    // The shell glass itself is aria-hidden decoration; inspect its open
    // parent disclosure rather than treating the decorative child as absent.
    if (state === "shell-open") {
      const open = document.querySelector('.preview-account-menu[aria-hidden="false"] .preview-menu-glass, .preview-section-panel[data-open="true"] .preview-menu-glass');
      if (open) {
        const s = getComputedStyle(open);
        material.push({ background: s.backgroundColor, image: s.backgroundImage, backdrop: s.backdropFilter, filled: filled(s) });
      }
    }
    if (glassSelector && (!material.length || material.every(m => !m.filled))) fail.push("Expected material absent or transparent: " + glassSelector);
    if ((state === "create" || state === "shell-open") && CSS.supports("backdrop-filter", "blur(1px)") && !material.some(m => m.filled && m.backdrop !== "none")) fail.push("Expected glass has no computed backdrop");
    const primary = [...document.querySelectorAll('button[data-variant="default"]')].find(el => el.textContent?.trim() === "Primary");
    const primaryStyle = primary ? getComputedStyle(primary) : null;
    const avatar = document.querySelector<HTMLImageElement>(".preview-navigation-avatar");
    const avatarStyle = avatar ? getComputedStyle(avatar) : null;
    const avatarBox = avatar ? box(avatar) : null;
    if (state === "primitives") {
      // A flex-item inline-flex wrapper is blockified to flex by CSS; both are real flex layout.
      if (!primaryStyle || !filled(primaryStyle) || !["inline-flex", "flex"].includes(primaryStyle.display) || parseFloat(primaryStyle.minHeight) < 32) fail.push("Primary button missing production utility fill or sizing");
      if (!avatar || !avatar.complete || !avatar.naturalWidth || !avatarStyle || avatarStyle.objectFit !== "cover" || !parseFloat(avatarStyle.borderRadius) || !avatarBox || avatarBox.width < 20 || avatarBox.height < 20) fail.push("Real shell avatar styling or image missing");
    }
    return { state, tokens, font, expectedFont, semanticFont, fontStatus: document.fonts.status, declaredFaces: [...document.fonts].map(face => ({ family: face.family, status: face.status })), documentSize, header: header ? box(header) : null, workspace: workspace ? box(workspace) : null, panels, material, primary: primaryStyle ? { background: primaryStyle.backgroundColor, image: primaryStyle.backgroundImage, minHeight: primaryStyle.minHeight, display: primaryStyle.display } : null, avatar: avatarBox, sheets: [...document.styleSheets].map(s => s.href), fail };
  }, { state, productionFontLoader });
  const session = await page.context().newCDPSession(page);
  let platformFonts: { familyName: string; isCustomFont: boolean; glyphCount: number }[] = [];
  try {
    await session.send("DOM.enable");
    await session.send("CSS.enable");
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId,
      selector: state === "library" ? "main h2" : state === "primitives" || state.startsWith("popover") ? "main h1" : ".create-preview-fields h2" });
    if (!nodeId) { if (productionFontLoader) data.fail.push("No real text node for font verification"); }
    else platformFonts = (await session.send("CSS.getPlatformFontsForNode", { nodeId })).fonts;
  } finally { await session.detach(); }
  const fontNote = productionFontLoader ? "Production layout declares a font loader; actual Inter glyphs required." : "INFORMATIONAL: production layout does not yet declare a font loader; observed platform fonts are recorded, not gated.";
  if (productionFontLoader) {
    const interGlyphs = platformFonts.filter(font =>
      font.glyphCount > 0 && font.isCustomFont && /^Inter(?: Variable)?$/i.test(font.familyName));
    if (data.fontStatus !== "loaded" || interGlyphs.length === 0) {
      data.fail.push("Expected actual Inter glyphs for " + data.expectedFont + "; observed " + platformFonts.map(f => f.familyName).join(", "));
    }
    if (!interGlyphs.some(font => font.familyName.toLowerCase() === data.semanticFont.toLowerCase())) {
      data.fail.push("Rendered font does not match semantic typography: " + data.semanticFont);
    }
  }
  return { ...data, platformFonts, productionFontLoader, fontNote };
}
