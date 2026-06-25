import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography, Box, Paper, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import CloseIcon from "@mui/icons-material/Close";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import CategoryIcon from "@mui/icons-material/Category";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachEmailIcon from "@mui/icons-material/AttachEmail";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { fetchMatchedLeads } from "../../../redux/actions/leadsAction";
import styles from "./leadsNotification.module.css";
import { updateSearchLogRead } from "../../../redux/actions/businessListAction";
import { getCurrentLeadViewer, getDisplayableLeadNotifications, getLeadUser, hasValue } from "./leadNotificationUtils";
const cx = createScopedClassNames(styles);
const LeadsNotificationModal = ({
  open,
  onClose
}) => {
  const dispatch = useDispatch();
  const [selectedLead, setSelectedLead] = useState(null);
  const [readItems, setReadItems] = useState([]);
  const {
    leads: leadsData,
    loading
  } = useSelector(state => state.leads);
  const displayLeads = getDisplayableLeadNotifications(leadsData, getCurrentLeadViewer());
  useEffect(() => {
    if (open) {
      dispatch(fetchMatchedLeads());
    }
  }, [open, dispatch]);
  const timeAgo = time => {
    if (!time) return "";
    const now = new Date();
    const diff = (now - new Date(time)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
    return new Date(time).toLocaleDateString();
  };
  const handleRead = async lead => {
    const user = getLeadUser(lead);
    const normalizedLead = {
      ...lead,
      ...user
    };
    setSelectedLead(normalizedLead);
    setReadItems(prev => [...prev, lead._id]);
    dispatch(updateSearchLogRead(lead._id));
  };
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{
    style: {
      borderRadius: 22,
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0px 15px 45px rgba(0,0,0,0.15)"
    }
  }}>
      <DialogTitle sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      px: 3,
      py: 2,
      borderBottom: "2px solid #ffe5c4",
      background: "linear-gradient(90deg, #fff, #fff7ef)"
    }}>
        <Box sx={{
        fontWeight: 800,
        color: "#F7941D",
        display: "flex",
        alignItems: "center",
        gap: 1,
        fontSize: 18
      }}>
          <NotificationsActiveIcon sx={{
          color: "#F7941D"
        }} />
          Notifications
        </Box>

        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{
      p: 0
    }}>
        {loading ? <Box sx={{
        p: 4,
        textAlign: "center"
      }}>
            <CircularProgress />
          </Box> : !selectedLead ? <ul className={cx("ln-modern-list")}>
            {displayLeads.length === 0 ? <Typography sx={{
          p: 3,
          textAlign: "center",
          color: "#999"
        }}>
                No notifications found
              </Typography> : displayLeads.map(lead => {
          const user = getLeadUser(lead);
          const isRead = lead.isRead === true || readItems.includes(lead._id);
          return <li key={lead._id} className={cx(`ln-modern-item ${isRead ? "read" : "unread"}`)} onClick={() => handleRead(lead)}>
                    <div className={cx("ln-modern-avatar")}>
                      {user.userName.charAt(0).toUpperCase()}
                    </div>

                    <div className={cx("ln-modern-body")}>
                      <span className={cx("ln-modern-title")}>
                        <strong>{user.userName}</strong> searched{" "}
                        <strong>"{lead.searchedUserText}"</strong>
                      </span>

                      <span className={cx("ln-modern-time")}>
                        {timeAgo(lead.createdAt)}
                      </span>
                    </div>

                    {!isRead && <div className={cx("ln-modern-dot")} />}
                  </li>;
        })}
          </ul> : <Box sx={{
        p: 3
      }}>
            <Paper elevation={4} sx={{
          borderRadius: 4,
          p: 2,
          boxShadow: "0 5px 15px rgba(247,148,29,0.25)"
        }}>
              <Box sx={{
            background: "#fff7ef",
            p: 2,
            borderRadius: 3,
            mb: 2,
            display: "flex",
            justifyContent: "space-between"
          }}>
                <Box>
                  <Typography fontWeight={700} fontSize={18} color="#F7941D">
                    {selectedLead.userName}
                  </Typography>
                  <Typography fontSize={13} color="#e97700">
                    Lead ID: {selectedLead._id}
                  </Typography>
                </Box>
                <Typography sx={{
              cursor: "pointer",
              color: "#666"
            }} onClick={() => setSelectedLead(null)}>
                  Hide
                </Typography>
              </Box>
              <Box sx={{
            p: 2
          }}>
                {hasValue(selectedLead.mobileNumber1) && <Box className={cx("ln-row")}>
                  <PhoneIphoneIcon sx={{
                color: "#F7941D"
              }} />
                  <strong>Mobile:</strong>&nbsp;
                  {selectedLead.mobileNumber1}
                </Box>}
                {hasValue(selectedLead.email) && <Box className={cx("ln-row")}>
                  <AttachEmailIcon sx={{
                color: "#F7941D"
              }} />
                  <strong>Email:</strong>&nbsp;
                  {selectedLead.email}
                </Box>}
                {hasValue(selectedLead.categoryName) && <Box className={cx("ln-row")}>
                  <CategoryIcon sx={{
                color: "#F7941D"
              }} />
                  <strong>Category:</strong>&nbsp;
                  {selectedLead.categoryName}
                </Box>}
                {hasValue(selectedLead.searchedUserText) && <Box className={cx("ln-row")}>
                  <CategoryIcon sx={{
                color: "#F7941D"
              }} />
                  <strong>Searched:</strong>&nbsp;
                  {selectedLead.searchedUserText}
                </Box>}
                {hasValue(selectedLead.location) && <Box className={cx("ln-row")}>
                  <LocationOnIcon sx={{
                color: "#F7941D"
              }} />
                  <strong>Location:</strong>&nbsp;
                  {selectedLead.location}
                </Box>}
                {hasValue(selectedLead.createdAt) && <Box className={cx("ln-row")}>
                  <AccessTimeIcon sx={{
                color: "#F7941D"
              }} />
                  <strong>Created:</strong>&nbsp;
                  {new Date(selectedLead.createdAt).toLocaleString()}
                </Box>}
              </Box>
            </Paper>
          </Box>}
      </DialogContent>
    </Dialog>;
};
export default LeadsNotificationModal;
