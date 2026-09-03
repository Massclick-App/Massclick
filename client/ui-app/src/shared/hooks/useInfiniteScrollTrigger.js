import { useCallback, useRef } from "react";

// Fires `onLoadMore` whenever the returned sentinel ref scrolls into view,
// as long as `hasMore` is true and nothing is already loading. Unlike
// useRenderNearViewport.js (which disconnects its observer after firing
// once — it only ever needs to reveal a section a single time), this one
// keeps observing indefinitely so it can fire again each time more items
// are appended and a new sentinel position appears further down the page.
//
// Returns a CALLBACK ref, not a plain useRef — deliberately. The sentinel
// element this is meant for is typically only rendered while `hasMore` is
// true, so it can unmount and later remount with a brand new DOM node (e.g.
// a new search resets pagination and `hasMore` becomes true again). A plain
// useRef + one-time useEffect only attaches an observer to whichever node
// existed on that first effect run; if the node is later replaced, infinite
// scroll would silently stop working because the old observer is watching a
// detached element. A callback ref is invoked by React on every mount AND
// unmount of the node it's attached to, so the observer is torn down and
// recreated against whatever is actually in the DOM right now.
//
// `onLoadMore`/`hasMore`/`loading` are read via a ref updated every render
// rather than being callback dependencies, so the observer itself is only
// ever recreated when the DOM node changes or `rootMargin` changes — not on
// every state update from the fetch this hook triggers.
const useInfiniteScrollTrigger = ({ onLoadMore, hasMore, loading, rootMargin = "400px 0px" } = {}) => {
  const observerRef = useRef(null);
  const latest = useRef({ onLoadMore, hasMore, loading });
  latest.current = { onLoadMore, hasMore, loading };

  const sentinelRef = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node || typeof IntersectionObserver !== "function") {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          const { onLoadMore: loadMore, hasMore: more, loading: busy } = latest.current;
          if (entry?.isIntersecting && more && !busy) {
            loadMore();
          }
        },
        { rootMargin },
      );

      observer.observe(node);
      observerRef.current = observer;
    },
    [rootMargin],
  );

  return sentinelRef;
};

export default useInfiniteScrollTrigger;
