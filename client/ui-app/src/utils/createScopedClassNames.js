export const createScopedClassNames =
  (...styleMaps) =>
  (...values) =>
    values
      .filter(Boolean)
      .flatMap((value) => String(value).split(/\s+/))
      .filter(Boolean)
      .map((className) => {
        for (const styles of styleMaps) {
          if (styles && styles[className]) return styles[className];
        }

        return className;
      })
      .join(" ");
