import { Box, Typography, Button, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const FloatingAdCard = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ❌ Routes where ad should NOT appear
  const HIDE_ON = ["/admin", "/dashboard"];

  const shouldHide = HIDE_ON.some((p) =>
    location.pathname.startsWith(p)
  );

  // ✅ Hook ALWAYS runs
  useEffect(() => {
    if (shouldHide) return;

    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [location.pathname, shouldHide]);

  // ✅ Return AFTER hooks
  if (shouldHide || !open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 320,
        bgcolor: "#0b5ed7",
        color: "#fff",
        borderRadius: 3,
        p: 2,
        zIndex: 3500,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        animation: "slideUp 0.4s ease",
        "@keyframes slideUp": {
          from: { transform: "translateY(40px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
      }}
    >
      {/* Close */}
      <IconButton
        size="small"
        onClick={() => setOpen(false)}
        sx={{ color: "#fff", position: "absolute", top: 6, right: 6 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
        Connect with
      </Typography>

      <Typography variant="h6" fontWeight={700}>
        10000 Buyers
      </Typography>

      <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
        Grow your business in 3 easy steps with Massclick
      </Typography>

      <Button
        fullWidth
        variant="contained"
        sx={{
          bgcolor: "#ffc107",
          color: "#000",
          fontWeight: 700,
          "&:hover": { bgcolor: "#ffb300" },
        }}
        onClick={() => navigate("/free-listing")}
      >
        List your Business for FREE
      </Button>
    </Box>
  );
};

export default FloatingAdCard;
