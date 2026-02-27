import React, { useEffect } from "react";
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
import { useDrawer } from "./drawerContext";
import { userMenuItems } from "../categoryBar.js";
import { useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { viewAllOtpUsers } from "../../../redux/actions/otpAction";


const DrawerContainer = styled("div")(({ theme }) => ({
  width: "100%",
  maxWidth: 340,
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)",
  boxShadow: "0 0 40px rgba(0,0,0,0.1)",
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

export default function GlobalDrawer() {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const navigate = useNavigate();
  const dispatch = useDispatch();


  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userName = authUser?.userName || "Guest User";
  const userEmail = authUser?.email || "No Email";

  const otpState = useSelector((state) => state.otp || {});
  const allUsers = Array.isArray(otpState.viewAllResponse)
    ? otpState.viewAllResponse
    : [];

  const mobileNumber = localStorage.getItem("mobileNumber");

  const UserDetail =
    allUsers.find((u) => u.mobileNumber1 === mobileNumber) || {};

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("mobileNumber");
    localStorage.removeItem("authUser");

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

  useEffect(() => {
    dispatch(viewAllOtpUsers());
  }, [dispatch]);

  return (
    <SwipeableDrawer
      anchor="right"
      open={isDrawerOpen}
      onClose={closeDrawer}
      onOpen={() => { }}
      PaperProps={{
        sx: {
          width: { xs: "80%", sm: 320 },
          borderRadius: "20px 0 0 20px",
          overflow: "hidden",
          backdropFilter: "blur(10px)",
        },
      }}
    >
      <DrawerContainer>
        <HeaderBox
          onClick={() => {
            closeDrawer();
            navigate("/");
          }}

          sx={{ cursor: "pointer" }}>
          <Avatar
            src={UserDetail?.profileImage || undefined}
            sx={{
              width: 58,
              height: 58,
              bgcolor: "#F7941D",
              fontSize: "1.4rem",
              fontWeight: 700,
              objectFit: "cover"
            }}
          >
            {!UserDetail?.profileImage && userName.charAt(0).toUpperCase()}
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
              onClick={() => {
                closeDrawer();
                navigate("/user_edit-profile");
              }}
            >
              View Profile
            </Typography>
          </Box>
          <CloseIcon
            onClick={closeDrawer}
            sx={{
              marginLeft: "auto",
              cursor: "pointer",
              color: "#555",
              "&:hover": { color: "#000" },
            }}
          />
        </HeaderBox>
        <Divider />
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          <List sx={{ padding: "10px 0" }}>
            {userMenuItems.map((item, index) => (
              <ListItem
                key={index}
                button
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
                  primary={item.name.replace("User ", "")}
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
