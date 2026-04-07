// Profile.js
import React, { useEffect } from "react";
import "./profile.css";

import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded"; // User ID
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded"; // Date Joined
import GpsFixedRoundedIcon from "@mui/icons-material/GpsFixedRounded"; // Role ID
import HomeRoundedIcon from "@mui/icons-material/HomeRounded"; // Full Address;
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded"; // Last Login
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";

import { getAllUsers } from "../../../redux/actions/userAction";
import { useDispatch, useSelector } from "react-redux";

export default function Profile() {
  const authUser = useSelector((state) => state.auth.user);
  const authLoading = useSelector((state) => state.auth.loading);
  const dispatch = useDispatch();

  const { users = [], loading: userLoading } =
    useSelector((state) => state.userReducer || {}) || {};

  useEffect(() => {
    dispatch(getAllUsers());
  }, [dispatch]);

  const currentAuthId =
    authUser?.userId || authUser?._id || authUser?._id?.$oid;

  const fullProfile =
    users.find((u) => {
      const listUserId = u._id?.$oid || u._id || u.userId;
      return listUserId === currentAuthId;
    }) || null;

  const user = fullProfile || authUser;
  const loading = authLoading || userLoading;

  const profileImageUrl = user?.userProfile
    ? user.userProfile
    : "https://via.placeholder.com/150/007bff/ffffff?text=U";

  if (loading) {
    return <div className="loading">Loading profile…</div>;
  }

  if (!user) {
    return (
      <div className="profilePage">
        <div className="profileCard">
          <h1 className="title">User Profile</h1>
          <p className="noData">Please log in to view your profile details.</p>
        </div>
      </div>
    );
  }

  // Basic fields
  const {
    userName,
    contact,
    role,
    businessLocation,
    businessCategory,
    emailId,
    roleId,
    createdAt,
  } = user;

  const userIdDisplay = currentAuthId || "N/A";

  const dateJoined = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  const fullAddress =
    user.address?.full ||
    `${user.addressLine1 || ""} ${user.city || ""} ${user.state || ""} ${
      user.zipCode || ""
    }`
      .trim()
      .replace(/\s+/g, " ") || "No full address available";

  // New: last login (we try a couple of common fields)
  const rawLastLogin = user.lastLogin || user.lastLoginAt || user.updatedAt;
  const lastLogin = rawLastLogin
    ? new Date(rawLastLogin).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not available";

  // New: profile completeness (simple heuristic)
  const fieldsForCompletion = [
    userName,
    emailId,
    contact,
    role,
    businessLocation,
    businessCategory,
    fullAddress !== "No full address available" ? fullAddress : "",
  ];
  const filledFields = fieldsForCompletion.filter(
    (val) => val && val !== "N/A"
  ).length;
  let profileCompletion = Math.round(
    (filledFields / fieldsForCompletion.length) * 100
  );
  if (Number.isNaN(profileCompletion)) profileCompletion = 0;
  if (profileCompletion < 0) profileCompletion = 0;
  if (profileCompletion > 100) profileCompletion = 100;

  // New: preferences (fallbacks)
  const languagePreference = user.language || "English (Default)";
  const timezonePreference = user.timezone || "System Default";

  const today = new Date().toLocaleDateString();

  const handleEditProfile = () => {
    // You can replace this with navigation or dialog open
    // e.g., navigate("/profile/edit");
    console.log("Edit profile clicked");
  };

  return (
    <div className="profilePage">
      <div className="profileCard">
        {/* Top header layout */}
        <div className="profileHeaderLayout">
          <div className="headerMain">
            <div className="header">
              <img
                src={profileImageUrl}
                alt={`${userName || ""} Profile`}
                className="avatar"
              />
              <div className="headerTextBlock">
                <h1 className="userName">{userName || "N/A"}</h1>
                <span className="roleTag">
                  <BadgeRoundedIcon
                    sx={{ fontSize: "1.1rem", marginRight: "4px" }}
                  />
                  {role || "N/A"}
                </span>

                <div className="headerMetaRow">
                  {businessLocation && (
                    <div className="headerMetaItem">
                      <LocationOnRoundedIcon className="metaIcon" />
                      <span>{businessLocation}</span>
                    </div>
                  )}
                  {businessCategory && (
                    <div className="headerMetaItem">
                      <BusinessCenterRoundedIcon className="metaIcon" />
                      <span>{businessCategory}</span>
                    </div>
                  )}
                  {dateJoined !== "N/A" && (
                    <div className="headerMetaItem">
                      <CalendarMonthRoundedIcon className="metaIcon" />
                      <span>Member since {dateJoined}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="headerSide">
            <button
              type="button"
              className="primaryButton"
              onClick={handleEditProfile}
            >
              Edit Profile
            </button>

            <div className="profileCompletionBlock">
              <div className="completionHeader">
                <span className="completionLabel">Profile completeness</span>
                <span className="completionPercent">
                  {profileCompletion}%
                </span>
              </div>
              <div className="completionBar">
                <div
                  className="completionBarFill"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
              <p className="completionHint">
                Add missing contact, business and address details to reach 100%.
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="quickStatsStrip">
          <div className="quickStatCard">
            <VpnKeyRoundedIcon className="quickStatIcon" />
            <div className="quickStatText">
              <span className="quickStatLabel">System User ID</span>
              <span className="quickStatValue">{userIdDisplay}</span>
            </div>
          </div>

          <div className="quickStatCard">
            <AccessTimeRoundedIcon className="quickStatIcon" />
            <div className="quickStatText">
              <span className="quickStatLabel">Last Login</span>
              <span className="quickStatValue">{lastLogin}</span>
            </div>
          </div>

          <div className="quickStatCard">
            <PublicRoundedIcon className="quickStatIcon" />
            <div className="quickStatText">
              <span className="quickStatLabel">Primary Location</span>
              <span className="quickStatValue">
                {businessLocation || "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Main content sections */}
        <div className="mainContentLayout">
          <div className="section">
            <h2 className="sectionTitle">Personal Contact</h2>
            <div className="detailsGrid">
              <div className="detailItem">
                <EmailRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Email Address</span>
                  <span className="detailValue">{emailId || "N/A"}</span>
                </div>
              </div>
              <div className="detailItem">
                <PhoneRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Primary Contact No.</span>
                  <span className="detailValue">{contact || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="sectionTitle">Business Information</h2>
            <div className="detailsGrid">
              <div className="detailItem">
                <BusinessCenterRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Business Category</span>
                  <span className="detailValue">
                    {businessCategory || "N/A"}
                  </span>
                </div>
              </div>
              <div className="detailItem">
                <LocationOnRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Primary Location</span>
                  <span className="detailValue">
                    {businessLocation || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="section">
            <h2 className="sectionTitle">System &amp; Admin</h2>
            <div className="detailsGrid">
              <div className="detailItem">
                <VpnKeyRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">System User ID</span>
                  <span className="detailValue">{userIdDisplay}</span>
                </div>
              </div>
              <div className="detailItem">
                <CalendarMonthRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Date Joined</span>
                  <span className="detailValue">{dateJoined}</span>
                </div>
              </div>
              <div className="detailItem">
                <GpsFixedRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Role ID</span>
                  <span className="detailValue">{roleId || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* New: Preferences & Settings */}
          <div className="section">
            <h2 className="sectionTitle">Preferences &amp; Locale</h2>
            <div className="detailsGrid">
              <div className="detailItem">
                <LanguageRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Language</span>
                  <span className="detailValue">{languagePreference}</span>
                </div>
              </div>
              <div className="detailItem">
                <PublicRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Time Zone</span>
                  <span className="detailValue">{timezonePreference}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="section full-section-span">
            <h2 className="sectionTitle">Full Registered Address</h2>
            <div className="detailsGrid">
              <div className="detailItem">
                <HomeRoundedIcon className="icon" />
                <div className="detailContent">
                  <span className="detailLabel">Complete Address</span>
                  <span className="detailValue">{fullAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="footerNote">Profile data displayed as of {today}.</p>
    </div>
  );
}
