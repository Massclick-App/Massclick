import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  IconButton,
  Button,
  Divider,
  Collapse,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SmartphoneRoundedIcon from "@mui/icons-material/SmartphoneRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";

import { useDispatch, useSelector } from "react-redux";
import {
  getPendingBusinessList,
  editBusinessList
} from "../redux/actions/businessListAction";

export default function NotificationDropdown({ open, handleClose }) {
  const dispatch = useDispatch();

  const {
    pendingBusinessList = [],
    pendingBusinessLoading
  } = useSelector((state) => state.businessListReducer);

  const { users = [] } = useSelector((state) => state.userReducer);
  const [expandedId, setExpandedId] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    if (open) {
      dispatch(getPendingBusinessList());
    }
  }, [open, dispatch]);

  const getUserName = (id) => {
    const user = users.find((u) => u._id === id);
    return user?.userName || "Unknown";
  };

  const handleMakeLive = async (business) => {
    try {
      setLoadingId(business._id);

      await dispatch(
        editBusinessList(business._id, { businessesLive: true })
      );

      setToastMessage(
        `${business.businessName} is now LIVE!\n` +
        `Client ID: ${business.clientId}\n` +
        `Category: ${business.category}\n` +
        `Location: ${business.location}\n` +
        `Created By: ${getUserName(business.createdBy)}`
      );

      setToastOpen(true);
    } catch (error) {
      console.error("Activation failed", error);
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 70,
        right: 20,
        width: { xs: "92%", sm: 380, md: 420 },
        bgcolor: "#fff",
        borderRadius: "20px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          px: 2,
          py: 1.8,
          borderBottom: "1px solid #eee",
        }}
      >
        <Box display="flex" alignItems="center" gap={1.2}>
          <NotificationsActiveRoundedIcon sx={{ color: "#ff6a00" }} />
          <Typography sx={{ fontWeight: 700, color: "#ff6a00" }}>
            Pending Business Activation
          </Typography>
        </Box>
        <IconButton onClick={handleClose}>
          <CloseRoundedIcon />
        </IconButton>
      </Box>

      {pendingBusinessLoading ? (
        <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <List sx={{ maxHeight: "65vh", overflowY: "auto" }}>
          {pendingBusinessList.length === 0 ? (
            <Typography sx={{ textAlign: "center", py: 3, color: "#666" }}>
              No pending businesses
            </Typography>
          ) : (
            pendingBusinessList.map((b) => (
              <Box key={b._id}>
                <ListItemButton
                  onClick={() =>
                    setExpandedId(expandedId === b._id ? null : b._id)
                  }
                  sx={{
                    px: 2,
                    py: 1.6,
                    display: "flex",
                    justifyContent: "space-between",
                    backgroundColor:
                      expandedId === b._id ? "#fff5eb" : "transparent",
                    "&:hover": {
                      backgroundColor: "#fff7f0",
                    },
                  }}
                >
                  <ListItemText
                    primary={<Typography sx={{ fontWeight: 700 }}>{b.businessName}</Typography>}
                    secondary={
                      <Typography sx={{ fontSize: "0.8rem", color: "#777" }}>
                        Client ID: <b>{b.clientId}</b>
                      </Typography>
                    }
                  />
                  <Chip
                    label={expandedId === b._id ? "Hide" : "View"}
                    size="small"
                    sx={{
                      backgroundColor: "#fff2e6",
                      color: "#ff6a00",
                      fontWeight: 600,
                    }}
                  />
                </ListItemButton>

                <Collapse in={expandedId === b._id}>
                  <Box
                    sx={{
                      mx: 2,
                      mt: 1,
                      mb: 2,
                      p: 2,
                      borderRadius: "18px",
                      background:
                        "linear-gradient(135deg, #fffefd, #fff6ec, #ffe4c9)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.07)",
                    }}
                  >
                    <DetailRow icon={<SmartphoneRoundedIcon sx={{ color: "#ff6a00" }} />} label="Mobile" value={b.contact} />
                    <DetailRow icon={<FolderRoundedIcon sx={{ color: "#ff6a00" }} />} label="Category" value={b.category} />
                    <DetailRow icon={<PlaceRoundedIcon sx={{ color: "#ff6a00" }} />} label="Location" value={b.location} />
                    <DetailRow icon={<PersonRoundedIcon sx={{ color: "#ff6a00" }} />} label="Created By" value={getUserName(b.createdBy)} />
                    <DetailRow
                      icon={<AccessTimeRoundedIcon sx={{ color: "#ff6a00" }} />}
                      label="Created At"
                      value={b.createdAt ? new Date(b.createdAt).toLocaleString() : "N/A"}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      disabled={loadingId === b._id}
                      sx={{
                        mt: 2,
                        py: 1,
                        borderRadius: "999px",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        background: "linear-gradient(90deg,#ff8a3c,#ff5a1f)",
                        boxShadow: "0 6px 18px rgba(255,120,40,0.3)",
                        "&:hover": {
                          background: "linear-gradient(90deg,#ff6a00,#e85400)",
                        },
                      }}
                      onClick={() => handleMakeLive(b)}
                    >
                      {loadingId === b._id ? "Activating..." : "Make Live"}
                    </Button>
                  </Box>
                </Collapse>

                <Divider />
              </Box>
            ))
          )}
        </List>
      )}

      <Snackbar
        open={toastOpen}
        autoHideDuration={3000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setToastOpen(false)} severity="success" sx={{ whiteSpace: "pre-line", width: "100%" }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 1.2 }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          backgroundColor: "#fff1e4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mr: 1.2,
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: "0.9rem", color: "#444" }}>
        <b>{label}:</b> {value || "N/A"}
      </Typography>
    </Box>
  );
}
