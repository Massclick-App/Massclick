import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
// LeadsCardHistory.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./leadsCards.module.css";
import { useDispatch } from "react-redux";
import { viewOtpUser } from "../../../../redux/actions/otpAction.js";
import { Phone as PhoneIcon, WhatsApp as WhatsAppIcon, Email as EmailIcon, Share as ShareIcon, NotificationsActive as NoteIcon, AccessAlarm as ReminderIcon, StarRate as StarIcon, Verified as VerifiedIcon, Cancel as CancelIcon, ArrowBackIosNew as BackIcon } from "@mui/icons-material";
import ListIcon from '@mui/icons-material/List';
import { Button, Modal, Box, Typography, Chip, IconButton } from "@mui/material";
import CardsSearch from "../../CardsSearch/CardsSearch";
import { updateOtpUser } from "../../../../redux/actions/otpAction.js";
const cx = createScopedClassNames(styles);
const LeadsCardHistory = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const leadsUsers = Array.isArray(location.state?.leadsUsers) ? location.state.leadsUsers : [];
  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedIcons, setExpandedIcons] = useState({});
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const hasSyncedRef = useRef(false);
  const totalLeads = leadsUsers.length;
  const phoneReadyCount = leadsUsers.filter(u => u.mobileNumber1 || u.mobileNumber2).length;
  const emailReadyCount = leadsUsers.filter(u => u.email).length;
  const whatsappReadyCount = phoneReadyCount;
  const filteredLeads = useMemo(() => {
    let data = [...leadsUsers];
    if (searchText.trim()) {
      const value = searchText.toLowerCase();
      data = data.filter(u => {
        const name = (u.userName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const searched = (u.searchedUserText || "").toLowerCase();
        return name.includes(value) || email.includes(value) || searched.includes(value);
      });
    }
    data.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      if (sortBy === "latest") return tb - ta;
      if (sortBy === "oldest") return ta - tb;
      if (sortBy === "name") {
        return (a.userName || "").localeCompare(b.userName || "");
      }
      return 0;
    });
    return data;
  }, [leadsUsers, searchText, sortBy]);
  useEffect(() => {
    const businessMobile = localStorage.getItem("mobileNumber");
    if (!businessMobile) return;
    if (!leadsUsers.length) return;
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;
    const syncLeads = async () => {
      try {
        for (const lead of leadsUsers) {
          const payload = {
            leadsData: {
              userName: lead.userName || "",
              mobileNumber1: lead.mobileNumber1 || "",
              mobileNumber2: lead.mobileNumber2 || "",
              email: lead.email || "",
              searchedUserText: lead.searchedUserText || "",
              time: lead.time || ""
            }
          };
          try {
            await dispatch(updateOtpUser(businessMobile, payload));
          } catch (err) {
            console.error("Error saving single lead:", lead, err);
          }
        }
      } catch (err) {
        console.error("Error syncing leads:", err);
      }
    };
    syncLeads();
  }, [leadsUsers, dispatch]);
  useEffect(() => {
    const mobile = localStorage.getItem("mobileNumber");
    if (mobile) {
      dispatch(viewOtpUser(mobile));
    }
  }, [dispatch]);
  const handleOpenModal = (type, user) => {
    setModalType(type);
    setSelectedUser(user);
    setOpenModal(true);
  };
  const handleCloseModal = () => {
    setModalType("");
    setSelectedUser(null);
    setOpenModal(false);
  };
  const toggleIcons = id => {
    setExpandedIcons(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const renderModalContent = () => {
    if (!selectedUser) return null;
    const rawPhone = selectedUser.mobileNumber1 || selectedUser.mobileNumber2 || "";
    const phone = rawPhone.replace(/\s+/g, "");
    const email = selectedUser.email || "";
    switch (modalType) {
      case "phone":
        return <>
            <Typography variant="h6" className={cx("mh-title")}>
              Call User
            </Typography>
            <Typography sx={{
            mt: 2
          }} className={cx("mh-body")}>
              {phone || "No number available"}
            </Typography>
            {phone && <Button variant="contained" color="success" href={`tel:${phone}`} sx={{
            mt: 3
          }}>
                Call Now
              </Button>}
          </>;
      case "email":
        return <>
            <Typography variant="h6" className={cx("mh-title")}>
              Email
            </Typography>
            <Typography sx={{
            mt: 2
          }} className={cx("mh-body")}>
              {email || "No email available"}
            </Typography>
            <Chip className={cx("mh-chip")} icon={email ? <VerifiedIcon /> : <CancelIcon />} label={email ? "Email Available" : "No Email"} color={email ? "success" : "error"} />
          </>;
      case "whatsapp":
        return <>
            <Typography variant="h6" className={cx("mh-title")}>
              WhatsApp
            </Typography>
            <Typography sx={{
            mt: 2
          }} className={cx("mh-body")}>
              {phone || "No number available"}
            </Typography>
            {phone && <Button variant="contained" color="success" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" sx={{
            mt: 3
          }}>
                Open WhatsApp
              </Button>}
          </>;
      default:
        return null;
    }
  };
  return <>
      <div className={cx("lh-search-shell")}>
        <CardsSearch />
      </div>

      <main className={cx("lh-container")}>
        <section className={cx("lh-content-card")}>
          <header className={cx("lh-header")}>
            <div>
              <h2>Leads (Users who searched your category)</h2>
              <p className={cx("lh-header-sub")}>
                Reach out to users who have shown interest in your business – call,
                WhatsApp, or email directly from here.
              </p>
            </div>
            <div className={cx("lh-header-meta")}>
              <div className={cx("lh-count")}>
                Showing <strong>{filteredLeads.length}</strong> of{" "}
                <strong>{totalLeads}</strong> leads
              </div>
              <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
                Back
              </Button>
            </div>
          </header>

          <div className={cx("lh-summary-row")}>
            <div className={cx("lh-summary-card primary")}>
              <div className={cx("lh-summary-label")}>Total Leads</div>
              <div className={cx("lh-summary-value")}>{totalLeads}</div>
              <div className={cx("lh-summary-chip")}>All captured users</div>
            </div>

            <div className={cx("lh-summary-card")}>
              <div className={cx("lh-summary-label")}>Phone Ready</div>
              <div className={cx("lh-summary-value")}>{phoneReadyCount}</div>
              <div className={cx("lh-summary-chip")}>Have at least one phone</div>
            </div>

            <div className={cx("lh-summary-card")}>
              <div className={cx("lh-summary-label")}>WhatsApp Ready</div>
              <div className={cx("lh-summary-value")}>{whatsappReadyCount}</div>
              <div className={cx("lh-summary-chip")}>Reach via WhatsApp</div>
            </div>

            <div className={cx("lh-summary-card")}>
              <div className={cx("lh-summary-label")}>Email Available</div>
              <div className={cx("lh-summary-value")}>{emailReadyCount}</div>
              <div className={cx("lh-summary-chip")}>Can send email</div>
            </div>
          </div>

          <div className={cx("lh-controls-row")}>
            <div className={cx("lh-controls-left")}>
              <input className={cx("lh-search-input")} placeholder="Search lead by name or email..." value={searchText} onChange={e => setSearchText(e.target.value)} aria-label="Search leads" />
            </div>
            
            <div className={cx("lh-controls-right")}>
              <label className={cx("lh-sort-label")}>
                Sort by:
                <select className={cx("lh-sort-select")} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="latest">Latest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
          </div>

          {filteredLeads.length === 0 ? <div className={cx("lh-empty")}>
              <p>No leads match your current filters.</p>
            </div> : <div className={cx("lh-grid")}>
              {filteredLeads.map((user, index) => {
            const id = user.mobileNumber1 || user.email || user.userName || index;
            const hasPhone = !!(user.mobileNumber1 || user.mobileNumber2);
            const hasEmail = !!user.email;
            const hasWhatsApp = hasPhone;
            const displayPhone = user.mobileNumber1 || user.mobileNumber2 || "No phone";
            const formattedTime = (() => {
              if (!user?.time) return null;
              const d = new Date(user.time);
              return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
            })();
            return <article className={cx("lh-card")} key={id}>
                    <div className={cx("lh-card-head")}>
                      <div className={cx("lh-card-left")}>
                        <div className={cx("lh-avatar-pill")} aria-hidden>
                          {(user.userName || "U").trim().charAt(0).toUpperCase()}
                        </div>

                        <div className={cx("lh-card-texts")}>
                          <div className={cx("lh-card-title")}>
                            {user.userName || "Unknown User"}
                          </div>
                          <div className={cx("lh-card-meta")}>
                            {formattedTime && <span className={cx("lh-date")} title={user.time}>
                                {formattedTime}
                              </span>}
                            <span className={cx("lh-dot")}>•</span>
                            <span>{user.email || "No email"}</span>
                            <span className={cx("lh-location")}> — {displayPhone}</span>
                          </div>
                        </div>
                      </div>

                      <div className={cx("lh-card-icons")}>
                        {!expandedIcons[id] && <IconButton className={cx("icon-btn menu")} onClick={() => toggleIcons(id)} aria-label="Open actions">
                            <ListIcon />
                          </IconButton>}

                        {expandedIcons[id] && <>
                            <IconButton className={cx("icon-btn menu")} onClick={() => toggleIcons(id)} aria-label="Close actions">
                              <ListIcon />
                            </IconButton>

                            <IconButton className={cx("icon-btn call")} onClick={() => handleOpenModal("phone", user)} aria-label="Call user">
                              <PhoneIcon />
                            </IconButton>

                            <IconButton className={cx("icon-btn whatsapp")} onClick={() => handleOpenModal("whatsapp", user)} aria-label="WhatsApp user">
                              <WhatsAppIcon />
                            </IconButton>

                            <IconButton className={cx("icon-btn mail")} onClick={() => handleOpenModal("email", user)} aria-label="Email user">
                              <EmailIcon />
                            </IconButton>

                            <IconButton className={cx("icon-btn share")} onClick={() => navigator.share ? navigator.share({
                      title: user.userName || "Lead",
                      text: `${user.userName || ""} - ${user.email || ""}`,
                      url: window.location.href
                    }) : alert("Sharing not supported")} aria-label="Share lead">
                              <ShareIcon />
                            </IconButton>
                          </>}
                      </div>
                    </div>

                    <div className={cx("lh-divider")} />

                    <div className={cx("lh-card-body")}>
                      <p className={cx("lh-match")}>
                        {user.searchedUserText ? `This user searched for: "${user.searchedUserText}"` : "This user recently searched for businesses in your category. Reach out to convert this interest into a customer."}
                      </p>

                      <div className={cx("lh-pill-row")}>
                        <span className={cx(`lh-pill ${hasPhone ? "ok" : "muted"}`)}>Phone</span>
                        <span className={cx(`lh-pill ${hasWhatsApp ? "ok" : "muted"}`)}>WhatsApp</span>
                        <span className={cx(`lh-pill ${hasEmail ? "ok" : "muted"}`)}>Email</span>
                      </div>
                    </div>

                    <div className={cx("lh-card-actions")}>
                      <Button startIcon={<NoteIcon />} variant="outlined">Add Note</Button>
                      <Button startIcon={<ReminderIcon />} variant="outlined">Reminder</Button>
                      <Button variant="contained" startIcon={<StarIcon />}>Ask Rating</Button>
                    </div>
                  </article>;
          })}
            </div>}
        </section>
      </main>

      <Modal open={openModal} onClose={handleCloseModal}>
        <Box className={cx("lh-modal")}>{renderModalContent()}</Box>
      </Modal>
    </>;
};
export default LeadsCardHistory;
