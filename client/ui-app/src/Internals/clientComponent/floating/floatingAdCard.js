import { Box, Typography, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FloatingAdCard = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);

  const HIDE_ON = ["/admin", "/dashboard"];

  const shouldHide = HIDE_ON.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (shouldHide) return;

    timerRef.current = setTimeout(() => {
      setOpen(true);
    }, 2000);

    return () => clearTimeout(timerRef.current);
  }, [location.pathname, shouldHide]);

  const handleClose = () => {
    clearTimeout(timerRef.current);
    setOpen(false);
  };

  if (shouldHide || !open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 20, md: 28 },
        bottom: { xs: 12, sm: 20, md: 28 },

        width: { xs: "94vw", sm: 340, md: 360, lg: 380 },
        maxWidth: 420,

        display: "flex",
        overflow: "hidden",

        bgcolor: "#06155d",
        color: "#ffffff",

        borderRadius: 3,
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",

        zIndex: (theme) => theme.zIndex.modal + 5,

        transform: "translateZ(0)", 

        animation: "fadeSlideUp 0.4s ease-out",

        "@keyframes fadeSlideUp": {
          from: { transform: "translateY(40px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
      }}
    >
      <Box sx={{ width: 6, bgcolor: "#ff5722" }} />

      <Box
        sx={{
          p: { xs: 2, sm: 2.5, md: 3 },
          position: "relative",
          flex: 1,
        }}
      >
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 44,
            height: 44,
            color: "#ffffff",
            backgroundColor: "rgba(255,255,255,0.08)",

            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.2)",
            },

            "&:active": {
              transform: "scale(0.92)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        <Typography
          sx={{
            fontSize: { xs: "0.75rem", sm: "0.8rem" },
            opacity: 0.85,
            letterSpacing: "0.06em",
          }}
        >
          CONNECT WITH
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: "1.3rem", sm: "1.5rem", md: "1.6rem" },
            fontWeight: 700,
            mt: 0.5,
          }}
        >
          50,000+ Buyers
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: "0.85rem", sm: "0.9rem" },
            mt: 1,
            mb: 2.5,
            lineHeight: 1.6,
            opacity: 0.9,
          }}
        >
          Grow your business globally in just 3 simple steps with Massclick
        </Typography>

        <Button
          fullWidth
          onClick={() => navigate("/business-enquiry")}
          sx={{
            bgcolor: "#ff5722",
            color: "#fff",
            fontWeight: 700,
            py: 1.2,
            borderRadius: "999px",
            textTransform: "none",

            "&:hover": {
              bgcolor: "#e64a19",
            },

            "&:active": {
              transform: "scale(0.97)",
            },
          }}
        >
          List your Business for FREE
        </Button>
      </Box>
    </Box>
  );
};

export default FloatingAdCard;
