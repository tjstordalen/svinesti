# CSS Refactoring Analysis: styles.css

This document contains six sections:

**Analysis:**
- **Part 1: Line Reduction** — Identify duplication and consolidation opportunities to reduce total CSS lines
- **Part 2: File Organization** — Split into multiple files for human navigability and discoverability
- **Part 3: Specificity Hygiene** — Ensure predictable cascade, identify selectors causing override headaches
- **Part 4: CSS-JS Coupling** — Find where JS refactoring could eliminate CSS duplication
- **Part 5: Dead Code & HTML Audit** — Find unused CSS selectors, orphaned elements, and redundant wrappers

**Execution:**
- **Part 6: Execution Plan** — Step-by-step implementation guide with verification methods

---

# Part 1: Line Reduction

**Goal:** Reduce line count by eliminating duplication, consolidating similar patterns, and using modern CSS features like `:is()`. Target: 17-25% reduction without sacrificing clarity.

---

## Summary of Current State

**Total Lines:** 1491
**Major Sections:**
1. CSS Variables & Reset (1-52)
2. Splash Screen (54-135)
3. Header & Mode Toggle (137-216)
4. Sidebar & Level List (226-439)
5. Confetti & Delete Confirm (441-521)
6. Main Content & Panes (523-573)
7. Code Section & Editor (575-825)
8. Game Section & Grid (827-958)
9. Tiles & Pig Sprites (959-1053)
10. Color Comparison HUD (1055-1102)
11. Scrollbar & Responsive (1104-1134)
12. Help Modal (1136-1429)
13. Mini Grid (1431-1491)

---

## Issues Found

### 1. Button Pattern Duplication (~120 lines wasted)

**Near-identical "ghost button" patterns:**

| Class | Lines | Pattern |
|-------|-------|---------|
| `.mode-btn` | 173-193 | transparent bg, no border, muted color, :hover/:active states |
| `.lang-btn` | 609-629 | same |
| `.sidebar-tab` | 269-290 | same |
| `.trash-toggle-btn` | 341-367 | same |
| `.level-trash-btn` | 369-390 | same |
| `.level-share-btn` | 397-418 | same |
| `.icon-btn` | 195-216 | same core |

All share:
```css
background: transparent;
border: none;
cursor: pointer;
transition: all var(--transition-fast);
```

### 2. Pig Sprite Duplication (~45 lines wasted)

**Same pattern repeated 3 times:**

| Context | Lines | Properties |
|---------|-------|------------|
| `.tile.pig-*` | 995-1007 | background-size/repeat/position + 4 direction URLs |
| `.ghost.pig-*` | 1030-1039 | same |
| `.mini-tile.pig-*::after` | 1471-1490 | same (uses ::after) |

### 3. Tile Color Duplication (~20 lines wasted)

**Colors defined twice:**
- `.tile.red/green/blue` at lines 968-978
- `.mini-tile.red/green/blue` at lines 1450-1452

### 4. Target Icon Duplication (~20 lines wasted)

**Nearly identical `::before` pseudo-elements:**
- `.tile.target::before` at lines 980-992
- `.mini-tile.target::before` at lines 1458-1469

### 5. Flex Centering Repeated (~30 lines wasted)

Pattern `display: flex; align-items: center; justify-content: center;` appears at:
- Lines 65-68 (splash-screen)
- Lines 202-204 (icon-btn)
- Lines 348-351 (trash-toggle-btn)
- Lines 377-380 (level-trash-btn)
- Lines 404-407 (level-share-btn)
- Lines 723-726 (btn)
- Lines 833-836 (game-section)
- Lines 904-906 (grid-container)
- Lines 1146-1149 (help-modal)
- Lines 1187-1190 (help-close)

### 6. Magic Colors Not in Variables

| Color | Usage | Lines |
|-------|-------|-------|
| `#d9534f` | Danger red | 360, 388, 505 |
| `#c9302c` | Danger red hover | 365, 516, 520 |
| `rgba(255,255,255,0.15)` | Header button bg | 167, 196 |
| `rgba(255,255,255,0.25)` | Header button hover | 211 |
| `rgba(255,255,255,0.35)` | Header button active | 215 |
| `#6a737d` | Code comment | 1296 |
| `#d73a49` | Code keyword | 1300 |
| `#005cc5` | Code number | 1305 |

### 7. Monospace Font Repeated

Three different declarations:
- Line 677: `'SF Mono', 'Consolas', 'Monaco', monospace`
- Line 809: `'SF Mono', 'Consolas', 'Monaco', monospace`
- Line 1096: `'SF Mono', 'Consolas', monospace` (inconsistent)
- Line 1265: `monospace`
- Line 1282: `'Courier New', monospace` (different again)

### 8. Padding Shorthand Issue

**Line 496-497:**
```css
padding: 16px;
padding-top: 24px;  /* Override on next line */
```
Should be: `padding: 24px 16px 16px;`

### 9. Scattered Media Queries

Two `@media (max-width: 900px)` blocks:
- Lines 1129-1134
- Lines 1418-1429

### 10. Text Truncation Pattern

**Lines 335-337:**
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```
Could be utility class `.truncate`.

### 11. Potentially Unused Styles

Need HTML/JS verification:
- `.level-item-marked` (392-395) — may be dynamically applied
- `.help-column .comment/.keyword/.number` (1295-1306) — only used if help modal has syntax highlighting

---

## Proposed Refactoring Plan

### Phase 1: Variables & Utilities (Impact: ~50 lines saved)

**Add to `:root`:**
```css
/* Danger colors */
--color-danger: #d9534f;
--color-danger-dark: #c9302c;

/* Translucent whites (header buttons) */
--white-15: rgba(255,255,255,0.15);
--white-25: rgba(255,255,255,0.25);
--white-35: rgba(255,255,255,0.35);

/* Monospace font stack */
--font-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;
```

**Replace all instances** of magic colors with variables.

**HTML/JS changes:** None.

---

### Phase 2: Unified Button System (Impact: ~80 lines saved)

**Create base classes:**

```css
/* Base for all transparent icon/action buttons */
.btn-icon-base {
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
}

/* Tab-style toggle buttons (mode, language, sidebar tabs) */
.btn-tab {
    padding: 6px 14px;
    font-weight: 500;
    color: var(--color-text-muted);
}
.btn-tab:hover { color: var(--color-text); background: var(--color-bg); }
.btn-tab.active { background: var(--color-interactive); color: white; }
```

**Remove** duplicate rules from `.mode-btn`, `.lang-btn`, `.sidebar-tab`, `.icon-btn`, `.trash-toggle-btn`, `.level-trash-btn`, `.level-share-btn`.

**HTML changes:** Add `.btn-icon-base` or `.btn-tab` to relevant elements.

---

### Phase 3: Consolidate Tile/Mini-Tile Colors (Impact: ~25 lines saved)

**Replace:**
```css
.tile.red { background-color: var(--tile-red); }
.tile.green { background-color: var(--tile-green); }
.tile.blue { background-color: var(--tile-blue); }
/* ... */
.mini-tile.red { background-color: var(--tile-red); }
.mini-tile.green { background-color: var(--tile-green); }
.mini-tile.blue { background-color: var(--tile-blue); }
```

**With:**
```css
:is(.tile, .mini-tile).red { background-color: var(--tile-red); }
:is(.tile, .mini-tile).green { background-color: var(--tile-green); }
:is(.tile, .mini-tile).blue { background-color: var(--tile-blue); }
```

**HTML/JS changes:** None.

---

### Phase 4: Pig Sprite Consolidation (Impact: ~35 lines saved)

**Approach A — CSS custom property for direction:**

```css
/* Base pig sprite styling */
.pig-sprite {
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: center;
    background-image: var(--pig-img);
}

/* Direction URLs as variables */
:root {
    --pig-right: url('pigs/right-1.png');
    --pig-down: url('pigs/down-1.png');
    --pig-left: url('pigs/left-1.png');
    --pig-up: url('pigs/up-1.png');
}
```

**JS changes:** Instead of adding `.pig-right`, set `style.setProperty('--pig-img', 'var(--pig-right)')`. More invasive change.

**Approach B — Keep direction classes, use :is():**

```css
:is(.tile, .ghost).pig-right { background-image: url('pigs/right-1.png'); }
:is(.tile, .ghost).pig-down { background-image: url('pigs/down-1.png'); }
/* etc. */
```

Less invasive, still saves ~20 lines.

---

### Phase 5: Target Icon Consolidation (Impact: ~15 lines saved)

**Replace two `::before` blocks with:**
```css
:is(.tile, .mini-tile).target::before {
    content: "";
    position: absolute;
    top: 30%;
    left: 30%;
    width: 40%;
    height: 40%;
    background: url("img/golden-apple.png") center/contain no-repeat;
}

.tile.target::before {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}
```

**HTML/JS changes:** None.

---

### Phase 6: Flex Center Utility (Impact: ~20 lines saved)

**Add utility:**
```css
.flex-center {
    display: flex;
    align-items: center;
    justify-content: center;
}
```

**HTML changes:** Add `.flex-center` to splash-screen, icon-btn, help-modal, etc. OR keep in CSS but use `@extend`-like pattern if using a preprocessor.

Since this is vanilla CSS, recommend **keeping flex rules inline** but standardizing the property order. The utility class approach requires HTML changes across multiple files.

---

### Phase 7: Consolidate Media Queries (Impact: ~8 lines saved)

**Merge both `@media (max-width: 900px)` blocks** into one at the end of the file.

**HTML/JS changes:** None.

---

### Phase 8: Fix Minor Issues

1. **Line 496-497:** Change `padding: 16px; padding-top: 24px;` → `padding: 24px 16px 16px;`
2. **Line 520:** `.delete-confirm-btn:hover` duplicates button hover — remove if unintentional.
3. **Inconsistent monospace fonts:** Standardize on `var(--font-mono)`.

---

## Estimated Impact

| Phase | Lines Saved | JS/HTML Changes |
|-------|-------------|-----------------|
| 1. Variables | ~50 | None |
| 2. Button system | ~80 | Add classes to buttons |
| 3. Tile colors | ~25 | None |
| 4. Pig sprites | ~25-35 | Minor (Approach B) |
| 5. Target icon | ~15 | None |
| 6. Flex center | ~20 (if utility used) | HTML class additions |
| 7. Media queries | ~8 | None |
| 8. Minor fixes | ~5 | None |

**Total potential reduction:** ~230-250 lines
**New estimated LOC:** ~1240-1260 (17% reduction)

For 30-50% reduction, you'd need to:
- Remove help modal styles if unused or move to separate file (~280 lines)
- Remove splash screen if unused (~80 lines)
- Aggressively use utility classes and change HTML

---

# Part 2: File Organization

**Goal:** Split `styles.css` into multiple files for human navigability. A developer should be able to guess which file contains a given style without searching. Line count may increase slightly if it improves clarity (e.g., file headers, separating tightly-coupled rules for context).

---

## Organizing Principle

**Hybrid approach:** A foundational `base.css` for shared infrastructure (variables, reset, scrollbar), then **region-based files** that map to visible UI areas. A developer thinking "I need to change the sidebar" opens `sidebar.css`. A developer thinking "I need a new CSS variable" opens `base.css`.

Why region-based over component-based:
- This app has distinct visual regions (header, sidebar, game board, code editor)
- Each region has specialized components that don't appear elsewhere (tiles only in game, CodeMirror only in editor)
- Reduces ambiguity: "Where are button styles?" → In the file for the region that contains that button

---

## Proposed File Tree

```
css/
├── base.css           # Variables, reset, scrollbar - load first
├── layout.css         # App shell structure, main content areas
├── header.css         # Top bar, mode toggle, help button
├── sidebar.css        # Level list, tabs, thumbnails, delete flow
├── game.css           # Grid, tiles, pig, HUD, confetti, editor-mode
├── code-editor.css    # Code input, language tabs, playback controls, output
├── help-modal.css     # Help overlay, content columns, shortcuts
└── splash.css         # Loading screen, walking pig animation
```

**Load order in `index.html`:**
```html
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/header.css">
<link rel="stylesheet" href="css/sidebar.css">
<link rel="stylesheet" href="css/game.css">
<link rel="stylesheet" href="css/code-editor.css">
<link rel="stylesheet" href="css/help-modal.css">
<link rel="stylesheet" href="css/splash.css">
```

---

## Migration Table

| New File | Current Lines | What Moves |
|----------|---------------|------------|
| `base.css` | 1-52, 1107-1124 | `:root` variables, `*` reset, `body` base, scrollbar styling |
| `layout.css` | 218-224, 526-556, 1129-1134 | `#app-container`, `#main-content`, `#play-pane`, `#editor-pane:not([hidden])`, `#editor-share`, `#editor-grid`, responsive media query |
| `header.css` | 140-216 | `.app-header`, `.app-title`, `.header-spacer`, `.mode-toggle`, `.mode-btn`, `.icon-btn` |
| `sidebar.css` | 229-439, 491-521, 1431-1491 | `.sidebar`, `.sidebar-header`, `.sidebar-tabs`, `.sidebar-tab`, `.sidebar-level-list`, `.sidebar-level-item`, trash/share buttons, `.copied-toast`, `.delete-confirm-btn`, `.mini-grid`, `.mini-tile` |
| `game.css` | 444-489, 829-958, 960-1053, 1058-1102 | `#confetti-container`, `.confetti`, `#game-section`, `.editor-toolbar`, `.level-name-input`, `.editor-help-text`, `#grid-container`, `body.editor-mode` rules, `#grid-wrapper`, `#grid`, `.tile`, `.ghost`, `#agent`, `#color-comparison-hud` |
| `code-editor.css` | 578-825 | `#code-section`, `.editor-header`, `.language-tabs`, `.lang-btn`, `.font-size-control`, `.editor-wrapper`, `.editor-notification`, CodeMirror overrides, `.playback-toolbar`, `.button-group`, `.btn`, `.speed-control`, `#code-output` |
| `help-modal.css` | 1139-1429 | `.help-modal`, `.help-overlay`, `.help-card`, `.help-close`, `.help-content`, `.help-column`, `.help-licenses`, `.shortcuts-*`, `.toggle-switch`, `@keyframes fadeIn/slideUp`, help responsive query |
| `splash.css` | 57-135 | `#splash-screen`, `.splash-pig-container`, `.splash-screen-pig`, `.splash-pig-shadow`, `@keyframes splash-walk/splash-shadow` |

---

## File Summary Table

| File | Responsibility | Est. Lines | When to edit |
|------|----------------|------------|--------------|
| `base.css` | Design tokens, browser normalization | ~75 | Changing colors, spacing scale, fonts, scrollbar |
| `layout.css` | App shell grid/flex structure | ~70 | Changing how regions are arranged, responsive breakpoints |
| `header.css` | Top navigation bar | ~80 | Header styling, mode toggle appearance, help button |
| `sidebar.css` | Level browser, tabs, thumbnails | ~310 | Level list, tabs, delete flow, thumbnail grid |
| `game.css` | Game board and all game visuals | ~330 | Tiles, pig sprite, grid sizing, win/lose effects, editor mode |
| `code-editor.css` | Code input area and controls | ~250 | CodeMirror theming, playback buttons, output panel |
| `help-modal.css` | Help overlay | ~295 | Help content layout, shortcut display, modal animation |
| `splash.css` | Loading screen | ~80 | Splash appearance, loading animation |

**Total: ~1490 lines** (essentially unchanged, slight increase from file headers)

---

## Why Not Fewer Files?

Considered collapsing to 4-5 files:
- `base.css` + `layout.css` → combined "foundation"
- `sidebar.css` + `header.css` → combined "chrome"
- `game.css` + `code-editor.css` → combined "main-content"

**Rejected because:** The sidebar (310 lines) and code editor (250 lines) are large enough that combining them hurts discoverability. A developer looking for "playback button styles" shouldn't have to scan through level list code.

---

## Why Not More Files?

Considered splitting further:
- `tiles.css` separate from `game.css`
- `buttons.css` as a shared component file
- `animations.css` for all keyframes

**Rejected because:**
- Tiles are only used in the game context—no benefit to separating
- Buttons are styled differently per region (header buttons vs playback buttons)—a shared `buttons.css` would require scanning to find the right variant
- Keyframes are tightly coupled to their components (splash-walk belongs with splash, confetti-fall belongs with game)

---

## Suggested File Headers

Each file should open with a comment block for orientation:

```css
/* ============================================
   game.css — Game board, tiles, pig, animations

   Includes:
   - #game-section container
   - #grid and .tile styling
   - #agent (pig) and direction sprites
   - Confetti win animation
   - Color comparison HUD
   - Editor mode overrides
   ============================================ */
```

This adds ~10 lines per file (~80 total) but significantly aids navigation.

---

# Part 3: Specificity Hygiene

**Goal:** Ensure a predictable cascade where styles don't fight each other. Identify selectors that will cause override headaches as the codebase grows, and flag patterns that require escalating specificity to override.

---

## 1. ID Selectors Audit

**Total ID-based selectors: 28**

| Selector | Line | Could Be Class? | Overridden Elsewhere? |
|----------|------|-----------------|----------------------|
| `#splash-screen` | 57 | Yes | Yes (`.fade-out` modifier) |
| `#splash-screen.fade-out` | 74 | Yes | No |
| `#splash-screen h1` | 79 | Yes | No |
| `#app-container` | 221 | Yes | No |
| `#confetti-container` | 444 | Yes | No |
| `#main-content` | 526 | Yes | No |
| `#play-pane` | 535 | Yes | Yes (`[hidden]` modifier) |
| `#play-pane[hidden]` | 542 | Yes | No |
| `#editor-pane:not([hidden])` | 546 | Yes | No |
| `#editor-share` | 558 | Yes | No |
| `#editor-grid` | 564 | Yes | No |
| `#code-section` | 578 | Yes | Yes (`body.editor-mode` override) |
| `#code-input` | 675 | Yes | No |
| `#code-output` | 806 | Yes | Yes (`:empty` modifier) |
| `#code-output:empty::before` | 820 | Yes | No |
| `#game-section` | 829 | Yes | Yes (`body.editor-mode` override) |
| `#grid-container` | 902 | Yes | No |
| `#grid-wrapper` | 942 | Yes | No |
| `#grid` | 949 | Yes | No |
| `#agent` | 1042 | Yes | Yes (`body.editor-mode`, `.near-right-edge`) |
| `#color-comparison-hud` | 1058 | Yes | Yes (nested in `#agent.near-right-edge`) |
| `#comparison-tile` | 1087 | Yes | No |
| `#comparison-question` | 1094 | Yes | No |
| `#comparison-answer` | 1094 | Yes | No |

**Verdict:** All IDs could be classes. IDs are used here as "unique element" markers, not for specificity reasons. However, they create specificity debt—any future override requires matching or exceeding the ID specificity.

---

## 2. Highest Specificity Selectors

Scored as (IDs, Classes/Attributes/Pseudo-classes, Elements/Pseudo-elements):

| Rank | Selector | Line | Score | Concern Level |
|------|----------|------|-------|---------------|
| 1 | `#agent.near-right-edge #color-comparison-hud` | 1080 | (2,1,0) | **High** — Two IDs |
| 2 | `body.editor-mode #agent:active` | 937 | (1,2,1) | Medium |
| 3 | `body.editor-mode #code-section` | 913 | (1,1,1) | Medium |
| 4 | `body.editor-mode #game-section` | 918 | (1,1,1) | Medium |
| 5 | `body.editor-mode #agent` | 933 | (1,1,1) | Medium |
| 6 | `body.editor-mode .tile:hover` | 928 | (0,3,1) | Low |
| 7 | `body.editor-mode .tile` | 923 | (0,2,1) | Low |
| 8 | `#splash-screen.fade-out` | 74 | (1,1,0) | Low |
| 9 | `#code-output:empty::before` | 820 | (1,1,1) | Low |
| 10 | `#editor-pane:not([hidden])` | 546 | (1,1,0) | Low |

**Worst offender:** `#agent.near-right-edge #color-comparison-hud` at (2,1,0). To override any property on this element, you'd need two IDs or `!important`.

---

## 3. Deep Nesting Analysis

**No selectors with 4+ levels found.** Deepest nesting:

| Selector | Line | Levels | Acceptable? |
|----------|------|--------|-------------|
| `.toggle-switch input:checked + .toggle-slider:before` | 1376 | 3 | Yes — toggle switch pattern |
| `.sidebar-level-item.selected .sidebar-level-name` | 325 | 2 | Yes |
| `#agent.near-right-edge #color-comparison-hud` | 1080 | 2 | Concerning (IDs, not depth) |
| `.help-column ul li` | 1239 | 3 | Yes — scoped to help modal |

**Verdict:** Nesting depth is not a problem in this codebase.

---

## 4. `!important` Usage

| Line | Selector | Property | Classification |
|------|----------|----------|----------------|
| 676 | `#code-input, .CodeMirror` | `height: 100% !important` | **Necessary** — CodeMirror override |
| 680 | `#code-input, .CodeMirror` | `border: none !important` | **Necessary** — CodeMirror override |
| 693 | `.highlighted-line` | `background: ... !important` | **Necessary** — CodeMirror override |

**Verdict:** All 3 uses are for overriding CodeMirror's injected styles. This is the correct use of `!important`. No abuse detected.

---

## 5. Override Chains

Checked for properties set multiple times on the same conceptual element:

| Element | Chain | Verdict |
|---------|-------|---------|
| `.btn` → `.btn-primary` → `.btn-primary:hover:not(:disabled)` | `background` set 3 times | **OK** — standard modifier pattern |
| `.mode-btn` → `.mode-btn:hover` → `.mode-btn.active` | `background`, `color` | **OK** — state modifiers |
| `.sidebar-tab` → `.sidebar-tab:hover` → `.sidebar-tab.active` | Same pattern | **OK** |
| `#agent` → `body.editor-mode #agent` → `body.editor-mode #agent:active` | `cursor` | **OK** — but uses body-level class |

**No problematic override chains found.** The codebase follows a consistent base → modifier → state pattern.

---

## 6. Selector Type Distribution

| Type | Count | Percentage |
|------|-------|------------|
| Class-based (`.thing`) | ~105 | 65% |
| ID-based (`#thing`) | ~28 | 17% |
| Element-based (`div`, `h1`, etc.) | ~15 | 9% |
| Attribute-based (`[type="range"]`) | ~5 | 3% |
| Pseudo-element (`::before`, `::after`) | ~8 | 5% |
| Combinators (descendant, sibling) | ~25 | — |

**Verdict:** 17% ID usage is higher than ideal. Best practice targets <5% IDs.

---

## Specificity Smells

Patterns that will cause maintenance pain:

### 1. **Body-scoped mode switching** (Lines 913-939)
```css
body.editor-mode #code-section { display: none; }
body.editor-mode #game-section { flex: 1; }
body.editor-mode #agent { cursor: grab; }
```
**Problem:** Requires `body.editor-mode` prefix + ID to override. Future editor-mode styles must match this specificity.

**Alternative:** Use a data attribute on a closer ancestor, or toggle classes directly on affected elements.

### 2. **Nested ID selector** (Line 1080)
```css
#agent.near-right-edge #color-comparison-hud { ... }
```
**Problem:** (2,1,0) specificity. Nearly impossible to override without `!important`.

**Alternative:** Move `.near-right-edge` to the HUD itself:
```css
#color-comparison-hud.near-right-edge { ... }
/* or better: */
.color-comparison-hud.flipped { ... }
```

### 3. **ID + pseudo-class combinations**
```css
#code-output:empty::before { ... }
#editor-pane:not([hidden]) { ... }
```
**Problem:** Mixes ID specificity with pseudo-classes, making the effective specificity higher than it appears.

**Alternative:** Use classes: `.code-output:empty::before`

### 4. **Implicit coupling between JS and CSS IDs**
Every `#id` selector creates a tight coupling with HTML. If JS uses `getElementById()` and CSS uses `#id`, renaming requires changes in 3 places (HTML, JS, CSS).

**Alternative:** Use `data-*` attributes for JS hooks, classes for styling.

---

## Recommendations

### High Priority (do first)

| Change | Impact | HTML/JS Changes |
|--------|--------|-----------------|
| Convert `#agent` to `.agent` | Reduces specificity of 5 selectors | Change `id="agent"` to `class="agent"`, update JS `getElementById` → `querySelector` |
| Convert `#color-comparison-hud` to `.color-hud` | Fixes worst offender (2,1,0) | Same pattern |
| Refactor `.near-right-edge` to be on HUD, not agent | Eliminates nested ID pattern | JS change: add class to HUD instead of agent |

### Medium Priority

| Change | Impact | HTML/JS Changes |
|--------|--------|-----------------|
| Convert layout IDs to classes (`#main-content`, `#code-section`, etc.) | Flattens specificity | Minor JS updates if using getElementById |
| Replace `body.editor-mode` with `.editor-mode` on `#app-container` | Closer scoping, lower specificity | Move class toggle from body to container |

### Low Priority (nice to have)

| Change | Impact | HTML/JS Changes |
|--------|--------|-----------------|
| Convert remaining IDs (`#splash-screen`, `#grid`, etc.) | Consistency | Moderate JS updates |
| Use `data-state` attributes instead of classes for states | Separates styling from behavior | JS change to use dataset |

---

## Summary

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| `!important` count | 3 | <5 (for third-party overrides) | ✅ Good |
| Max specificity score | (2,1,0) | (1,2,0) or lower | ⚠️ Needs fix |
| ID selector percentage | 17% | <5% | ⚠️ High |
| Deep nesting (4+ levels) | 0 | 0 | ✅ Good |
| Override chains | None problematic | — | ✅ Good |

**Overall:** The codebase has good practices (no `!important` abuse, no deep nesting, clean override patterns) but over-relies on ID selectors. The main fix is converting IDs to classes and refactoring the nested `#agent ... #color-comparison-hud` pattern.

---

# Part 4: CSS-JS Coupling Analysis

**Goal:** Identify cases where refactoring JavaScript (or HTML structure) could eliminate CSS duplication or reduce CSS complexity. Find "parallel class hierarchies" where JS creates similar DOM structures with different class prefixes that have near-identical CSS rules.

---

## Pattern 1: Parallel Grid Tile Classes (~60 lines)

**The Problem:**

JavaScript creates grid tiles in three places with two different class names:

| Location | Function | Element Class | CSS Lines |
|----------|----------|---------------|-----------|
| `main.js:154-165` | `renderGrid()` | `.tile` | 960-992 (32 lines) |
| `main.js:412-426` | `renderMiniGrid()` | `.mini-tile` | 1444-1469 (25 lines) |
| `editor.js:105-121` | `load()` | `.tile` | (shares with main) |

**CSS Duplication:**

```css
/* Lines 968-978: Tile colors */
.tile.red { background-color: var(--tile-red); }
.tile.green { background-color: var(--tile-green); }
.tile.blue { background-color: var(--tile-blue); }

/* Lines 1450-1452: Mini-tile colors (duplicate) */
.mini-tile.red { background-color: var(--tile-red); }
.mini-tile.green { background-color: var(--tile-green); }
.mini-tile.blue { background-color: var(--tile-blue); }
```

```css
/* Lines 980-992: Tile target icon */
.tile.target::before { /* 12 lines */ }

/* Lines 1454-1469: Mini-tile target icon (near-duplicate) */
.mini-tile.target::before { /* 15 lines */ }
```

**Current JS:**

```javascript
// main.js:419 — renderMiniGrid
tile.className = 'mini-tile ' + TILE_CLASSES[ch];

// main.js:162 — renderGrid
tile.className = 'tile ' + TILE_CLASSES[char];
```

**Proposed JS Change (Trivial):**

```javascript
// main.js:419 — Use .tile everywhere, scope via container
tile.className = 'tile ' + TILE_CLASSES[ch];
```

**Proposed CSS After:**

```css
/* Base tile (all contexts) */
.tile { /* shared base rules */ }
.tile.red { background-color: var(--tile-red); }
.tile.green { background-color: var(--tile-green); }
.tile.blue { background-color: var(--tile-blue); }
.tile.target::before { /* target icon */ }

/* Mini-grid scoped overrides (only differences) */
.mini-grid .tile {
    min-width: 0;
    min-height: 0;
}
```

| Pattern | Files | Current CSS | Estimated Reduction | JS Complexity | Description |
|---------|-------|-------------|---------------------|---------------|-------------|
| Unified `.tile` class | main.js, styles.css | 57 lines | ~40 lines | Trivial | Change `'mini-tile'` to `'tile'`, use container scoping |

---

## Pattern 2: Pig Sprite Duplication (~55 lines)

**The Problem:**

Pig sprites are rendered four different ways with duplicated CSS:

| Context | How Pig is Rendered | CSS Lines |
|---------|---------------------|-----------|
| Main game | `#agent` element with `background-image` | 1042-1053 (11 lines) |
| Editor tiles | `.tile.pig-*` with `background-image` | 994-1007 (13 lines) |
| Mini-grid | `.mini-tile.pig-*::after` pseudo-element | 1471-1490 (19 lines) |
| Drag ghost | `.ghost.pig-*` with `background-image` | 1030-1039 (9 lines) |

**Duplicated Properties:**

All four contexts repeat:
```css
background-size: 90%;
background-repeat: no-repeat;
background-position: center;
background-image: url('pigs/right-1.png'); /* × 4 directions */
```

**Current JS (editor.js:167):**

```javascript
ui.ghost.className = pigClass ? 'ghost ' + pigClass : 'ghost ' + state.drag.source?.className;
```

**Proposed Approach A: CSS Custom Properties (Minor JS change)**

Define pig URLs as CSS variables, use a shared `.pig-sprite` class:

```css
:root {
    --pig-right: url('pigs/right-1.png');
    --pig-down: url('pigs/down-1.png');
    --pig-left: url('pigs/left-1.png');
    --pig-up: url('pigs/up-1.png');
}

.pig-sprite {
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: center;
}

.pig-right { --pig-img: var(--pig-right); }
.pig-down { --pig-img: var(--pig-down); }
.pig-left { --pig-img: var(--pig-left); }
.pig-up { --pig-img: var(--pig-up); }

.pig-sprite { background-image: var(--pig-img); }
```

**JS changes:** Add `.pig-sprite` class to `#agent`, ghost, and tiles with pig classes.

**Proposed Approach B: Use `:is()` (No JS change)**

```css
:is(.tile, .ghost, #agent).pig-right { background-image: url('pigs/right-1.png'); }
:is(.tile, .ghost, #agent).pig-down { background-image: url('pigs/down-1.png'); }
/* etc. */
```

Still leaves `.mini-tile` pseudo-element separate.

| Pattern | Files | Current CSS | Estimated Reduction | JS Complexity | Description |
|---------|-------|-------------|---------------------|---------------|-------------|
| Pig sprite consolidation (Approach A) | main.js, editor.js, styles.css | 52 lines | ~35 lines | Minor | Add `.pig-sprite` class, use CSS variables for URLs |
| Pig sprite consolidation (Approach B) | styles.css | 52 lines | ~20 lines | None | Use `:is()` selector, mini-tile stays separate |

---

## Pattern 3: Duplicate Grid Rendering Logic (~25 JS lines)

**The Problem:**

Two nearly identical functions create grid tiles:

```javascript
// main.js:154-165 — renderGrid
ui.grid.innerHTML = '';
setCssVar('--grid-n-rows', level.nRows);
setCssVar('--grid-n-cols', level.nCols);
for (const char of cells) {
    const tile = document.createElement('div');
    tile.className = 'tile ' + TILE_CLASSES[char];
    ui.grid.appendChild(tile);
}

// editor.js:105-121 — load
ui.editorGrid.innerHTML = '';
document.documentElement.style.setProperty('--grid-n-rows', level.nRows);
document.documentElement.style.setProperty('--grid-n-cols', level.nCols);
for (const ch of level.grid.join('')) {
    const tile = document.createElement('div');
    tile.className = 'tile ' + TILE_CLASSES[ch];
    ui.editorGrid.appendChild(tile);
}
```

**CSS Impact:** None directly, but unified logic prevents drift (e.g., one using `.tile`, another using different classes).

**Proposed Refactor:**

Extract shared `renderTiles(container, level)` function to a shared module.

| Pattern | Files | Current CSS | Estimated Reduction | JS Complexity | Description |
|---------|-------|-------------|---------------------|---------------|-------------|
| Shared `renderTiles()` | main.js, editor.js | 0 | 0 (prevents drift) | Minor | Extract to shared module, 25 JS lines → 1 call each |

---

## Pattern 4: HUD Position via Class vs CSS Variable (~8 lines)

**The Problem:**

JS toggles `.near-right-edge` on `#agent` to flip HUD position:

```javascript
// main.js:173
ui.agent.classList.toggle('near-right-edge', col >= state.level.nCols - 2);
```

CSS then uses a high-specificity nested selector:

```css
/* Line 1080 — Specificity (2,1,0) */
#agent.near-right-edge #color-comparison-hud {
    left: auto;
    right: 100%;
    margin-left: 0;
    margin-right: 8px;
}
```

**Proposed Refactor:**

Use a CSS custom property instead of a class:

```javascript
// main.js:173
const flipped = col >= state.level.nCols - 2;
ui.agent.style.setProperty('--hud-side', flipped ? 'right' : 'left');
```

```css
#color-comparison-hud {
    left: var(--hud-left, 100%);
    right: var(--hud-right, auto);
    margin-left: var(--hud-ml, 8px);
    margin-right: var(--hud-mr, 0);
}

#agent[style*="--hud-side: right"] #color-comparison-hud {
    --hud-left: auto;
    --hud-right: 100%;
    --hud-ml: 0;
    --hud-mr: 8px;
}
```

**Alternative (simpler):** Move `.near-right-edge` to the HUD itself:

```javascript
ui.colorComparison.classList.toggle('flipped', col >= state.level.nCols - 2);
```

```css
#color-comparison-hud.flipped { /* position overrides */ }
```

This reduces specificity from (2,1,0) to (1,1,0).

| Pattern | Files | Current CSS | Estimated Reduction | JS Complexity | Description |
|---------|-------|-------------|---------------------|---------------|-------------|
| HUD position via CSS var | main.js, styles.css | 8 lines | ~3 lines | Trivial | Set `--hud-side` instead of class |
| Move class to HUD | main.js, styles.css | 8 lines | 0 (specificity fix) | Trivial | Toggle class on HUD not agent |

---

## Pattern 5: Editor Mode Body Class (~12 lines)

**The Problem:**

JS toggles `body.editor-mode` for mode switching:

```javascript
// main.js:536, 546
document.body.classList.add('editor-mode');
document.body.classList.remove('editor-mode');
```

CSS uses `body.editor-mode` prefix on multiple rules:

```css
body.editor-mode #code-section { display: none; }
body.editor-mode #game-section { flex: 1; }
body.editor-mode .tile { cursor: pointer; }
body.editor-mode .tile:hover { filter: brightness(1.1); }
body.editor-mode #agent { cursor: grab; }
body.editor-mode #agent:active { cursor: grabbing; }
```

**Issue:** Each rule requires `body.editor-mode` prefix + element selector. Future additions must match this pattern.

**Proposed Refactor:**

Toggle `.editor-mode` on `#app-container` instead of `body`:

```javascript
ui.appContainer.classList.toggle('editor-mode', true);
```

```css
.editor-mode #code-section { display: none; }
/* Slightly lower specificity, same effect */
```

Or toggle classes directly on affected elements:

```javascript
ui.codeSection.hidden = true;
ui.grid.classList.add('editable');
```

```css
.editable .tile { cursor: pointer; }
.editable .tile:hover { filter: brightness(1.1); }
```

| Pattern | Files | Current CSS | Estimated Reduction | JS Complexity | Description |
|---------|-------|-------------|---------------------|---------------|-------------|
| Localized mode classes | main.js, styles.css | 12 lines | ~4 lines | Minor | Toggle on container, not body; or per-element |

---

## Pattern 6: Ghost Element Cloning (~10 lines)

**The Problem:**

The drag ghost element duplicates tile/pig styling:

```css
.ghost { /* base ghost styling */ }
.ghost.tile { /* tile appearance */ }
.ghost.pig-right { background-image: url('pigs/right-1.png'); }
/* ... 4 directions */
```

**Current JS (editor.js:167):**

```javascript
ui.ghost.className = pigClass ? 'ghost ' + pigClass : 'ghost ' + state.drag.source?.className;
```

**Proposed Refactor:**

Clone the source tile's computed style or use the actual tile as the ghost:

```javascript
// Option A: Clone node for ghost
const ghostClone = state.drag.source.cloneNode(true);
ghostClone.classList.add('ghost');
document.body.appendChild(ghostClone);

// Option B: Apply source's background-image directly
ui.ghost.style.backgroundImage = getComputedStyle(state.drag.source).backgroundImage;
```

This eliminates the need for `.ghost.pig-*` rules entirely.

| Pattern | Files | Current CSS | Estimated Reduction | JS Complexity | Description |
|---------|-------|-------------|---------------------|---------------|-------------|
| Ghost inherits from source | editor.js, styles.css | 20 lines | ~15 lines | Minor | Clone source element or copy computed style |

---

## Summary Table

| Pattern | Files | Current CSS Lines | Reduction | JS Complexity | Priority |
|---------|-------|-------------------|-----------|---------------|----------|
| 1. Unified `.tile` class | main.js, styles.css | 57 | ~40 | Trivial | **High** |
| 2. Pig sprite consolidation | main.js, editor.js, styles.css | 52 | ~35 | Minor | **High** |
| 3. Shared `renderTiles()` | main.js, editor.js | 0 | 0 (prevents drift) | Minor | Medium |
| 4. HUD position refactor | main.js, styles.css | 8 | ~3 | Trivial | Medium |
| 5. Localized mode classes | main.js, styles.css | 12 | ~4 | Minor | Low |
| 6. Ghost cloning | editor.js, styles.css | 20 | ~15 | Minor | Medium |

**Total potential reduction:** ~97 CSS lines (~6.5%)

**Combined with Part 1 (230 lines):** ~327 lines total (~22% reduction)

---

## Code Sketches: Top 3 Opportunities

### 1. Unified `.tile` Class

**Before (main.js:419):**
```javascript
tile.className = 'mini-tile ' + TILE_CLASSES[ch];
```

**After:**
```javascript
tile.className = 'tile ' + TILE_CLASSES[ch];
```

**Before (styles.css):**
```css
/* 57 lines total for .tile and .mini-tile */
.tile.red { background-color: var(--tile-red); }
.mini-tile.red { background-color: var(--tile-red); }
/* ... repeated for green, blue, target */
```

**After:**
```css
/* 20 lines total */
.tile.red { background-color: var(--tile-red); }
.tile.green { background-color: var(--tile-green); }
.tile.blue { background-color: var(--tile-blue); }
.tile.target::before { /* single definition */ }

/* Mini-grid scoping for size differences */
.mini-grid .tile {
    min-width: 0;
    min-height: 0;
}
```

---

### 2. Pig Sprite Consolidation

**Before (styles.css — 4 locations):**
```css
.tile.pig-right { background-image: url('pigs/right-1.png'); }
.ghost.pig-right { background-image: url('pigs/right-1.png'); }
.mini-tile.pig-right::after { background-image: url('pigs/right-1.png'); }
#agent { /* also sets background-image */ }
/* ... ×4 directions = 16+ declarations */
```

**After (using :is() + shared base):**
```css
/* Shared pig sprite base */
:is(.tile, .ghost, #agent)[class*="pig-"] {
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: center;
}

/* Direction URLs — single source of truth */
:is(.tile, .ghost, #agent).pig-right { background-image: url('pigs/right-1.png'); }
:is(.tile, .ghost, #agent).pig-down { background-image: url('pigs/down-1.png'); }
:is(.tile, .ghost, #agent).pig-left { background-image: url('pigs/left-1.png'); }
:is(.tile, .ghost, #agent).pig-up { background-image: url('pigs/up-1.png'); }

/* Mini-tile still needs pseudo-element (different structure) */
.mini-grid .tile[class*="pig-"]::after {
    content: "";
    /* ... */
    background-image: inherit; /* Can't inherit from non-existent parent */
}
```

**Note:** Mini-tile pig indicator may need to stay separate due to pseudo-element structure, or refactor to use a child element instead.

---

### 3. Ghost Inherits from Source

**Before (editor.js:167):**
```javascript
ui.ghost.className = pigClass ? 'ghost ' + pigClass : 'ghost ' + state.drag.source?.className;
```

**Before (styles.css):**
```css
.ghost { position: fixed; /* ... */ }
.ghost.tile { opacity: 0.95; box-shadow: ...; }
.ghost.pig-right { background-image: url('pigs/right-1.png'); }
.ghost.pig-down { background-image: url('pigs/down-1.png'); }
.ghost.pig-left { background-image: url('pigs/left-1.png'); }
.ghost.pig-up { background-image: url('pigs/up-1.png'); }
```

**After (editor.js):**
```javascript
// Copy the visual appearance directly
const sourceStyle = getComputedStyle(state.drag.source);
ui.ghost.style.backgroundColor = sourceStyle.backgroundColor;
ui.ghost.style.backgroundImage = sourceStyle.backgroundImage;
ui.ghost.className = 'ghost';
```

**After (styles.css):**
```css
.ghost {
    position: fixed;
    width: 60px;
    height: 60px;
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.9;
    pointer-events: none;
    transform: translate(-50%, -50%);
    z-index: 1000;
    visibility: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
/* No .ghost.pig-* rules needed */
```

---

## Implementation Order

1. **Pattern 1 (Unified `.tile`)** — Highest impact, trivial JS change, no behavioral changes
2. **Pattern 2 (Pig sprites)** — High impact, requires testing all grid contexts
3. **Pattern 6 (Ghost cloning)** — Medium impact, can be done with Pattern 2
4. **Pattern 4 (HUD position)** — Fixes specificity issue from Part 3
5. **Pattern 5 (Mode classes)** — Low priority, optional cleanup
6. **Pattern 3 (Shared renderTiles)** — JS-only, no CSS impact, good for maintainability

---

# Part 5: Dead Code & HTML Audit

**Goal:** Identify CSS selectors that match no HTML elements and are never added by JS, unused HTML elements, redundant wrappers, and unused data attributes. Cross-reference `index.html`, `styles.css`, `main.js`, `editor.js`, `ui.js`, and `animations.js`.

---

## 1. Unused CSS Selectors

Grepping revealed that several CSS selectors only appear in `styles.css` and `*.old` backup files (not active code). These are remnants from a previous version of the level editor that was refactored.

| Selector | CSS Lines | Line Count | Evidence | Verdict |
|----------|-----------|------------|----------|---------|
| `.trash-toggle-btn` | 341-367 | 27 | Only in `customLevels.js.old` | **Dead** |
| `.level-trash-btn` | 369-390 | 22 | Only in `customLevels.js.old` | **Dead** |
| `.level-item-marked` | 392-395 | 4 | Only in `customLevels.js.old` | **Dead** |
| `.level-share-btn` | 397-418 | 22 | Only in `customLevels.js.old` | **Dead** |
| `.copied-toast` | 421-439 | 19 | Only in `customLevels.js.old` | **Dead** |
| `.delete-confirm-btn` | 491-521 | 31 | Only in `customLevels.js.old` | **Dead** |
| `.btn-icon-text` | 763-767 | 5 | No HTML, no JS | **Dead** |
| `.editor-toolbar` | 847-858 | 12 | Only in `editor.js.old` | **Dead** |
| `.level-name-input` | 861-879 | 19 | Only in `editor.js.old` | **Dead** |
| `.editor-help-text` | 882-897 | 16 | No HTML, no JS | **Dead** |

**Total dead CSS: 177 lines**

These selectors supported features in the old editor implementation:
- Trash/delete mode for removing custom levels
- Level sharing with toast notifications
- Editor toolbar with level name input and help text

The current `editor.js` implements a simpler approach without these UI elements.

---

## 2. Unused HTML Elements

All HTML elements with `id` or `class` attributes are either:
- Styled by CSS, or
- Selected/manipulated by JS

No orphaned HTML elements found.

---

## 3. Redundant HTML Wrappers

| Wrapper | Location | Contains | Required? | Reason |
|---------|----------|----------|-----------|--------|
| `#grid-wrapper` | index.html:140 | `#grid` | **Yes** | Used by `animations.lose()` to shake grid without affecting pig position. CSS provides flex container context. |
| `#grid-container` | index.html:139 | `#grid-wrapper` | **Yes** | Provides `container-type: size` for container queries that size the grid responsively. |

No redundant wrappers found. Both serve specific purposes.

---

## 4. Unused Data Attributes

| Attribute | Element | Used By | Verdict |
|-----------|---------|---------|---------|
| `data-tab` | `.sidebar-tab` buttons | `main.js:469` — `tab.dataset.tab` | Used |
| `data-lang` | `.lang-btn` buttons | `main.js:114` — `dataset.lang` | Used |

All data attributes are used.

---

## 5. Classes in HTML Never Styled

| Class | Element | CSS Rules | Issue |
|-------|---------|-----------|-------|
| `.game-notification` | `#game-notification` (index.html:151) | **None** | Missing CSS |

### Analysis of `.game-notification`

The element exists and is used by `animations.notify()` (called from main.js:509, 516, 576), but has no CSS rules. Compare to `.editor-notification` which has positioning styles at lines 656-672.

The `notify()` function sets:
- `element.textContent` (content)
- `element.style.background` (inline color)
- Opacity animation via Web Animations API

But it does NOT set positioning. The `.editor-notification` CSS provides:
```css
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
/* ... other styles */
```

Without these rules, `#game-notification` won't be centered or positioned correctly.

**Verdict:** Bug. Either:
1. Rename to shared class: `.notification` used by both, or
2. Add `.game-notification` CSS (duplicate of `.editor-notification`), or
3. Use `:is(.editor-notification, .game-notification)` selector

**Recommended fix:** Replace `.editor-notification` with a shared `.notification` class and update both HTML elements. Net change: ~0 lines (rename only).

---

## Summary

| Category | Items Found | Lines Affected | Action |
|----------|-------------|----------------|--------|
| Dead CSS selectors | 10 | **177 lines** | Delete |
| Unused HTML elements | 0 | 0 | None |
| Redundant wrappers | 0 | 0 | None |
| Unused data attributes | 0 | 0 | None |
| Missing CSS (bug) | 1 | +0 (fix via rename) | Fix `.game-notification` |

**Total deletable: 177 CSS lines (11.9% of styles.css)**

---

## Combined Totals Across All Parts

| Part | Focus | Potential Reduction |
|------|-------|---------------------|
| Part 1 | CSS deduplication & consolidation | ~230 lines |
| Part 4 | JS refactoring to simplify CSS | ~97 lines |
| Part 5 | Dead code removal | ~177 lines |
| **Total** | | **~504 lines (34%)** |

Note: Parts 2 and 3 focused on organization and specificity hygiene respectively—they don't directly reduce line count but improve maintainability.

---

## Recommended Deletion Order

1. **Delete dead CSS immediately** (Part 5) — Zero risk, 177 lines, no behavioral change
2. **Apply Part 1 consolidations** — Low risk, ~230 lines, CSS-only changes
3. **Apply Part 4 JS+CSS refactors** — Medium risk, ~97 lines, requires testing

---

# Part 6: Execution Plan

**Goal:** Step-by-step implementation guide synthesizing Parts 1, 4, and 5. Ordered by risk (zero-risk first, then CSS-only, then JS+CSS). Each step includes verification method.

**Scope:** CSS reduction only. Parts 2 (file splitting) and 3 (specificity hygiene) are deferred.

**Estimated total reduction:** ~400-450 lines (27-30%)

---

## Phase A: Dead Code Deletion (Zero Risk)

### Step 1: Delete unused CSS from old editor

**Files:** `styles.css`

**Delete these selectors (copy line ranges to clipboard before deleting for easy undo):**

- [ ] Lines 341-367: `.trash-toggle-btn` and states (27 lines)
- [ ] Lines 369-390: `.level-trash-btn` and states (22 lines)
- [ ] Lines 392-395: `.level-item-marked` (4 lines)
- [ ] Lines 397-418: `.level-share-btn` and states (22 lines)
- [ ] Lines 421-439: `.copied-toast` and `.copied-toast.show` (19 lines)
- [ ] Lines 491-521: `.delete-confirm-btn` and children (31 lines)
- [ ] Lines 763-767: `.btn-icon-text` (5 lines)
- [ ] Lines 847-858: `.editor-toolbar` and `.editor-toolbar.hidden` (12 lines)
- [ ] Lines 861-879: `.level-name-input` and states (19 lines)
- [ ] Lines 882-897: `.editor-help-text` and children (16 lines)

**Lines deleted:** 177

**Verification:**
1. Refresh browser
2. Click through all sidebar tabs (Default, Local, Community)
3. Switch to Level Creator mode, create/edit a level
4. Switch back to Play mode, run a level
5. All UI should look and function identically

**Commit:** `Delete 177 lines of dead CSS from old editor implementation`

---

### Step 2: Fix .game-notification bug

**Files:** `styles.css`, `index.html`

**Changes:**

- [ ] In `styles.css` line 656: rename `.editor-notification` → `.notification`
- [ ] In `index.html` line 160: change `class="editor-notification"` → `class="notification"`
- [ ] In `index.html` line 151: change `class="game-notification"` → `class="notification"`

**Lines changed:** 3 (net zero)

**Verification:**
1. In Play mode, click in the code editor while playback is running
2. Notification "Paused to edit code" should appear centered over the game grid
3. In Level Creator, click Share on an invalid level
4. Error notification should appear centered over the editor grid

**Commit:** `Fix game notification styling by unifying .notification class`

---

## Phase B: CSS-Only Consolidation (Low Risk)

### Step 3: Add CSS variables for magic values

**Files:** `styles.css`

**Add to `:root` (after line 33):**

```css
/* Danger colors */
--color-danger: #d9534f;
--color-danger-dark: #c9302c;

/* Monospace font stack */
--font-mono: 'SF Mono', 'Consolas', 'Monaco', monospace;
```

**Then replace throughout file:**

- [ ] `#d9534f` → `var(--color-danger)` (was at lines 360, 388, 505)
- [ ] `#c9302c` → `var(--color-danger-dark)` (was at lines 365, 516, 520)
- [ ] `'SF Mono', 'Consolas', 'Monaco', monospace` → `var(--font-mono)` (lines 677, 809)
- [ ] `'SF Mono', 'Consolas', monospace` → `var(--font-mono)` (line 1096 — also fixes inconsistency)

**Lines changed:** +6 for variables, replacements are neutral

**Verification:**
1. Check danger buttons still appear red (currently none visible after Part 5 deletions)
2. Check code editor font remains monospace
3. Check HUD comparison text remains monospace

**Commit:** `Extract magic colors and font stack to CSS variables`

---

### Step 4: Consolidate tile colors with :is()

**Files:** `styles.css`

**Replace (around lines 968-978 and 1450-1452 after earlier deletions):**

```css
/* Before: 6 rules */
.tile.red { background-color: var(--tile-red); }
.tile.green { background-color: var(--tile-green); }
.tile.blue { background-color: var(--tile-blue); }
.mini-tile.red { background-color: var(--tile-red); }
.mini-tile.green { background-color: var(--tile-green); }
.mini-tile.blue { background-color: var(--tile-blue); }
```

**With:**

```css
/* After: 3 rules */
:is(.tile, .mini-tile).red { background-color: var(--tile-red); }
:is(.tile, .mini-tile).green { background-color: var(--tile-green); }
:is(.tile, .mini-tile).blue { background-color: var(--tile-blue); }
```

**Lines saved:** ~3

**Verification:**
1. Check main game grid colors (red, green, blue tiles)
2. Check sidebar thumbnail colors
3. Check Level Creator grid colors

**Commit:** `Consolidate tile color rules with :is() selector`

---

### Step 5: Consolidate target icon with :is()

**Files:** `styles.css`

**Replace the two `::before` blocks (around lines 980-992 and 1458-1469):**

```css
/* Before: ~25 lines across two rules */
.tile.target::before { ... }
.mini-tile.target::before { ... }
```

**With:**

```css
/* After: ~15 lines */
:is(.tile, .mini-tile).target::before {
    content: "";
    position: absolute;
    top: 30%;
    left: 30%;
    width: 40%;
    height: 40%;
    background: url("img/golden-apple.png") center/contain no-repeat;
}

.tile.target::before {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}
```

**Lines saved:** ~10

**Verification:**
1. Check golden apple icons on target tiles in main grid (with shadow)
2. Check golden apple icons in sidebar thumbnails (no shadow, smaller)
3. Check golden apple icons in Level Creator

**Commit:** `Consolidate target icon ::before rules with :is()`

---

### Step 6: Merge media queries

**Files:** `styles.css`

**Move the media query at lines 1129-1134 to merge with the one at lines 1418-1429:**

```css
@media (max-width: 900px) {
    /* From first block */
    #code-section {
        flex: 1;
        max-width: none;
    }

    /* From second block */
    .help-content {
        grid-template-columns: 1fr;
        gap: 24px;
        padding: 48px 24px 24px;
    }
    .help-card {
        width: 95%;
        max-height: 90vh;
    }
}
```

**Lines saved:** ~5 (removed duplicate `@media` declaration)

**Verification:**
1. Resize browser window to <900px width
2. Check code section expands properly
3. Check help modal switches to single-column layout

**Commit:** `Merge scattered @media queries into single block`

---

### Step 7: Fix padding shorthand

**Files:** `styles.css`

**This may no longer exist after Step 1 deletions.** Check if `.delete-confirm-btn` was the culprit. If another instance exists:

**Replace:**
```css
padding: 16px;
padding-top: 24px;
```

**With:**
```css
padding: 24px 16px 16px;
```

**Lines saved:** 1

**Verification:** Visual check of affected element

**Commit:** `Use padding shorthand instead of override`

---

## Phase C: JS+CSS Refactoring (Medium Risk)

### Step 8: Unify .tile class (eliminate .mini-tile)

**Files:** `main.js`, `styles.css`

**JS change (main.js, around line 419):**

```javascript
// Before
tile.className = 'mini-tile ' + TILE_CLASSES[ch];

// After
tile.className = 'tile ' + TILE_CLASSES[ch];
```

**CSS changes:**

- [ ] Delete `.mini-tile` base rule (around line 1444-1448)
- [ ] Delete `.mini-tile.red/green/blue` (already consolidated in Step 4, just remove the `:is(.tile, .mini-tile)` → `:is(.tile)` or just `.tile`)
- [ ] Replace `.mini-tile.target::before` consolidated rule
- [ ] Replace `.mini-tile[class*="pig-"]` rules with `.mini-grid .tile[class*="pig-"]`
- [ ] Add scoping rule:
  ```css
  .mini-grid .tile {
      min-width: 0;
      min-height: 0;
  }
  ```

**Lines saved:** ~35-40

**Verification:**
1. Check sidebar thumbnails render correctly (colors, targets, pig indicators)
2. Check main game grid still works
3. Check Level Creator grid still works
4. Play through a level to verify no regressions

**Commit:** `Unify tile class naming, use container scoping for mini-grid`

---

### Step 9: Consolidate pig sprite CSS with :is()

**Files:** `styles.css`

**Replace the separate pig direction rules for `.tile`, `.ghost`, `#agent`:**

```css
/* Shared base for all pig sprites */
:is(.tile, .ghost, #agent)[class*="pig-"],
:is(.tile, .ghost, #agent).pig-right,
:is(.tile, .ghost, #agent).pig-down,
:is(.tile, .ghost, #agent).pig-left,
:is(.tile, .ghost, #agent).pig-up {
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: center;
}

/* Direction-specific URLs */
:is(.tile, .ghost, #agent).pig-right { background-image: url('pigs/right-1.png'); }
:is(.tile, .ghost, #agent).pig-down { background-image: url('pigs/down-1.png'); }
:is(.tile, .ghost, #agent).pig-left { background-image: url('pigs/left-1.png'); }
:is(.tile, .ghost, #agent).pig-up { background-image: url('pigs/up-1.png'); }

/* Mini-grid pig indicator (uses ::after pseudo-element) */
.mini-grid .tile[class*="pig-"]::after {
    content: "";
    position: absolute;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
}
.mini-grid .tile.pig-right::after { background-image: url('pigs/right-1.png'); }
.mini-grid .tile.pig-down::after { background-image: url('pigs/down-1.png'); }
.mini-grid .tile.pig-left::after { background-image: url('pigs/left-1.png'); }
.mini-grid .tile.pig-up::after { background-image: url('pigs/up-1.png'); }
```

**Lines saved:** ~20

**Verification:**
1. Check pig renders in main game grid (all 4 directions via turn)
2. Check pig indicator in sidebar thumbnails
3. Check pig in Level Creator (rotation, dragging)
4. Check drag ghost shows pig sprite correctly

**Commit:** `Consolidate pig sprite rules with :is() selector`

---

### Step 10: Ghost element inherits computed style

**Files:** `editor.js`, `styles.css`

**JS change (editor.js, handlePointerDown around line 167):**

```javascript
// Before
ui.ghost.className = pigClass ? 'ghost ' + pigClass : 'ghost ' + state.drag.source?.className;

// After
const sourceStyle = getComputedStyle(state.drag.source);
ui.ghost.style.backgroundColor = sourceStyle.backgroundColor;
ui.ghost.style.backgroundImage = sourceStyle.backgroundImage;
ui.ghost.className = 'ghost';
```

**CSS change:** Delete `.ghost.pig-*` and `.ghost.tile` rules, keep only base `.ghost`:

```css
.ghost {
    position: fixed;
    width: 60px;
    height: 60px;
    background-size: 90%;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0.9;
    pointer-events: none;
    transform: translate(-50%, -50%);
    z-index: 1000;
    visibility: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
```

**Lines saved:** ~15

**Verification:**
1. In Level Creator, drag a colored tile — ghost should show tile color
2. Drag the pig — ghost should show pig sprite
3. Ghost should follow cursor smoothly
4. Dropping should work correctly

**Commit:** `Simplify ghost element by copying computed style from source`

---

## Summary

| Step | Phase | Risk | Lines Saved | Commit Message |
|------|-------|------|-------------|----------------|
| 1 | A | Zero | 177 | Delete dead CSS from old editor |
| 2 | A | Zero | 0 | Fix game notification styling |
| 3 | B | Low | +6 | Extract magic values to variables |
| 4 | B | Low | 3 | Consolidate tile colors with :is() |
| 5 | B | Low | 10 | Consolidate target icons with :is() |
| 6 | B | Low | 5 | Merge media queries |
| 7 | B | Low | 1 | Fix padding shorthand |
| 8 | C | Medium | 35-40 | Unify tile class naming |
| 9 | C | Medium | 20 | Consolidate pig sprites with :is() |
| 10 | C | Medium | 15 | Ghost inherits computed style |

**Total estimated reduction:** ~260-270 lines

**Note:** This is lower than the ~504 theoretical maximum because:
- Some savings overlap (e.g., tile unification affects multiple consolidations)
- Variables add lines even as they enable consistency
- Some Part 1 phases (button system, flex utilities) were deferred as they require HTML changes

---

## Deferred Work

The following were identified but not included in this execution plan:

1. **Unified button system** (Part 1, Phase 2) — Requires adding classes to HTML elements
2. **Flex center utility** (Part 1, Phase 6) — Requires HTML changes
3. **Specificity fixes** (Part 3) — Separate initiative, doesn't reduce lines
4. **File splitting** (Part 2) — Separate initiative, increases lines slightly
5. **Shared renderTiles()** (Part 4, Pattern 3) — JS-only, no CSS impact
