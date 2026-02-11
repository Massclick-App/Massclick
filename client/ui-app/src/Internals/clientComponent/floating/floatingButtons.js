import { Box, Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const FloatingButtons = ({ onRequireLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);

  const HIDE_ON_ROUTES = ["/admin", "/dashboard"];

  const shouldHide = HIDE_ON_ROUTES.some((path) =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (shouldHide) return;

    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 220);
    return () => clearTimeout(timer);
  }, [location.pathname, shouldHide]);

  if (shouldHide) return null;

  const handleAdvertiseClick = () => {
    const authToken = localStorage.getItem("authToken");

    if (authToken) {
      navigate("/advertise");
    } else {
      onRequireLogin();
    }
  };


  return (
    <Box
      sx={{
        position: "fixed",

        right: visible ? { md: 0, lg: 8 } : -80,

        top: "50%",
        transform: "translateY(-50%)",

        zIndex: 3000,

        display: { xs: "none", sm: "none", md: "flex" },

        flexDirection: "column",
        gap: 1.5,

        transition: "right 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Box
        onClick={handleAdvertiseClick}
        sx={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          bgcolor: "#ff5722",
          color: "#ffffff",
          px: 1.8,
          py: 2.4,
          fontSize: "0.85rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          cursor: "pointer",
          userSelect: "none",
          borderRadius: "10px 0 0 10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
          transition: "all 0.25s ease",
          "&:hover": {
            bgcolor: "#e64a19",
            transform: "rotate(180deg) translateX(-2px)",
            boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
          },
        }}
      >
        <Typography
          sx={{
            fontSize: "inherit",
            fontWeight: "inherit",
          }}
        >
          Advertise
        </Typography>
      </Box>

      <Box
        onClick={() => navigate("/customercare")}
        sx={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          bgcolor: "#06155d",
          color: "#ffffff",
          px: 1.8,
          py: 2.4,
          fontSize: "0.8rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          cursor: "pointer",
          userSelect: "none",
          borderRadius: "10px 0 0 10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          transition: "all 0.25s ease",
          "&:hover": {
            bgcolor: "#0b1f85",
            transform: "rotate(180deg) translateX(-2px)",
            boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
          },
        }}
      >
        <Typography
          sx={{
            fontSize: "inherit",
            fontWeight: "inherit",
          }}
        >
          Help & Support
        </Typography>
      </Box>
    </Box>
  );
};

export default FloatingButtons;
