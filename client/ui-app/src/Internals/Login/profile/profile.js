import { createScopedClassNames } from "../../../utils/createScopedClassNames";
// Profile.js
import React, { useEffect } from "react";
import styles from "./profile.module.css";
import { getPlaceholderImage } from "../../../utils/placeholderImage";
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
const cx = createScopedClassNames(styles);
export default function Profile() {
  const authUser = useSelector(state => state.auth.user);
  const authLoading = useSelector(state => state.auth.loading);
  const dispatch = useDispatch();
  const {
    users = [],
    loading: userLoading
  } = useSelector(state => state.userReducer || {}) || {};
  useEffect(() => {
    dispatch(getAllUsers());
  }, [dispatch]);
  const currentAuthId = authUser?.userId || authUser?._id || authUser?._id?.$oid;
  const fullProfile = users.find(u => {
    const listUserId = u._id?.$oid || u._id || u.userId;
    return listUserId === currentAuthId;
  }) || null;
  const user = fullProfile || authUser;
  const loading = authLoading || userLoading;
  const profileImageUrl = user?.userProfile ? user.userProfile : getPlaceholderImage();
  if (loading) {
    return null;
  }
  if (!user) {
    return <div className={cx("profilePage")}>
        <div className={cx("profileCard")}>
          <h1 className={cx("title")}>User Profile</h1>
          <p className={cx("noData")}>Please log in to view your profile details.</p>
        </div>
      </div>;
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
    createdAt
  } = user;
  const userIdDisplay = currentAuthId || "N/A";
  const dateJoined = createdAt ? new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }) : "N/A";
  const fullAddress = user.address?.full || `${user.addressLine1 || ""} ${user.city || ""} ${user.state || ""} ${user.zipCode || ""}`.trim().replace(/\s+/g, " ") || "No full address available";

  // New: last login (we try a couple of common fields)
  const rawLastLogin = user.lastLogin || user.lastLoginAt || user.updatedAt;
  const lastLogin = rawLastLogin ? new Date(rawLastLogin).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "Not available";

  // New: profile completeness (simple heuristic)
  const fieldsForCompletion = [userName, emailId, contact, role, businessLocation, businessCategory, fullAddress !== "No full address available" ? fullAddress : ""];
  const filledFields = fieldsForCompletion.filter(val => val && val !== "N/A").length;
  let profileCompletion = Math.round(filledFields / fieldsForCompletion.length * 100);
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
  return <div className={cx("profilePage")}>
      <div className={cx("profileCard")}>
        {/* Top header layout */}
        <div className={cx("profileHeaderLayout")}>
          <div className={cx("headerMain")}>
            <div className={cx("header")}>
              <img src={profileImageUrl} alt={`${userName || ""} Profile`} className={cx("avatar")} />
              <div className={cx("headerTextBlock")}>
                <h1 className={cx("userName")}>{userName || "N/A"}</h1>
                <span className={cx("roleTag")}>
                  <BadgeRoundedIcon sx={{
                  fontSize: "1.1rem",
                  marginRight: "4px"
                }} />
                  {role || "N/A"}
                </span>

                <div className={cx("headerMetaRow")}>
                  {businessLocation && <div className={cx("headerMetaItem")}>
                      <LocationOnRoundedIcon className={cx("metaIcon")} />
                      <span>{businessLocation}</span>
                    </div>}
                  {businessCategory && <div className={cx("headerMetaItem")}>
                      <BusinessCenterRoundedIcon className={cx("metaIcon")} />
                      <span>{businessCategory}</span>
                    </div>}
                  {dateJoined !== "N/A" && <div className={cx("headerMetaItem")}>
                      <CalendarMonthRoundedIcon className={cx("metaIcon")} />
                      <span>Member since {dateJoined}</span>
                    </div>}
                </div>
              </div>
            </div>
          </div>

          <div className={cx("headerSide")}>
            <button type="button" className={cx("primaryButton")} onClick={handleEditProfile}>
              Edit Profile
            </button>

            <div className={cx("profileCompletionBlock")}>
              <div className={cx("completionHeader")}>
                <span className={cx("completionLabel")}>Profile completeness</span>
                <span className={cx("completionPercent")}>
                  {profileCompletion}%
                </span>
              </div>
              <div className={cx("completionBar")}>
                <div className={cx("completionBarFill")} style={{
                width: `${profileCompletion}%`
              }} />
              </div>
              <p className={cx("completionHint")}>
                Add missing contact, business and address details to reach 100%.
              </p>
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className={cx("quickStatsStrip")}>
          <div className={cx("quickStatCard")}>
            <VpnKeyRoundedIcon className={cx("quickStatIcon")} />
            <div className={cx("quickStatText")}>
              <span className={cx("quickStatLabel")}>System User ID</span>
              <span className={cx("quickStatValue")}>{userIdDisplay}</span>
            </div>
          </div>

          <div className={cx("quickStatCard")}>
            <AccessTimeRoundedIcon className={cx("quickStatIcon")} />
            <div className={cx("quickStatText")}>
              <span className={cx("quickStatLabel")}>Last Login</span>
              <span className={cx("quickStatValue")}>{lastLogin}</span>
            </div>
          </div>

          <div className={cx("quickStatCard")}>
            <PublicRoundedIcon className={cx("quickStatIcon")} />
            <div className={cx("quickStatText")}>
              <span className={cx("quickStatLabel")}>Primary Location</span>
              <span className={cx("quickStatValue")}>
                {businessLocation || "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Main content sections */}
        <div className={cx("mainContentLayout")}>
          <div className={cx("section")}>
            <h2 className={cx("sectionTitle")}>Personal Contact</h2>
            <div className={cx("detailsGrid")}>
              <div className={cx("detailItem")}>
                <EmailRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Email Address</span>
                  <span className={cx("detailValue")}>{emailId || "N/A"}</span>
                </div>
              </div>
              <div className={cx("detailItem")}>
                <PhoneRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Primary Contact No.</span>
                  <span className={cx("detailValue")}>{contact || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cx("section")}>
            <h2 className={cx("sectionTitle")}>Business Information</h2>
            <div className={cx("detailsGrid")}>
              <div className={cx("detailItem")}>
                <BusinessCenterRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Business Category</span>
                  <span className={cx("detailValue")}>
                    {businessCategory || "N/A"}
                  </span>
                </div>
              </div>
              <div className={cx("detailItem")}>
                <LocationOnRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Primary Location</span>
                  <span className={cx("detailValue")}>
                    {businessLocation || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={cx("section")}>
            <h2 className={cx("sectionTitle")}>System &amp; Admin</h2>
            <div className={cx("detailsGrid")}>
              <div className={cx("detailItem")}>
                <VpnKeyRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>System User ID</span>
                  <span className={cx("detailValue")}>{userIdDisplay}</span>
                </div>
              </div>
              <div className={cx("detailItem")}>
                <CalendarMonthRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Date Joined</span>
                  <span className={cx("detailValue")}>{dateJoined}</span>
                </div>
              </div>
              <div className={cx("detailItem")}>
                <GpsFixedRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Role ID</span>
                  <span className={cx("detailValue")}>{roleId || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* New: Preferences & Settings */}
          <div className={cx("section")}>
            <h2 className={cx("sectionTitle")}>Preferences &amp; Locale</h2>
            <div className={cx("detailsGrid")}>
              <div className={cx("detailItem")}>
                <LanguageRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Language</span>
                  <span className={cx("detailValue")}>{languagePreference}</span>
                </div>
              </div>
              <div className={cx("detailItem")}>
                <PublicRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Time Zone</span>
                  <span className={cx("detailValue")}>{timezonePreference}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={cx("section full-section-span")}>
            <h2 className={cx("sectionTitle")}>Full Registered Address</h2>
            <div className={cx("detailsGrid")}>
              <div className={cx("detailItem")}>
                <HomeRoundedIcon className={cx("icon")} />
                <div className={cx("detailContent")}>
                  <span className={cx("detailLabel")}>Complete Address</span>
                  <span className={cx("detailValue")}>{fullAddress}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className={cx("footerNote")}>Profile data displayed as of {today}.</p>
    </div>;
}
