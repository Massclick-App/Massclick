import React, { useState } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import { ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MenuContent from "./MenuContent.js";
import s from "./DashboardSidebar.module.css";

export default function SideMenu() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const width = collapsed ? 64 : 240;
  return (
    <Drawer
      variant="permanent"
      sx={{
        display: { xs: "none", md: "block" },
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          border: 0,
          background: "linear-gradient(150deg,#102e51,#0c2444 55%,#16395d)",
          color: "#fff",
          overflow: "hidden",
        },
      }}
    >
      <div className={s.sidebar}>
        <div className={s.brand}>
          <img src="/apple-touch-icon.png" alt="MassClick" />
          {!collapsed && (
            <div>
              <strong>
                <span>Mass</span>Click
              </strong>
              <small>Local Business, Global Growth</small>
            </div>
          )}
          <button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flex: 1,
          }}
        >
          <MenuContent railCollapsed={collapsed} />
        </Box>
        {!collapsed && (
          <div className={s.sidebarBottom}>
            <div className={s.help}>
              <Headphones size={23} />
              <div>
                <strong>Need Help?</strong>
                <p>
                  Check our documentation
                  <br />
                  or contact support.
                </p>
              </div>
              <button onClick={() => navigate("/dashboard/customer-care")}>
                Visit Help Center
              </button>
            </div>
            <div className={s.footer}>
              <img src="/apple-touch-icon.png" alt="" />
              <strong>MassClick</strong>
              <small>v2.0.0</small>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

