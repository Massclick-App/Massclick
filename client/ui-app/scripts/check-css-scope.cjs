const fs = require("fs");
const path = require("path");

const appRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(appRoot, "src");
const allowedGlobalCss = new Set([path.join(srcRoot, "index.css")]);

function walk(dir, extensions) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(file, extensions));
      continue;
    }

    if (entry.isFile() && extensions.some((extension) => file.endsWith(extension))) {
      files.push(file);
    }
  }

  return files;
}

function relative(file) {
  return path.relative(appRoot, file).replace(/\\/g, "/");
}

function resolveLocalImport(fromFile, source) {
  if (!source.startsWith(".") && !source.startsWith("/")) return null;
  return path.resolve(path.dirname(fromFile), source);
}

const jsFiles = walk(srcRoot, [".js", ".jsx", ".ts", ".tsx"]);
const cssFiles = walk(srcRoot, [".css"]);
const importPattern = /import\s+(?:[^'"]+from\s+)?['"]([^'"]+\.css)['"]/g;
const violations = [];

for (const file of jsFiles) {
  const source = fs.readFileSync(file, "utf8");
  let match;

  while ((match = importPattern.exec(source))) {
    const imported = resolveLocalImport(file, match[1]);
    if (!imported) continue;
    if (imported.endsWith(".module.css")) continue;
    if (allowedGlobalCss.has(imported)) continue;

    violations.push(`${relative(file)} imports non-module CSS: ${match[1]}`);
  }
}

const classPattern = /(^|[\s,{>+~(])\.([A-Za-z_-][A-Za-z0-9_-]*)/gm;
const globalClassFiles = new Map();

for (const file of cssFiles) {
  if (file.endsWith(".module.css")) continue;

  const source = fs.readFileSync(file, "utf8");
  const seenInFile = new Set();
  let match;

  while ((match = classPattern.exec(source))) {
    seenInFile.add(match[2]);
  }

  for (const className of seenInFile) {
    if (!globalClassFiles.has(className)) globalClassFiles.set(className, []);
    globalClassFiles.get(className).push(relative(file));
  }
}

const duplicates = [...globalClassFiles.entries()].filter(([, files]) => files.length > 1);

if (violations.length || duplicates.length) {
  console.error("CSS scope check failed.");

  if (violations.length) {
    console.error("\nPlain local CSS imports:");
    for (const violation of violations) console.error(`- ${violation}`);
  }

  if (duplicates.length) {
    console.error("\nDuplicate global CSS classes:");
    for (const [className, files] of duplicates) {
      console.error(`- .${className}: ${files.join(", ")}`);
    }
  }

  process.exit(1);
}

console.log("CSS scope check passed.");
