# CSS Scope Guide

Component and page styles should use CSS Modules:

```js
import styles from "./Example.module.css";
import { createScopedClassNames } from "../../utils/createScopedClassNames";

const cx = createScopedClassNames(styles);

<div className={cx("example-card example-card--active")} />
```

Keep global CSS very small. `src/index.css` is for reset styles, body defaults, and app-wide CSS variables only.

Do not add local imports like `import "./Example.css"` for React components. Use `Example.module.css` instead.

If a module file needs to target third-party classes such as MUI or Quill, wrap those selectors with `:global(...)`:

```css
.form-field :global(.ql-toolbar) {
  border-color: var(--color-border);
}
```

Run this before committing CSS changes:

```sh
npm run check:css-scope
```

The same check runs automatically before `npm run build`.
