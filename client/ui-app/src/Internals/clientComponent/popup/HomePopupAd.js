import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme, useMediaQuery } from "@mui/material";
import { getHomePopupAd } from "../../../redux/actions/advertisementAction";

const SHOW_DELAY_MS = 1000;
const HIDE_ON = ["/admin", "/dashboard"];

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const getSeenKey = (adId) => `popup_seen_${adId}_${getTodayKey()}`;

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

  useEffect(() => {
    if (isHomeRoute) {
      dispatch(getHomePopupAd());
    }
  }, [dispatch, isHomeRoute]);

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

  const handleClose = () => {
    clearTimeout(timerRef.current);
    clearInterval(countdownRef.current);
    setOpen(false);
  };

  if (!homePopupAd || !open) return null;

  const imageSrc =
    isMobile && homePopupAd.mobileBannerImage
      ? homePopupAd.mobileBannerImage
      : homePopupAd.bannerImage;

  const progress =
    totalDuration > 0
      ? ((totalDuration - countdown) / totalDuration) * 100
      : 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          overflow: "hidden",
          p: 0,
          m: { xs: 2, sm: 3 },
        },
      }}
    >
      {totalDuration > 0 && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 4,
            bgcolor: "rgba(0,0,0,0.08)",
            "& .MuiLinearProgress-bar": { bgcolor: "#ff5722" },
          }}
        />
      )}

      <DialogContent sx={{ p: 0, position: "relative" }}>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "#fff",
            zIndex: 10,
            gap: 0.5,
            "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
          }}
        >
          <CloseIcon fontSize="small" />
          {totalDuration > 0 && countdown > 0 && (
            <Box component="span" sx={{ fontSize: 11, lineHeight: 1 }}>
              {countdown}
            </Box>
          )}
        </IconButton>

        <Box
          component={homePopupAd.redirectUrl ? "a" : "div"}
          href={homePopupAd.redirectUrl || undefined}
          target={homePopupAd.redirectUrl ? "_blank" : undefined}
          rel={homePopupAd.redirectUrl ? "noopener noreferrer" : undefined}
          sx={{
            display: "block",
            cursor: homePopupAd.redirectUrl ? "pointer" : "default",
            lineHeight: 0,
          }}
        >
          <Box
            component="img"
            src={imageSrc}
            alt={homePopupAd.title || "Advertisement"}
            sx={{
              width: "100%",
              height: "auto",
              display: "block",
              maxHeight: { xs: "80vh", sm: "70vh" },
              objectFit: "contain",
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default HomePopupAd;
