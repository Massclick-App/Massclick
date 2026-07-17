import { useEffect, useRef, useState } from "react";

const useRenderNearViewport = (rootMargin = "600px 0px") => {
  const targetRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) {
      return undefined;
    }

    if (typeof IntersectionObserver !== "function") {
      setShouldRender(true);
      return undefined;
    }

    const target = targetRef.current;
    if (!target) {
      setShouldRender(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return { targetRef, shouldRender };
};

export default useRenderNearViewport;
