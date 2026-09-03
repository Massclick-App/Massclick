const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const extensions = ["", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".svg", ".webp"];
const textExtensions = new Set([".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (textExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function resolveLocal(baseFile, specifier) {
  const basePath = specifier.startsWith(".")
    ? path.resolve(path.dirname(baseFile), specifier)
    : path.resolve(src, specifier);

  for (const extension of extensions) {
    const candidate = basePath + extension;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const extension of [".js", ".jsx", ".mjs", ".cjs"]) {
      const candidate = path.join(basePath, `index${extension}`);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }
  }

  return null;
}

function shouldCheck(specifier) {
  if (specifier.startsWith(".")) return true;
  if (specifier.startsWith("@")) return false;
  return fs.existsSync(path.join(src, specifier.split("/")[0]));
}

const importPattern =
  /((?:import|export)\s+(?:[^'"()]+?\s+from\s*)?|import\s*\(\s*(?:\/\*[\s\S]*?\*\/\s*)?|require\s*\(\s*)(["'])([^"']+)(\2)/g;

const failures = [];

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

for (const file of walk(src)) {
  const source = stripComments(fs.readFileSync(file, "utf8"));
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[3];
    if (!shouldCheck(specifier)) continue;
    if (!resolveLocal(file, specifier)) {
      failures.push(`${path.relative(root, file)} -> ${specifier}`);
    }
  }
}

if (failures.length) {
  console.error("Unresolved local imports:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("All local imports resolved.");
