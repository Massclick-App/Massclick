import React, { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  Drawer,
  DialogContent,
  IconButton,
  Box,
  Typography,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTheme, useMediaQuery } from "@mui/material";
import { getHomePopupAd } from "../../../redux/actions/advertisementAction";

const SHOW_DELAY_MS = 1000;
const HIDE_ON = ["/admin", "/dashboard"];

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const getSeenKey = (adId) => `popup_seen_${adId}_${getTodayKey()}`;

/* ── Confetti helper ── */
let confettiModule = null;
const fireConfetti = async () => {
  try {
    if (!confettiModule) {
      confettiModule = (await import("canvas-confetti")).default;
    }
    const fire = (particleRatio, opts) =>
      confettiModule(
        Object.assign({}, opts, {
          particleCount: Math.floor(200 * particleRatio),
        })
      );
    fire(0.25, { spread: 26, startVelocity: 55, origin: { y: 0.6 } });
    fire(0.2,  { spread: 60,                   origin: { y: 0.6 } });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { y: 0.6 } });
    fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, origin: { y: 0.6 } });
    fire(0.1,  { spread: 120, startVelocity: 45, origin: { y: 0.6 } });
  } catch (_) { /* fail silently if canvas-confetti not available */ }
};

/* ── Shared close-button ── */
const CloseBtn = ({ onClick, countdown, totalDuration }) => (
  <IconButton
    onClick={onClick}
    size="small"
    aria-label="Close advertisement"
    sx={{
      position: "absolute",
      top: 10,
      right: 10,
      zIndex: 20,
      bgcolor: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)",
      color: "#fff",
      width: 32,
      height: 32,
      gap: 0.3,
      "&:hover": { bgcolor: "rgba(0,0,0,0.75)", transform: "scale(1.08)" },
      transition: "all 0.18s ease",
    }}
  >
    <CloseIcon sx={{ fontSize: 15 }} />
    {totalDuration > 0 && countdown > 0 && (
      <Box
        component="span"
        sx={{ fontSize: 10, fontWeight: 700, lineHeight: 1, minWidth: 12 }}
      >
        {countdown}
      </Box>
    )}
  </IconButton>
);

/* ── Progress bar ── */
const AdProgress = ({ progress }) => (
  <LinearProgress
    variant="determinate"
    value={progress}
    sx={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      zIndex: 10,
      bgcolor: "rgba(255,255,255,0.25)",
      "& .MuiLinearProgress-bar": {
        bgcolor: "#ff6b35",
        transition: "transform 1s linear",
      },
    }}
  />
);

/* ──────────────────────────────────────────
   DESKTOP – Polished centered Dialog
   ────────────────────────────────────────── */
const DesktopPopup = ({ open, onClose, ad, progress, countdown, totalDuration }) => {
  const imageSrc = ad.bannerImage;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 320 }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(3px)",
          bgcolor: "rgba(0,0,0,0.6)",
        },
        "& .MuiDialog-paper": {
          borderRadius: "20px",
          overflow: "hidden",
          m: { xs: 2, sm: 3 },
          p: 0,
          boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
          background: "#0f0f0f",
          maxWidth: 520,
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: "relative", overflow: "hidden" }}>
        {/* Close + countdown */}
        <CloseBtn onClick={onClose} countdown={countdown} totalDuration={totalDuration} />

        {/* Banner image */}
        <Box
          component={ad.redirectUrl ? "a" : "div"}
          href={ad.redirectUrl || undefined}
          target={ad.redirectUrl ? "_blank" : undefined}
          rel={ad.redirectUrl ? "noopener noreferrer" : undefined}
          onClick={ad.redirectUrl ? onClose : undefined}
          sx={{
            display: "block",
            cursor: ad.redirectUrl ? "pointer" : "default",
            lineHeight: 0,
            position: "relative",
          }}
        >
          <Box
            component="img"
            src={imageSrc}
            alt={ad.title || "Advertisement"}
            sx={{
              width: "100%",
              height: "auto",
              display: "block",
              maxHeight: "72vh",
              objectFit: "cover",
            }}
          />

          {/* Gradient footer with title + CTA */}
          {(ad.title || ad.redirectUrl) && (
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                px: 2.5,
                py: 2,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              {ad.title && (
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    lineHeight: 1.3,
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                    flex: 1,
                  }}
                >
                  {ad.title}
                </Typography>
              )}
              {ad.redirectUrl && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    bgcolor: "#ff6b35",
                    color: "#fff",
                    borderRadius: "8px",
                    px: 1.5,
                    py: 0.6,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(255,107,53,0.45)",
                  }}
                >
                  <OpenInNewIcon sx={{ fontSize: 13 }} />
                  Visit
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Auto-close progress bar */}
        {totalDuration > 0 && <AdProgress progress={progress} />}
      </DialogContent>
    </Dialog>
  );
};

/* ──────────────────────────────────────────
   MOBILE – Bottom sheet Drawer
   ────────────────────────────────────────── */
const MobileBottomSheet = ({ open, onClose, ad, progress, countdown, totalDuration }) => {
  const imageSrc =
    ad.mobileBannerImage || ad.bannerImage;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(2px)",
          bgcolor: "rgba(0,0,0,0.55)",
        },
        "& .MuiDrawer-paper": {
          borderRadius: "20px 20px 0 0",
          overflow: "hidden",
          background: "#0f0f0f",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
          maxHeight: "88vh",
        },
      }}
    >
      {/* Drag handle */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          pt: 1.2,
          pb: 0.5,
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 4,
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.22)",
          }}
        />
        {/* Close button */}
        <CloseBtn onClick={onClose} countdown={countdown} totalDuration={totalDuration} />
      </Box>

      {/* Banner image */}
      <Box
        component={ad.redirectUrl ? "a" : "div"}
        href={ad.redirectUrl || undefined}
        target={ad.redirectUrl ? "_blank" : undefined}
        rel={ad.redirectUrl ? "noopener noreferrer" : undefined}
        onClick={ad.redirectUrl ? onClose : undefined}
        sx={{
          display: "block",
          cursor: ad.redirectUrl ? "pointer" : "default",
          lineHeight: 0,
          position: "relative",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={imageSrc}
          alt={ad.title || "Advertisement"}
          sx={{
            width: "100%",
            height: "auto",
            display: "block",
            maxHeight: "70vh",
            objectFit: "cover",
          }}
        />

        {/* Gradient footer */}
        {(ad.title || ad.redirectUrl) && (
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 55%, transparent 100%)",
              px: 2,
              py: 1.8,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            {ad.title && (
              <Typography
                variant="body1"
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                  lineHeight: 1.3,
                  flex: 1,
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}
              >
                {ad.title}
              </Typography>
            )}
            {ad.redirectUrl && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: "#ff6b35",
                  color: "#fff",
                  borderRadius: "8px",
                  px: 1.5,
                  py: 0.7,
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(255,107,53,0.4)",
                }}
              >
                <OpenInNewIcon sx={{ fontSize: 14 }} />
                Visit
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Auto-close progress bar */}
      {totalDuration > 0 && (
        <Box sx={{ position: "relative", height: 3 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 3,
              bgcolor: "rgba(255,255,255,0.15)",
              "& .MuiLinearProgress-bar": {
                bgcolor: "#ff6b35",
                transition: "transform 1s linear",
              },
            }}
          />
        </Box>
      )}
    </Drawer>
  );
};

/* ──────────────────────────────────────────
   ROOT COMPONENT
   ────────────────────────────────────────── */
const HomePopupAd = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { homePopupAd, homePopupAdLoading } = useSelector(
    (state) => state.advertisement || {}
  );

  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const isHomeRoute = location.pathname === "/";
  const shouldHide = HIDE_ON.some((p) => location.pathname.startsWith(p));

  /* Fetch on home route */
  useEffect(() => {
    if (isHomeRoute) dispatch(getHomePopupAd());
  }, [dispatch, isHomeRoute]);

  /* Show logic */
  useEffect(() => {
    if (!isHomeRoute || shouldHide || !homePopupAd || homePopupAdLoading) return;

    const seenKey = getSeenKey(homePopupAd._id);
    if (localStorage.getItem(seenKey)) return;

    timerRef.current = setTimeout(() => {
      localStorage.setItem(seenKey, "1");
      const dur = homePopupAd.displayDuration || 0;
      setTotalDuration(dur);
      setCountdown(dur);
      setOpen(true);
      if (homePopupAd.showConfetti) fireConfetti();
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [isHomeRoute, shouldHide, homePopupAd, homePopupAdLoading]);

  /* Auto-close countdown */
  useEffect(() => {
    if (!open || countdown <= 0) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [open, countdown]);

  const handleClose = useCallback(() => {
    clearTimeout(timerRef.current);
    clearInterval(countdownRef.current);
    setOpen(false);
  }, []);

  if (!homePopupAd || !open) return null;

  const progress =
    totalDuration > 0
      ? ((totalDuration - countdown) / totalDuration) * 100
      : 0;

  const sharedProps = {
    open,
    onClose: handleClose,
    ad: homePopupAd,
    progress,
    countdown,
    totalDuration,
  };

  return isMobile
    ? <MobileBottomSheet {...sharedProps} />
    : <DesktopPopup {...sharedProps} />;
};

export default HomePopupAd;
