import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import TelegramIcon from "@mui/icons-material/Telegram";
import FacebookIcon from "@mui/icons-material/Facebook";
import XIcon from "@mui/icons-material/X";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import LinkIcon from "@mui/icons-material/Link";
import IosShareIcon from "@mui/icons-material/IosShare";
import DownloadIcon from "@mui/icons-material/Download";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { createBusinessShareImage } from "features/public/cards/share/businessShareImage.js";
import styles from "features/public/cards/share/businessShareSheet.module.css";

const cx = createScopedClassNames(styles);

// iOS sheet curve; used for both directions so the sheet leaves along the
// same path it arrived (spatial consistency).
const SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
const SHEET_MS = 340;

// Apple's momentum projection (Designing Fluid Interfaces): where a flick
// released at `velocity` px/s would come to rest.
const project = (velocity, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

// Soft resistance when dragging the sheet up past its resting position.
const rubberband = (overshoot, dimension, constant = 0.55) =>
  (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

const isSheetLayout = () =>
  typeof window !== "undefined" && !window.matchMedia?.("(min-width: 720px)")?.matches;

const currentTranslateY = (el) => {
  const t = getComputedStyle(el).transform;
  if (!t || t === "none") return 0;
  const m = t.match(/matrix(3d)?\(([^)]+)\)/);
  if (!m) return 0;
  const v = m[2].split(",").map(Number);
  return m[1] ? v[13] : v[5];
};

const safeFileName = (name = "business") =>
  `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "business"}-massclick.png`;

/**
 * Share sheet for a business listing.
 *
 * Mobile: a bottom sheet that sits above the page's fixed action rail,
 * clears the home-indicator safe area, and can be dragged down to dismiss
 * (1:1 tracking, momentum projection on release). Desktop: a centred dialog.
 * Both offer a generated share image (photo + details + QR) plus direct
 * targets and the native share sheet.
 */
const BusinessShareSheet = ({ open, onClose, share, onNotify }) => {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [image, setImage] = useState({ status: "idle", blob: null, url: "" });
  const sheetRef = useRef(null);
  const closeBtnRef = useRef(null);
  const lastFocusRef = useRef(null);
  const drag = useRef(null);
  const shareRef = useRef(share);
  shareRef.current = share;
  // Parents pass inline callbacks; keep the latest in a ref so effects that
  // lock scroll / move focus don't re-run on every parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const text = `Check out ${share.name}${share.area ? ` in ${share.area}` : ""} on Massclick`;
  const enc = encodeURIComponent;
  const canNativeShare = typeof navigator !== "undefined" && Boolean(navigator.share);

  // mount → next frame make visible (so the enter transition runs); on close
  // play the exit, then unmount.
  useEffect(() => {
    if (open) {
      lastFocusRef.current = document.activeElement;
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    setVisible(false);
    // A drag leaves an inline transform behind, which would pin the sheet in
    // place over the CSS exit; hand the exit to an explicit inline transition.
    const el = sheetRef.current;
    if (el && el.style.transform) {
      if (isSheetLayout() && !prefersReducedMotion()) {
        el.style.transition = `transform ${SHEET_MS}ms ${SHEET_EASE}`;
        el.style.transform = `translate3d(0, ${el.offsetHeight}px, 0)`;
      } else {
        el.style.transition = "";
        el.style.transform = "";
      }
    }
    const t = setTimeout(() => setMounted(false), prefersReducedMotion() ? 200 : SHEET_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useLayoutEffect(() => {
    if (!mounted || !open) return undefined;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(raf);
  }, [mounted, open]);

  // Scroll lock + Escape + focus management while open
  useEffect(() => {
    if (!mounted) return undefined;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    const focusTimer = setTimeout(() => closeBtnRef.current?.focus({ preventScroll: true }), 60);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      clearTimeout(focusTimer);
      lastFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [mounted]);

  // Build the share image once per open
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let objectUrl = "";
    setImage({ status: "loading", blob: null, url: "" });
    createBusinessShareImage(shareRef.current)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setImage({ status: "ready", blob, url: objectUrl });
      })
      .catch(() => { if (!cancelled) setImage({ status: "error", blob: null, url: "" }); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, share.url]);

  // ---------- drag to dismiss (mobile sheet only) ----------
  const setSheetY = (y, animate) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? `transform ${SHEET_MS}ms ${SHEET_EASE}` : "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  };

  const onPointerDown = (e) => {
    if (!isSheetLayout() || prefersReducedMotion() || e.button > 0) return;
    if (e.target.closest?.("button, a")) return; // let the close button click normally
    const el = sheetRef.current;
    if (!el) return;
    // Interruptible: start from wherever the sheet is on screen right now.
    const startY = currentTranslateY(el);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pointerId: e.pointerId, originY: e.clientY - startY, history: [{ y: startY, t: performance.now() }], moved: false };
    setSheetY(startY, false);
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    let y = e.clientY - d.originY;
    if (Math.abs(y) > 6) d.moved = true;
    if (y < 0) y = -rubberband(-y, sheetRef.current.offsetHeight);
    setSheetY(y, false);
    d.history.push({ y, t: performance.now() });
    if (d.history.length > 6) d.history.shift();
  };

  const onPointerUp = (e) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    const el = sheetRef.current;
    if (!el) return;
    const y = currentTranslateY(el);
    const first = d.history[0];
    const last = d.history[d.history.length - 1];
    const dt = Math.max(last.t - first.t, 1);
    const velocity = ((last.y - first.y) / dt) * 1000; // px/s, +down
    const projected = y + project(velocity);
    const height = el.offsetHeight;
    if (d.moved && (projected > height * 0.45 || velocity > 1100)) {
      setSheetY(height, true);
      onClose();
    } else {
      setSheetY(0, true);
    }
  };

  // Clear inline drag styles when (re)opening so CSS drives the enter/exit.
  useEffect(() => {
    if (!visible || !sheetRef.current) return;
    sheetRef.current.style.transition = "";
    sheetRef.current.style.transform = "";
  }, [visible]);

  // ---------- actions ----------
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      onNotify?.("Link copied", "success");
    } catch {
      onNotify?.("Couldn't copy the link", "error");
    }
  }, [share.url, onNotify]);

  const imageFile = () => (image.blob ? new File([image.blob], safeFileName(share.name), { type: "image/png" }) : null);
  const canShareImage = typeof navigator !== "undefined" && image.blob && navigator.canShare?.({ files: [imageFile()] });

  const shareImage = async () => {
    const file = imageFile();
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: share.name, text: `${text}\n${share.url}` });
    } catch (error) {
      if (error?.name !== "AbortError") onNotify?.("Couldn't share the image", "error");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: share.name, text, url: share.url });
    } catch (error) {
      if (error?.name !== "AbortError") onNotify?.("Couldn't open sharing", "error");
    }
  };

  const targets = [
    { id: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon, href: `https://wa.me/?text=${enc(`${text}\n${share.url}`)}` },
    { id: "telegram", label: "Telegram", Icon: TelegramIcon, href: `https://t.me/share/url?url=${enc(share.url)}&text=${enc(text)}` },
    { id: "facebook", label: "Facebook", Icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(share.url)}` },
    { id: "x", label: "X", Icon: XIcon, href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(share.url)}` },
    { id: "linkedin", label: "LinkedIn", Icon: LinkedInIcon, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(share.url)}` },
    { id: "email", label: "Email", Icon: EmailIcon, href: `mailto:?subject=${enc(`${share.name} on Massclick`)}&body=${enc(`${text}\n${share.url}`)}` },
    { id: "sms", label: "Message", Icon: SmsIcon, href: `sms:?&body=${enc(`${text} ${share.url}`)}` },
    { id: "copy", label: "Copy link", Icon: LinkIcon, onClick: copyLink },
    ...(canNativeShare ? [{ id: "more", label: "More", Icon: IosShareIcon, onClick: nativeShare }] : []),
  ];

  if (!mounted) return null;

  return createPortal(
    <div className={cx("share-sheet-root")}>
      <div className={cx("share-sheet-scrim", visible ? "share-sheet-scrim-visible" : "")} onClick={onClose} aria-hidden="true" />
      <section
        ref={sheetRef}
        className={cx("share-sheet", visible ? "share-sheet-visible" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="business-share-sheet-title"
      >
        <div
          className={cx("share-sheet-drag")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className={cx("share-sheet-grabber")} aria-hidden="true" />
          <div className={cx("share-sheet-header")}>
            <h2 id="business-share-sheet-title" className={cx("share-sheet-title")}>Share</h2>
            <button ref={closeBtnRef} type="button" className={cx("share-sheet-close")} onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </div>

        <div className={cx("share-sheet-body")}>
          <div className={cx("share-sheet-card")}>
            <div className={cx("share-sheet-preview")}>
              {image.status === "ready" ? (
                <img src={image.url} alt={`Share card for ${share.name}`} className={cx("share-sheet-preview-img")} />
              ) : (
                <div className={cx("share-sheet-preview-placeholder", image.status === "loading" ? "share-sheet-shimmer" : "")}>
                  {image.status === "error" ? "Preview unavailable" : ""}
                </div>
              )}
            </div>
            <div className={cx("share-sheet-card-info")}>
              <p className={cx("share-sheet-name")}>{share.name}</p>
              {(share.category || share.area) && (
                <p className={cx("share-sheet-meta")}>{[share.category, share.area].filter(Boolean).join(" · ")}</p>
              )}
              <div className={cx("share-sheet-image-actions")}>
                {canShareImage && (
                  <button type="button" className={cx("share-sheet-btn share-sheet-btn-primary")} onClick={shareImage}>
                    <IosShareIcon fontSize="small" /> Share image
                  </button>
                )}
                <a
                  className={cx("share-sheet-btn", canShareImage ? "" : "share-sheet-btn-primary", image.status !== "ready" ? "share-sheet-btn-disabled" : "")}
                  href={image.url || undefined}
                  download={safeFileName(share.name)}
                  aria-disabled={image.status !== "ready"}
                  onClick={(e) => { if (image.status !== "ready") e.preventDefault(); }}
                >
                  <DownloadIcon fontSize="small" /> Save image
                </a>
              </div>
            </div>
          </div>

          <ul className={cx("share-sheet-targets")}>
            {targets.map(({ id, label, Icon, href, onClick }) => (
              <li key={id}>
                {href ? (
                  <a className={cx("share-sheet-target")} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                    <span className={cx("share-sheet-target-icon", `share-sheet-target-${id}`)}><Icon /></span>
                    <span className={cx("share-sheet-target-label")}>{label}</span>
                  </a>
                ) : (
                  <button type="button" className={cx("share-sheet-target")} onClick={onClick}>
                    <span className={cx("share-sheet-target-icon", `share-sheet-target-${id}`)}><Icon /></span>
                    <span className={cx("share-sheet-target-label")}>{label}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className={cx("share-sheet-link")}>
            <span className={cx("share-sheet-link-url")}>{share.url.replace(/^https?:\/\//, "")}</span>
            <button type="button" className={cx("share-sheet-link-copy")} onClick={copyLink}>Copy</button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default BusinessShareSheet;
