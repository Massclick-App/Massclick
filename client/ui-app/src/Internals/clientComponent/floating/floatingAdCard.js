import { Box, Typography, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FloatingAdCard = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const HIDE_ON = ["/admin", "/dashboard"];

  const shouldHide = HIDE_ON.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (shouldHide) return;

    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [location.pathname, shouldHide]);

  if (shouldHide || !open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        right: { xs: 12, sm: 20, md: 28 },
        bottom: { xs: 12, sm: 20, md: 28 },

        width: { xs: "92vw", sm: 340, md: 360, lg: 380 },
        maxWidth: 420,

        display: "flex",
        overflow: "hidden",

        bgcolor: "#06155d",
        color: "#ffffff",

        borderRadius: 4,

        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        zIndex: 3500,

        animation: "fadeSlideUp 0.45s cubic-bezier(0.4, 0, 0.2, 1)",

        "@keyframes fadeSlideUp": {
          from: { transform: "translateY(40px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          width: 6,
          bgcolor: "#ff5722",
        }}
      />

      <Box
        sx={{
          p: { xs: 2, sm: 2.5, md: 3 },
          position: "relative",
          flex: 1,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setOpen(false)}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#ffffff",
            opacity: 0.65,
            "&:hover": {
              opacity: 1,
              bgcolor: "rgba(255,255,255,0.12)",
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
            fontSize: { xs: "1.35rem", sm: "1.5rem", md: "1.65rem" },
            fontWeight: 700,
            mt: 0.5,
            letterSpacing: "-0.02em",
          }}
        >
          50,000+ Buyers
        </Typography>

        <Typography
          sx={{
            fontSize: { xs: "0.85rem", sm: "0.9rem" },
            mt: 1,
            mb: 2.8,
            opacity: 0.9,
            lineHeight: 1.6,
          }}
        >
          Grow your business globally in just 3 simple steps with Massclick
        </Typography>

        <Button
          fullWidth
          onClick={() => navigate("/business-enquiry")}
          sx={{
            bgcolor: "#ff5722",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: { xs: "0.85rem", sm: "0.9rem" },
            py: { xs: 1, sm: 1.25 },
            borderRadius: "999px",
            textTransform: "none",

            boxShadow: "0 8px 22px rgba(0,0,0,0.3)",

            "&:hover": {
              bgcolor: "#e64a19",
              boxShadow: "0 14px 30px rgba(0,0,0,0.4)",
              transform: "translateY(-1px)",
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
