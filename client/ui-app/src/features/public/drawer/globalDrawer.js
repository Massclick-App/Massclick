import React, { useEffect, useState } from "react";
import {
  SwipeableDrawer,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useDrawer } from "features/public/drawer/drawerContext.js";
import {
  getVisibleUserMenuItems,
  getUserMenuLabel,
  isBusinessPeopleUser,
} from "features/public/drawer/userMenuConfig.js";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { styled } from "@mui/material/styles";
import { fetchRewardWallet } from "shared/services/rewardService.js";
import { userLogout } from "state/actions/otpAction.js";

const formatUiName = (name) => {
  if (!name) return "";
  return name
    .replace(/^User\s+/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
};

const DrawerContainer = styled("div")(({ theme }) => ({
  width: "100%",
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)",
  boxShadow: "-24px 0 70px rgba(15, 23, 42, 0.18)",
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  padding: "28px 20px 20px 20px",
  display: "flex",
  alignItems: "center",
  gap: "15px",
  background: "white",
  position: "sticky",
  top: 0,
  zIndex: 10,
  boxShadow: "0px 4px 24px rgba(0,0,0,0.06)",
}));

const NameText = styled(Typography)(({ theme }) => ({
  fontSize: "1.1rem",
  fontWeight: 700,
  color: "#333",
}));

const EmailText = styled(Typography)(({ theme }) => ({
  fontSize: "0.85rem",
  color: "#777",
}));

const PointsCard = styled(Box)(() => ({
  margin: "14px 16px 8px",
  padding: "14px 16px",
  borderRadius: "16px",
  color: "#ffffff",
  background: "linear-gradient(135deg, #0b2347 0%, #173b67 100%)",
  boxShadow: "0 10px 24px rgba(11, 35, 71, 0.16)",
  cursor: "pointer",
  transition: "transform 160ms ease, box-shadow 160ms ease",
  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 13px 28px rgba(11, 35, 71, 0.22)",
  },
}));

export default function GlobalDrawer() {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userName = authUser?.userName || "Guest User";
  const userEmail = authUser?.email || "No Email";

  const currentUser = authUser;
  const customerKey =
    localStorage.getItem("mobileNumber") ||
    currentUser?.mobileNumber1 ||
    currentUser?.mobile ||
    currentUser?.contact ||
    currentUser?._id ||
    "";
  const [rewardWallet, setRewardWallet] = useState(null);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const visibleMenuItems = getVisibleUserMenuItems(currentUser);

  useEffect(() => {
    if (!isDrawerOpen || !customerKey) return undefined;

    let active = true;
    setRewardsLoading(true);
    fetchRewardWallet(customerKey)
      .then((wallet) => {
        if (active) setRewardWallet(wallet);
      })
      .catch(() => {
        if (active) setRewardWallet(null);
      })
      .finally(() => {
        if (active) setRewardsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [customerKey, isDrawerOpen]);

  const handleLogout = () => {
    dispatch(userLogout());

    closeDrawer();
    navigate("/");
    window.dispatchEvent(new Event("authChange"));
  };

  const handleItemClick = (item) => {
    if (item.isLogout) {
      handleLogout();
      return;
    }
    closeDrawer();
    if (item.path) navigate(item.path);
  };

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpen}
      onClose={closeDrawer}
      onOpen={() => {}}
      disableSwipeToOpen
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 20,
        "& .MuiBackdrop-root": {
          backgroundColor: "rgba(15, 23, 42, 0.52)",
          backdropFilter: "blur(2px)",
        },
      }}
      PaperProps={{
        sx: {
          width: { xs: "min(88vw, 360px)", sm: 360, md: 384 },
          maxWidth: "100vw",
          height: "100dvh",
          top: 0,
          borderRadius: { xs: "18px 0 0 18px", sm: "22px 0 0 22px" },
          overflow: "hidden",
          backgroundColor: "transparent",
          boxShadow: "none",
        },
      }}
    >
      <DrawerContainer>
        <HeaderBox
          onClick={() => {
            closeDrawer();
            navigate("/");
          }}
          sx={{ cursor: "pointer" }}
        >
          <Avatar
            src={currentUser?.profileImage || undefined}
            sx={{
              width: 58,
              height: 58,
              bgcolor: "#F7941D",
              fontSize: "1.4rem",
              fontWeight: 700,
              objectFit: "cover",
            }}
          >
            {!currentUser?.profileImage && userName.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <NameText>{userName}</NameText>
            <EmailText>{userEmail}</EmailText>
            <Typography
              sx={{
                fontSize: "0.82rem",
                color: "#F7941D",
                fontWeight: 600,
                cursor: "pointer",
                mt: 0.5,
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
              onClick={(event) => {
                event.stopPropagation();
                closeDrawer();
                navigate("/user_edit-profile");
              }}
            >
              {isBusinessPeopleUser(currentUser)
                ? "View Business"
                : "View Profile"}
            </Typography>
          </Box>
          <CloseIcon
            onClick={(event) => {
              event.stopPropagation();
              closeDrawer();
            }}
            sx={{
              marginLeft: "auto",
              cursor: "pointer",
              color: "#555",
              "&:hover": { color: "#000" },
            }}
          />
        </HeaderBox>
        <Divider />
        {customerKey && (
          <PointsCard
            role="button"
            tabIndex={0}
            aria-label="Open my rewards wallet"
            onClick={() => {
              closeDrawer();
              navigate("/user_rewards");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                closeDrawer();
                navigate("/user_rewards");
              }
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "12px",
                  color: "#ff9d2e",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <StarsRoundedIcon />
              </Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography sx={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.72)", fontWeight: 600 }}>
                  AVAILABLE POINTS
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}>
                  <Typography sx={{ fontSize: "1.45rem", lineHeight: 1.2, fontWeight: 800 }}>
                    {rewardsLoading
                      ? "—"
                      : Number(rewardWallet?.availablePoints || 0).toLocaleString("en-IN")}
                  </Typography>
                  <Typography sx={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.76)" }}>
                    {rewardWallet?.tier || "Starter"} member
                  </Typography>
                </Box>
              </Box>
              <ArrowForwardRoundedIcon sx={{ color: "#ff9d2e" }} />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1.1, pt: 1.1, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
              <Typography sx={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.72)" }}>
                Lifetime earned
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700 }}>
                {rewardsLoading
                  ? "—"
                  : Number(rewardWallet?.lifetimeEarned || 0).toLocaleString("en-IN")} points
              </Typography>
            </Box>
          </PointsCard>
        )}
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          <List sx={{ padding: "10px 0" }}>
            {visibleMenuItems.map((item, index) => (
              <ListItem
                key={index}
                onClick={() => handleItemClick(item)}
                sx={{
                  mx: 1.5,
                  my: 0.5,
                  borderRadius: "12px",
                  transition: "0.2s",
                  "&:hover": {
                    backgroundColor: "rgba(247, 148, 29, 0.12)",
                    transform: "translateX(-4px)",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "#F7941D",
                    minWidth: 40,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={formatUiName(getUserMenuLabel(item, currentUser))}
                  primaryTypographyProps={{
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "#333",
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box
          sx={{
            textAlign: "center",
            py: 2,
            fontSize: "0.75rem",
            color: "#aaa",
          }}
        >
          © {new Date().getFullYear()} MassClick™
        </Box>
      </DrawerContainer>
    </SwipeableDrawer>
  );
}
