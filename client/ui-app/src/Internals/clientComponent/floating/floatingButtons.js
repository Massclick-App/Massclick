import { Box } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const FloatingButtons = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);

  const HIDE_ON_ROUTES = ["/admin", "/dashboard"];

  const shouldHide = HIDE_ON_ROUTES.some(path =>
    location.pathname.startsWith(path)
  );

  useEffect(() => {
    if (shouldHide) return;

    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 250);
    return () => clearTimeout(timer);
  }, [location.pathname, shouldHide]);

  if (shouldHide) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        right: visible ? 0 : -70,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 3000,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        gap: 1,
        transition: "right 0.35s ease-in-out",
      }}
    >
      <Box
        sx={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          bgcolor: "#ff5722",
          color: "#fff",
          px: 1.5,
          py: 2,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: "8px 0 0 8px",
          boxShadow: 3,
          "&:hover": { bgcolor: "#e64a19" },
        }}
        onClick={() => navigate("/advertise")}
      >
        Advertise
      </Box>

      <Box
        sx={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          bgcolor: "#06155d",
          color: "#fff",
          px: 1.5,
          py: 2,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: "8px 0 0 8px",
          boxShadow: 3,
          "&:hover": { bgcolor: "#115293" },
        }}
        onClick={() => navigate("/customercare")}
      >
        Help & Support
      </Box>
    </Box>
  );
};

export default FloatingButtons;
