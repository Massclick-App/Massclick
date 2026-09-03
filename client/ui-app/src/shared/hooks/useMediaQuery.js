import { useEffect, useState } from "react";

const readMediaQuery = (query, defaultMatches) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(query).matches
    : defaultMatches;

const useMediaQuery = (query, defaultMatches = false) => {
  const [matches, setMatches] = useState(() =>
    readMediaQuery(query, defaultMatches)
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event) => setMatches(event.matches);

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
};

export default useMediaQuery;
