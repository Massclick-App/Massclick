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
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useTheme, useMediaQuery } from "@mui/material";
import { getHomePopupEventAd } from "../../../redux/actions/eventAction";

const SHOW_DELAY_MS = 1000;
const HIDE_ON = ["/admin", "/dashboard"];

const BRAND_ORANGE = "#ff7a00";
const BRAND_ORANGE_DARK = "#e65f00";
const BRAND_NAVY = "#06155d";
const SURFACE_DARK = "#0b1020";
const DESKTOP_POPUP_IMAGE = { width: 800, height: 600 };
const MOBILE_POPUP_IMAGE = { width: 480, height: 640 };

const getSeenKey = (adId) => `popup_seen_${adId}`;

let confettiModule = null;
const fireConfetti = async () => {
  try {
    if (!confettiModule) {
      confettiModule = (await import("canvas-confetti")).default;
    }

    const fire = (particleRatio, opts) =>
      confettiModule({
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });

    fire(0.25, { spread: 26, startVelocity: 55, origin: { y: 0.6 } });
    fire(0.2, { spread: 60, origin: { y: 0.6 } });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, origin: { y: 0.6 } });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
      origin: { y: 0.6 },
    });
    fire(0.1, { spread: 120, startVelocity: 45, origin: { y: 0.6 } });
  } catch (_) {
    // Confetti is decorative, so the popup should still work if it fails.
  }
};

const CloseBtn = ({ onClick }) => (
  <IconButton
    onClick={onClick}
    size="small"
    aria-label="Close advertisement"
    sx={{
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 30,
      bgcolor: "rgba(15,23,42,0.78)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.24)",
      color: "#fff",
      width: 36,
      height: 36,
      boxShadow: "0 10px 26px rgba(0,0,0,0.28)",
      transition: "background-color 0.18s ease, transform 0.18s ease",
      "&:hover": {
        bgcolor: "rgba(15,23,42,0.92)",
        transform: "scale(1.04)",
      },
    }}
  >
    <CloseIcon sx={{ fontSize: 18 }} />
  </IconButton>
);

const CountdownPill = ({ countdown, totalDuration }) => {
  if (totalDuration <= 0 || countdown <= 0) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.65,
        borderRadius: "8px",
        bgcolor: "rgba(255,255,255,0.92)",
        color: BRAND_NAVY,
        boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box
        sx={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          bgcolor: BRAND_ORANGE,
        }}
      />
      <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1 }}>
        {countdown}s
      </Typography>
    </Box>
  );
};

const SponsoredBadge = () => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      alignSelf: "flex-start",
      px: 1,
      py: 0.45,
      borderRadius: "6px",
      bgcolor: "rgba(255,122,0,0.14)",
      color: BRAND_ORANGE,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}
  >
    Sponsored
  </Box>
);

const AdProgress = ({ progress, placement = "absolute" }) => (
  <LinearProgress
    variant="determinate"
    value={progress}
    sx={{
      position: placement,
      bottom: placement === "absolute" ? 0 : "auto",
      left: 0,
      right: 0,
      height: 4,
      zIndex: 20,
      bgcolor: "rgba(255,255,255,0.18)",
      "& .MuiLinearProgress-bar": {
        background: `linear-gradient(90deg, ${BRAND_ORANGE}, #ffb15f)`,
        transition: "transform 1s linear",
      },
    }}
  />
);

const AdCta = ({ href, onClose, compact = false }) => {
  if (!href) return null;

  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      endIcon={<OpenInNewIcon sx={{ fontSize: compact ? 15 : 17 }} />}
      sx={{
        minWidth: compact ? 106 : 124,
        borderRadius: "8px",
        px: compact ? 1.4 : 2,
        py: compact ? 0.85 : 1,
        bgcolor: BRAND_ORANGE,
        color: "#fff",
        fontSize: compact ? 12 : 13,
        fontWeight: 800,
        lineHeight: 1,
        textTransform: "none",
        boxShadow: "0 10px 24px rgba(255,122,0,0.32)",
        whiteSpace: "nowrap",
        "&:hover": {
          bgcolor: BRAND_ORANGE_DARK,
          boxShadow: "0 12px 28px rgba(230,95,0,0.36)",
        },
      }}
    >
      View offer
    </Button>
  );
};

const getAdImageDimensions = (ad, desktop) => {
  if (!desktop && ad.mobileBannerImage) {
    return MOBILE_POPUP_IMAGE;
  }

  return DESKTOP_POPUP_IMAGE;
};

const AdImage = ({ ad, imageSrc, onClose, desktop = false }) => {
  const { width, height } = getAdImageDimensions(ad, desktop);
  const maxViewportHeight = desktop ? "68vh" : "58vh";

  return (
    <Box
      component={ad.redirectUrl ? "a" : "div"}
      href={ad.redirectUrl || undefined}
      target={ad.redirectUrl ? "_blank" : undefined}
      rel={ad.redirectUrl ? "noopener noreferrer" : undefined}
      onClick={ad.redirectUrl ? onClose : undefined}
      sx={{
        display: "grid",
        placeItems: "center",
        cursor: ad.redirectUrl ? "pointer" : "default",
        lineHeight: 0,
        bgcolor: SURFACE_DARK,
        overflow: "hidden",
        textDecoration: "none",
        minHeight: desktop ? 280 : 220,
        px: desktop ? 0 : 1.5,
        pb: desktop ? 0 : 1.5,
      }}
    >
      <Box
        sx={{
          width: `min(100%, calc(${maxViewportHeight} * ${width} / ${height}))`,
          aspectRatio: `${width} / ${height}`,
          overflow: "hidden",
          display: "block",
        }}
      >
        <Box
          component="img"
          src={imageSrc}
          alt={ad.title || "Advertisement"}
          width={width}
          height={height}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sx={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
          }}
        />
      </Box>
    </Box>
  );
};

const AdFooter = ({ ad, onClose, compact = false }) => {
  if (!ad.title && !ad.redirectUrl) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        p: compact ? 1.5 : 2,
        bgcolor: "#fff",
        borderTop: "1px solid rgba(15,23,42,0.08)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          minWidth: 0,
        }}
      >
        <SponsoredBadge />
        {ad.title && (
          <Typography
            sx={{
              color: "#101828",
              fontSize: compact ? 15 : 17,
              fontWeight: 800,
              lineHeight: 1.25,
              wordBreak: "break-word",
            }}
          >
            {ad.title}
          </Typography>
        )}
      </Box>
      <AdCta href={ad.redirectUrl} onClose={onClose} compact={compact} />
    </Box>
  );
};

const DesktopPopup = ({
  open,
  onClose,
  ad,
  progress,
  countdown,
  totalDuration,
}) => {
  const imageSrc = ad.bannerImage;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ timeout: 280 }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(6px)",
          bgcolor: "rgba(2,6,23,0.58)",
        },
        "& .MuiDialog-paper": {
          width: "min(620px, calc(100vw - 32px))",
          maxWidth: 620,
          m: 2,
          p: 0,
          borderRadius: "8px",
          overflow: "hidden",
          background: "#fff",
          boxShadow:
            "0 32px 90px rgba(2,6,23,0.42), 0 0 0 1px rgba(255,255,255,0.24)",
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: "relative", overflow: "hidden" }}>
        <CloseBtn onClick={onClose} />
        <CountdownPill countdown={countdown} totalDuration={totalDuration} />
        <AdImage ad={ad} imageSrc={imageSrc} onClose={onClose} desktop />
        <AdFooter ad={ad} onClose={onClose} />
        {totalDuration > 0 && <AdProgress progress={progress} />}
      </DialogContent>
    </Dialog>
  );
};

const MobileBottomSheet = ({
  open,
  onClose,
  ad,
  progress,
  countdown,
  totalDuration,
}) => {
  const imageSrc = ad.mobileBannerImage || ad.bannerImage;

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: false }}
      sx={{
        "& .MuiBackdrop-root": {
          backdropFilter: "blur(4px)",
          bgcolor: "rgba(2,6,23,0.58)",
        },
        "& .MuiDrawer-paper": {
          width: "100%",
          maxHeight: "88vh",
          overflow: "hidden",
          borderRadius: "8px 8px 0 0",
          background: "#fff",
          boxShadow: "0 -18px 60px rgba(2,6,23,0.34)",
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          pt: 1.5,
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 4,
            mx: "auto",
            mb: 1.25,
            borderRadius: 2,
            bgcolor: "rgba(15,23,42,0.18)",
          }}
        />
        <CloseBtn onClick={onClose} />
        <CountdownPill countdown={countdown} totalDuration={totalDuration} />
      </Box>

      <AdImage ad={ad} imageSrc={imageSrc} onClose={onClose} />
      <AdFooter ad={ad} onClose={onClose} compact />

      {totalDuration > 0 && <AdProgress progress={progress} placement="relative" />}
    </Drawer>
  );
};

const HomePopupAd = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { homePopupAd, homePopupAdLoading } = useSelector(
    (state) => state.event?.eventAdvertisement || {}
  );

  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const isHomeRoute = location.pathname === "/";
  const shouldHide = HIDE_ON.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isHomeRoute) dispatch(getHomePopupEventAd());
  }, [dispatch, isHomeRoute]);

  useEffect(() => {
    if (!isHomeRoute || shouldHide || !homePopupAd || homePopupAdLoading) return;

    const seenKey = getSeenKey(homePopupAd._id);
    if (sessionStorage.getItem(seenKey)) return;

    timerRef.current = setTimeout(() => {
      sessionStorage.setItem(seenKey, "1");
      const dur = homePopupAd.displayDuration || 0;
      setTotalDuration(dur);
      setCountdown(dur);
      setOpen(true);
      if (homePopupAd.showConfetti) fireConfetti();
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [isHomeRoute, shouldHide, homePopupAd, homePopupAdLoading]);

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

  return isMobile ? (
    <MobileBottomSheet {...sharedProps} />
  ) : (
    <DesktopPopup {...sharedProps} />
  );
};

export default HomePopupAd;
