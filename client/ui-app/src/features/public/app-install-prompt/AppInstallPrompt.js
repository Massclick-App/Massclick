import React, { useEffect, useState } from "react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/public/app-install-prompt/AppInstallPrompt.module.css";

const cx = createScopedClassNames(styles);

const PACKAGE_ID = "com.massclick.massclick";
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PACKAGE_ID}`;
const DISMISS_KEY = "massclick:android-install-prompt-dismissed-until";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const getNow = () => Date.now();

const readDismissedUntil = () => {
  try {
    return Number(window.localStorage.getItem(DISMISS_KEY) || 0);
  } catch {
    return 0;
  }
};

const snoozePrompt = (durationMs) => {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(getNow() + durationMs));
  } catch {
    // Storage can be unavailable in private browsing; the prompt still works.
  }
};

const isAndroidMobileBrowser = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const isAndroid = /Android/i.test(navigator.userAgent || "");
  const isMobileWidth = window.matchMedia?.("(max-width: 768px)")?.matches;
  const isTouch = Number(navigator.maxTouchPoints || 0) > 0;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    Boolean(window.navigator.standalone);

  return isAndroid && isTouch && isMobileWidth && !isStandalone;
};

const hasRelatedNativeAppInstalled = async () => {
  if (typeof navigator === "undefined" || typeof navigator.getInstalledRelatedApps !== "function") {
    return false;
  }

  try {
    const apps = await navigator.getInstalledRelatedApps();
    return apps.some((app) => app?.platform === "play" && app?.id === PACKAGE_ID);
  } catch {
    return false;
  }
};

const AppInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const showPromptSheet = async (event = null) => {
      if (!isAndroidMobileBrowser()) return;
      if (readDismissedUntil() > getNow()) return;
      if (await hasRelatedNativeAppInstalled()) return;

      timerId = window.setTimeout(() => {
        if (cancelled) return;
        setInstallPromptEvent(event);
        setVisible(true);
      }, 1200);
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      showPromptSheet(event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    showPromptSheet();

    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    snoozePrompt(WEEK_MS);
    setVisible(false);
  };

  const handleInstall = () => {
    snoozePrompt(MONTH_MS);
    const promptEvent = installPromptEvent;
    setVisible(false);

    if (promptEvent && typeof promptEvent.prompt === "function") {
      promptEvent.prompt();
      setInstallPromptEvent(null);
      return;
    }

    window.location.href = PLAY_STORE_URL;
  };

  return (
    <section
      className={cx("installSheet")}
      role="dialog"
      aria-modal="false"
      aria-labelledby="massclick-install-title"
    >
      <div className={cx("installGrabber")} aria-hidden="true" />

      <div className={cx("installContent")}>
        <img
          className={cx("installIcon")}
          src="/favicon-32x32.png"
          alt=""
          width="48"
          height="48"
          decoding="async"
        />
        <div className={cx("installCopy")}>
          <h2 id="massclick-install-title">Get the Massclick app</h2>
          <p>Open listings, leads, and marketing tools faster from your phone.</p>
        </div>
      </div>

      <div className={cx("installActions")}>
        <button type="button" className={cx("installSecondary")} onClick={handleDismiss}>
          Not now
        </button>
        <button type="button" className={cx("installPrimary")} onClick={handleInstall}>
          Install app
        </button>
      </div>
    </section>
  );
};

export default AppInstallPrompt;
