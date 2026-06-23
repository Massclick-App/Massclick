# Massclick Development Guide

## CSS Modules - STRICT ISOLATION RULE

### The Golden Rule
**Each component owns ONLY its own styles. Parent layouts NEVER target children.**

This prevents CSS leakage, specificity conflicts, and eliminates the need for `!important` hacks.

### Reference
- **Guidelines:** `client/ui-app/src/styles/CSS_MODULES_GUIDELINES.md`
- **Linting Config:** `client/ui-app/.stylelintrc.json`
- **Examples:** See CSS_MODULES_GUIDELINES.md for 20+ DO/DON'T patterns

---

## CSS Module Rules (MUST FOLLOW)

### ✅ DO:
1. **Style only your component's classes**
   ```css
   /* featureService.module.css - GOOD */
   .featured-services-container { /* OK - own container */ }
   .service-card { /* OK - own component elements */ }
   ```

2. **Component manages its own padding/width/layout**
   ```css
   /* featureService.module.css */
   .featured-services-container {
     padding: 35px 60px 20px 100px;
     width: 100%;
     grid-template-columns: repeat(10, 1fr);
   }
   ```

3. **Use CSS Modules `composes` for shared styles**
   ```css
   .my-card {
     composes: baseCard from '../shared.module.css';
   }
   ```

4. **Pass layout context via props, not CSS**
   ```jsx
   <FeaturedServices maxColumns={10} padding="35px 60px" />
   ```

### ❌ DON'T:
1. **NEVER use parent-to-child selectors**
   ```css
   /* BAD - homeLayout.module.css */
   .home-section > .featured-services-container { }
   .home-section .service-card { }
   ```

2. **NEVER reach into other components**
   ```css
   /* BAD */
   .blog-details .table td { }
   .skeleton .featured-services-container .service-card { }
   ```

3. **NEVER use !important (it's a red flag)**
   ```css
   /* BAD - indicates a parent/child conflict */
   .service-card { padding: 16px !important; }
   
   /* Good - only if comment explains WHY */
   .service-card { padding: 16px !important; /* Overrides form library MUI margin */ }
   ```

---

## If You See `!important` in Code

**Red flag - it means:** CSS is being forced from above and the child component is fighting back.

**Action required:**
1. Find the parent CSS forcing the style
2. Remove it from parent
3. Let child component own the style
4. Remove the `!important`

**Example:**
```css
/* ❌ WRONG - homeLayout.module.css forcing on children */
.home-section > .featured-services-container {
  padding: 0;
}

/* ✅ RIGHT - featureService owns its padding */
.featured-services-container {
  padding: 35px 60px 20px 100px;
}
```

---

## CSS Refactoring Status

**Files fixed (Phase 1):**
- ✅ `homeLayout.module.css` - Removed all child-targeting rules
- ✅ `CSS_MODULES_GUIDELINES.md` - Created comprehensive guide
- ✅ `index.css` - Improved global reset

**In progress (Phase 2):**
- Systematically removing unnecessary `!important` from 233 occurrences
- Files: business.module.css (20), FCMMarketing (9), categories (8), etc.

**Safeguards added:**
- ✅ `.stylelintrc.json` - Linting rules prevent future violations
- ✅ CSS_MODULES_GUIDELINES.md - Developer reference
- ⏳ Pre-commit hook - Will enforce rules on git push

---

## How to Review a CSS Change

Before approving any CSS PR, check:

1. **Does it only style the component's own classes?**
   - ✅ `.my-component { }`
   - ❌ `.parent > .my-component { }`

2. **No descendant selectors targeting other components?**
   - ✅ `.cards { } .card { }`
   - ❌ `.cards .item-detail { }` (if item-detail is separate component)

3. **Is there `!important`?**
   - ❓ Ask: "Why? What's forcing a different style above?"
   - If answer is "parent CSS", require parent fix instead
   - If answer is "form library", document with comment

4. **Can component props handle layout variation instead?**
   - ✅ `<Card padding="16px" width="100%" />`
   - ❌ `.parent > .card { padding: 16px; }`

---

## Pre-Commit Hook (Coming Soon)

When implemented, this will prevent commits that:
- Add new descendant selectors targeting classes
- Add `!important` without explanation
- Violate CSS Module isolation

Setup when ready:
```bash
npm install lint-staged husky --save-dev
npx husky install
npx husky add .husky/pre-commit "npx stylelint 'src/**/*.module.css'"
```

---

## Questions?

Refer to:
1. `src/styles/CSS_MODULES_GUIDELINES.md` - Full developer guide with examples
2. `.stylelintrc.json` - Linting rules
3. `CSS_LEAKAGE_CLEANUP.md` - Technical tracking document
4. `CSS_REFACTORING_SUMMARY.md` - Complete refactoring status

---

## Technical Debt Status

| Category | Count | Status |
|----------|-------|--------|
| Files with `!important` | 233 total | 🟡 In cleanup |
| Descendant selector leakage | ~8 files | ✅ Mostly fixed |
| CSS Module isolation broken | homeLayout fixed | ✅ Fixed (Phase 1) |
| Linting configured | Yes | ✅ Done |
| Developer guide | Yes | ✅ Done |

**Goal:** Zero CSS leakage, zero unnecessary `!important`, components fully isolated by end of Phase 2.
