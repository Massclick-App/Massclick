# CSS Modules - Component Isolation Guidelines

## The Golden Rule
**Components own their styles. Parent layouts do NOT style children.**

Each component's CSS Module is scoped to that component only. Violating this creates CSS leakage, specificity conflicts, and requires `!important` workarounds.

---

## ✅ DO (Correct)

### 1. Each component styles only itself
```css
/* featureService.module.css */
.featured-services-container {
  display: grid;
  grid-template-columns: repeat(10, 1fr) !important;
  padding: 35px 60px 20px 100px !important;
}

.service-card {
  width: 145px;
  cursor: pointer;
}
```

### 2. Parent layout styles only its own container
```css
/* homeLayout.module.css */
.home-page {
  background: var(--home-page-bg);
}

.home-section {
  width: 100%;
  display: flow-root;
}

/* NO child-targeting rules allowed */
```

### 3. If you need layout info, pass as props or data attributes
```jsx
// Parent passes data to child
<FeaturedServices maxWidth="1720px" padding="35px 60px 20px 100px" />

// Child uses props to style itself
const FeaturedServices = ({ maxWidth, padding }) => (
  <section style={{ maxWidth, padding }}>
    {/* content */}
  </section>
);
```

### 4. Use CSS Modules `composes` for shared styles
```css
/* sharedStyles.module.css */
.cardBase {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

/* featureService.module.css */
.service-card {
  composes: cardBase from '../sharedStyles.module.css';
  width: 145px;
}
```

---

## ❌ DON'T (Causes CSS Leakage)

### 1. Parent targeting children with descendant selectors
```css
/* BAD - homeLayout.module.css */
.home-section > .featured-services-container {
  padding: 0; /* Forces padding on child component */
}

.home-section .service-card {
  width: 100%; /* Overrides child's styling */
}
```

### 2. Deep descendant selectors reaching into components
```css
/* BAD - blogDetails.module.css */
.blog-details .table td {
  padding: 12px; /* Reaching 2-3 levels deep */
}

.blog-section .heading-text {
  color: #333; /* Affects descendant styling */
}
```

### 3. Using !important to fight specificity
```css
/* BAD */
.service-card {
  padding: 16px !important; /* Symptom of specificity conflict */
}

/* If you're using !important, you have a CSS leakage problem above you */
```

### 4. Targeting other components' internal elements
```css
/* BAD - skeleton.module.css */
.skeleton .featured-services-container .service-card {
  background: #f0f0f0; /* Directly styling another component's internals */
}
```

---

## Checklist for New CSS Modules

Before committing CSS changes:

- [ ] **Self-only rule**: Does this CSS only style elements in MY component?
- [ ] **No parent selectors**: Am I using `> .` or descendant selectors to target other components?
- [ ] **No !important**: Is `!important` only used as a last resort (e.g., for critical fixes)?
- [ ] **Component boundaries**: Would a future dev understand that this component is isolated?
- [ ] **Prop-based styling**: If layout adjusts, is it via props/data attributes, not parent CSS?

---

## Common Patterns & Solutions

### Problem: Parent needs to control child spacing
```css
/* ❌ BAD */
.home-section > .featured-services-container {
  padding: 35px 60px 20px 100px; /* Parent forces padding on child */
}

/* ✅ GOOD */
/* homeLayout.module.css - no child targeting */

/* featureService.module.css */
.featured-services-container {
  padding: 35px 60px 20px 100px; /* Child controls own padding */
}
```

### Problem: Child needs styling based on context
```css
/* ❌ BAD */
/* homeLayout.module.css */
.home-section .featured-services-container {
  grid-template-columns: repeat(6, 1fr); /* Forces layout from parent */
}

/* ✅ GOOD */
/* featureService.module.css - component controls its own layout */
.featured-services-container {
  grid-template-columns: repeat(10, 1fr); /* Self-determined */
}

/* Pass context via parent prop if needed */
<FeaturedServices columnsDesktop={10} columnsMobile={4} />
```

### Problem: Styling shared elements (images, headings)
```css
/* ❌ BAD */
.home-section img {
  display: block; /* Affects ALL images, including nested component images */
}

/* ✅ GOOD - Scope it to component */
.featured-services-container img {
  display: block; /* Only affects images in this component */
}
```

---

## If You Find Existing Leakage

1. **Identify source**: Find the parent CSS file targeting children
2. **Move responsibility**: Move the styling to the child component's CSS Module
3. **Remove !important**: Once CSS is properly scoped, `!important` becomes unnecessary
4. **Test**: Verify the component still looks correct without parent interference

### Example Refactor:
```css
/* BEFORE - homeLayout.module.css (BAD) */
.home-section > .featured-services-container {
  width: 100%;
  padding: 35px 60px 20px 100px !important;
}

/* AFTER - homeLayout.module.css (GOOD) */
.home-section {
  width: 100%;
  /* No child-targeting */
}

/* AFTER - featureService.module.css */
.featured-services-container {
  width: 100%;
  padding: 35px 60px 20px 100px !important; /* Now safe to keep !important only here */
}
```

---

## ESLint / Stylelint Rules

To prevent future leakage, consider these linting rules (see `.stylelintrc.json`):

```json
{
  "rules": {
    "selector-max-specificity": "0,2,0",           /* Max 2 classes */
    "selector-no-descendant-combinator": true,     /* No deep nesting */
    "no-duplicate-selectors": true,                /* No selector duplication */
    "declaration-no-important": "warning"          /* Warn on !important */
  }
}
```

---

## Summary

| Rule | Why | Example |
|------|-----|---------|
| **Components own their styles** | Clear responsibility, no conflicts | `featureService.module.css` manages `.featured-services-container` |
| **No parent-to-child selectors** | Prevents specificity wars | ❌ `homeLayout > featuredServices`, ✅ Each owns itself |
| **Minimize !important** | Indicates a problem above | Use when child is truly isolated and working correctly |
| **Scope selectors tightly** | Prevents accidental targeting | `.component img` not `.section img` |
| **Pass context via props** | Explicit, testable, maintainable | `<Child columnCount={10} />` |

This approach keeps your codebase maintainable and prevents the CSS leakage issues you experienced!
