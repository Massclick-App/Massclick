import React from "react";
import { Button, Avatar, Autocomplete, TextField } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import GooglePlacesInput from "../../../components/GooglePlacesInput/GooglePlacesInput";
import BusinessFormSection from "./BusinessFormSection";
import styles from "../business.module.css";
import { getAllUsersClient } from "../../../redux/actions/userClientAction";

const cx = createScopedClassNames(styles);

const BusinessFormStep0 = ({
  formData,
  fieldErrors,
  preview,
  getInputClassName,
  renderFieldError,
  handleChange,
  handlePlaceSelect,
  handleGeoCoordinateChange,
  handleImageChange,
  handleBusinessChange,
  handleOpeningHourChange,
  formDataBusinessDetails,
  QUILL_MODULES,
  QUILL_FORMATS,
  QuillEditor,
  location,
  locationSuggestions,
  showLocationSuggest,
  setFormData,
  setShowLocationSuggest,
  setLocationSuggestions,
  searchSuggestion,
  userClient,
  showSuggestions,
  setShowSuggestions,
  dispatch,
  getUserClientSuggestion,
  activeSection,
  handleSectionAdvance,
  getSectionNavigation,
  getSectionRefKey,
  getSectionIsDisabled,
}) => {
  const [clientSearchInput, setClientSearchInput] = React.useState("");

  console.log("🔄 BusinessFormStep0 rendered:", {
    clientId: formData.clientId,
    clientSearchInput,
    searchSuggestionLength: searchSuggestion?.length,
    userClientLength: userClient?.length
  });

  React.useEffect(() => {
    // Load all clients when component mounts
    if (dispatch) {
      console.log("📥 useEffect: Loading all clients");
      dispatch(getAllUsersClient());
    }
  }, [dispatch]);

  const handleClientSearch = (event, value) => {
    console.log("🔍 handleClientSearch called with value:", value);
    console.log("   searchSuggestion:", searchSuggestion);
    console.log("   userClient length:", userClient?.length);
    setClientSearchInput(value);

    // Only search if input is not empty and is a partial search (doesn't contain " — " which is the full label format)
    if (value && value.trim().length > 0 && !value.includes(" — ") && dispatch) {
      console.log("   → Dispatching getUserClientSuggestion");
      dispatch(getUserClientSuggestion(value));
    } else if (value && value.includes(" — ")) {
      console.log("   → Skipped search (full label detected, this is post-selection)");
    }
  };

  // Get all available options - merge search results with user clients to avoid losing searched clients
  const allOptions = React.useMemo(() => {
    if (clientSearchInput && searchSuggestion?.length > 0) {
      // When searching, show search results
      console.log("📋 Using searchSuggestion results");
      return searchSuggestion;
    }
    // When not searching, show all clients AND keep any previously searched clients in the list
    const mergedClients = [...(userClient || [])];
    if (searchSuggestion?.length > 0) {
      // Add search results that aren't already in userClient list
      searchSuggestion.forEach(searched => {
        if (!mergedClients.find(u => u.clientId === searched.clientId)) {
          mergedClients.push(searched);
        }
      });
      console.log("📋 Merged search results with userClient");
    }
    console.log("📋 Using merged userClient list");
    return mergedClients;
  }, [clientSearchInput, searchSuggestion, userClient]);

  console.log("📋 allOptions computed:", {
    clientSearchInput,
    hasSuggestion: !!searchSuggestion?.length,
    optionsLength: allOptions?.length,
    allOptions: allOptions?.map(c => ({ id: c.clientId, name: c.name }))
  });

  // Find the selected client object from all available options
  const getSelectedClient = () => {
    const selected = formData.clientId ? allOptions.find((c) => c.clientId === formData.clientId) : null;
    console.log("🎯 getSelectedClient:", {
      formDataClientId: formData.clientId,
      foundClient: selected ? { id: selected.clientId, name: selected.name } : null,
      allOptionsLength: allOptions?.length
    });
    if (!formData.clientId) return null;
    return allOptions.find((c) => c.clientId === formData.clientId) || null;
  };

  const sections = [
    { key: "clientBusiness", title: "Client & Business Information", subtitle: "Basic details about your business" },
    { key: "address", title: "Address Details", subtitle: "Business location information" },
    { key: "contact", title: "Contact Information", subtitle: "How customers can reach you" },
    { key: "businessInfo", title: "Business Information", subtitle: "Additional business details" },
    { key: "locationWeb", title: "Location & Web Presence", subtitle: "Map and website links" },
    { key: "socialMedia", title: "Social Media", subtitle: "Connect your social profiles" },
    { key: "bannerDetails", title: "Business Banner & Details", subtitle: "Upload banner image and describe your business" },
    { key: "openingHours", title: "Opening Hours", subtitle: "Set business hours for each day" },
    { key: "badgesVisibility", title: "Badges & Visibility", subtitle: "Control how this listing is highlighted" },
  ];

  const renderSectionIntro = (eyebrow, summary, stat) => (
    <div className={cx("section-intro") }>
      <div className={cx("section-intro-copy") }>
        <p className={cx("section-eyebrow")}>{eyebrow}</p>
        <p className={cx("section-summary")}>{summary}</p>
      </div>
      {stat && <div className={cx("section-stat")}>{stat}</div>}
    </div>
  );

  const fieldClass = (...extra) => cx("form-input-group", "field-card", ...extra);

  const renderClientBusiness = () => (
    <>
      {renderSectionIntro(
        "Business identity",
        "Start with the account owner and the business name. Keeping these aligned makes reviews and future edits much easier.",
        "2 core fields"
      )}

      <div className={cx("section-grid", "section-grid-wide-left")}>
        <div className={fieldClass("field-span-7")}>
          <label htmlFor="clientId" className={cx("input-label")}>Client ID</label>
          <Autocomplete
            options={allOptions}
            getOptionLabel={(option) => `${option.clientId} — ${option.name}`}
            value={getSelectedClient()}
            onChange={(event, newValue) => {
              console.log("✅ Autocomplete onChange:", {
                newValue: newValue ? { id: newValue.clientId, name: newValue.name } : null,
                currentFormDataClientId: formData.clientId
              });
              setFormData((prev) => {
                const updated = {
                  ...prev,
                  clientId: newValue ? newValue.clientId : ""
                };
                console.log("   → Updated formData:", { clientId: updated.clientId });
                return updated;
              });
              console.log("   → Clearing search input");
              setClientSearchInput("");
            }}
            onInputChange={handleClientSearch}
            inputValue={clientSearchInput}
            isOptionEqualToValue={(option, value) => option.clientId === value.clientId}
            freeSolo={false}
            disableClearable={false}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search and select a client"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    padding: "6px !important",
                    borderRadius: "6px",
                    fontSize: "14px",
                  },
                }}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  maxHeight: "300px",
                  borderRadius: "6px",
                  border: "1px solid #e5e5e5",
                },
              },
            }}
          />
          {renderFieldError("clientId")}
        </div>

        <div className={fieldClass("field-span-5")}>
          <label htmlFor="businessName" className={cx("input-label")}>Business Name</label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            className={getInputClassName("text-input", "businessName")}
            value={formData.businessName}
            onChange={handleChange}
          />
          {renderFieldError("businessName")}
        </div>
      </div>
    </>
  );

  const renderAddress = () => (
    <>
      {renderSectionIntro(
        "Address capture",
        "Use the search bar to auto-fill location data, then fine-tune the plot, street, pincode, and global address fields below.",
        "Geo-aware"
      )}

      <div className={fieldClass("field-span-full", "field-surface")}>
        <label className={cx("input-label")}>Search Address (Auto-fill)</label>
        <GooglePlacesInput onPlaceSelect={handlePlaceSelect} placeholder="Type business name or address to search..." />
        <small className={cx("helper-note")}>
          Selecting from suggestions auto-fills street, pincode, location and coordinates.
        </small>
      </div>

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass()}>
          <label htmlFor="plotNumber" className={cx("input-label")}>Plot Number</label>
          <input type="text" id="plotNumber" name="plotNumber" className={getInputClassName("text-input", "plotNumber")} value={formData.plotNumber} onChange={handleChange} />
          {renderFieldError("plotNumber")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="street" className={cx("input-label")}>Street</label>
          <input type="text" id="street" name="street" className={getInputClassName("text-input", "street")} value={formData.street} onChange={handleChange} placeholder="Enter street address" />
          {renderFieldError("street")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="pincode" className={cx("input-label")}>Pincode *</label>
          <input type="text" id="pincode" name="pincode" className={getInputClassName("text-input", "pincode")} value={formData.pincode} onChange={handleChange} placeholder="Enter 6-digit pincode" required />
          {renderFieldError("pincode")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="location" className={cx("input-label")}>Location</label>
          <select
            id="location"
            name="location"
            className={getInputClassName("select-input", "location")}
            value={formData.location}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, location: e.target.value }));
            }}
          >
            <option value="">Select a location</option>
            {location && location.length > 0 ? (
              location.map((loc) => {
                const displayName = loc.city || loc.district;
                return (
                  <option key={loc._id} value={displayName}>
                    {displayName}{loc.state ? ` — ${loc.state}` : ""}
                  </option>
                );
              })
            ) : (
              <option disabled>No locations available</option>
            )}
          </select>
          {renderFieldError("location")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label htmlFor="globalAddress" className={cx("input-label")}>Global Address</label>
          <input type="text" id="globalAddress" name="globalAddress" className={getInputClassName("text-input", "globalAddress")} value={formData.globalAddress} onChange={handleChange} />
          {renderFieldError("globalAddress")}
        </div>
      </div>
    </>
  );

  const renderContact = () => (
    <>
      {renderSectionIntro(
        "Contact channels",
        "Place the most useful contact points together so callers, WhatsApp users, and enquiry teams can reach the business quickly.",
        "4 touchpoints"
      )}

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass()}>
          <label htmlFor="email" className={cx("input-label")}>Email</label>
          <input type="email" id="email" name="email" className={getInputClassName("text-input", "email")} value={formData.email} onChange={handleChange} placeholder="business@example.com" />
          {renderFieldError("email")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="contact" className={cx("input-label")}>Phone</label>
          <input type="text" id="contact" name="contact" className={getInputClassName("text-input", "contact")} value={formData.contact} onChange={handleChange} />
          {renderFieldError("contact")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="contactList" className={cx("input-label")}>Enquiry Number</label>
          <input type="text" id="contactList" name="contactList" className={getInputClassName("text-input", "contactList")} value={formData.contactList} onChange={handleChange} placeholder="Alternate contact number" />
          {renderFieldError("contactList")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="whatsappNumber" className={cx("input-label")}>WhatsApp Number</label>
          <input type="text" id="whatsappNumber" name="whatsappNumber" className={getInputClassName("text-input", "whatsappNumber")} value={formData.whatsappNumber} onChange={handleChange} placeholder="Business WhatsApp number" />
          {renderFieldError("whatsappNumber")}
        </div>
      </div>
    </>
  );

  const renderBusinessInfo = () => (
    <>
      {renderSectionIntro(
        "Business details",
        "Keep the registration and experience details grouped so the profile feels complete and easy to review.",
        "Trust building"
      )}

      <div className={cx("section-grid", "section-grid-wide-left")}>
        <div className={fieldClass("field-span-8")}>
          <label htmlFor="gstin" className={cx("input-label")}>GSTIN</label>
          <input type="text" id="gstin" name="gstin" className={getInputClassName("text-input", "gstin")} value={formData.gstin} onChange={handleChange} placeholder="Enter GST registration number" />
          {renderFieldError("gstin")}
        </div>

        <div className={fieldClass("field-span-4")}>
          <label htmlFor="experience" className={cx("input-label")}>Experience (Years)</label>
          <input type="text" id="experience" name="experience" className={getInputClassName("text-input", "experience")} value={formData.experience} onChange={handleChange} />
          {renderFieldError("experience")}
        </div>
      </div>
    </>
  );

  const renderLocationWeb = () => (
    <>
      {renderSectionIntro(
        "Location and web",
        "Use this section to anchor the map, pin coordinates, and website presence together for better discoverability.",
        "Maps ready"
      )}

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass("field-span-full")}>
          <label htmlFor="googleMap" className={cx("input-label")}>Google Map Link</label>
          <input type="text" id="googleMap" name="googleMap" className={getInputClassName("text-input", "googleMap")} value={formData.googleMap} onChange={handleChange} placeholder="https://maps.google.com/..." />
          {renderFieldError("googleMap")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="geoLatitude" className={cx("input-label")}>Latitude *</label>
          <input type="number" id="geoLatitude" className={getInputClassName("text-input", "geoLatitude")} value={formData.geoLocation?.coordinates?.[1] ?? ""} onChange={(e) => handleGeoCoordinateChange(1, e.target.value)} placeholder="Example: 13.0827" step="any" min="-90" max="90" required />
          {renderFieldError("geoLatitude")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="geoLongitude" className={cx("input-label")}>Longitude *</label>
          <input type="number" id="geoLongitude" className={getInputClassName("text-input", "geoLongitude")} value={formData.geoLocation?.coordinates?.[0] ?? ""} onChange={(e) => handleGeoCoordinateChange(0, e.target.value)} placeholder="Example: 80.2707" step="any" min="-180" max="180" required />
          {renderFieldError("geoLongitude")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label htmlFor="website" className={cx("input-label")}>Website</label>
          <input type="text" id="website" name="website" className={getInputClassName("text-input", "website")} value={formData.website} onChange={handleChange} placeholder="https://example.com" />
          {renderFieldError("website")}
        </div>
      </div>
    </>
  );

  const renderSocialMedia = () => (
    <>
      {renderSectionIntro(
        "Social presence",
        "Show the channels the business already uses. A tidy social block makes the listing feel active and current.",
        "6 platforms"
      )}

      <div className={cx("social-media-grid")}>
        {[
          { field: "facebook", label: "Facebook" },
          { field: "instagram", label: "Instagram" },
          { field: "youtube", label: "YouTube" },
          { field: "pinterest", label: "Pinterest" },
          { field: "twitter", label: "Twitter" },
          { field: "linkedin", label: "LinkedIn" },
        ].map(({ field, label }) => (
          <div className={fieldClass("field-compact")} key={field}>
            <label htmlFor={field} className={cx("input-label")}>{label}</label>
            <input type="text" id={field} name={field} className={getInputClassName("text-input", field)} value={formData[field]} onChange={handleChange} placeholder={`Your ${label} profile URL`} />
            {renderFieldError(field)}
          </div>
        ))}
      </div>
    </>
  );

  const renderBannerDetails = () => (
    <>
      {renderSectionIntro(
        "Brand storytelling",
        "Use the banner to create a strong first impression, then give the profile a polished description beneath it.",
        "Visual + copy"
      )}

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass("field-span-full", "upload-section")}>
          <div className={cx("upload-panel")}>
            <div>
              <label className={cx("input-label")}>Banner Image</label>
              <p className={cx("upload-panel-copy")}>Choose a clean, high-resolution image that represents the business well.</p>
            </div>
            <div className={cx("upload-content")}>
              <Button variant="contained" startIcon={<CloudUploadIcon />} component="label" className={cx("upload-button")}>
                Upload Image
                <input type="file" accept="image/*" hidden onChange={handleImageChange} />
              </Button>
              {preview && <Avatar src={preview} sx={{ width: 56, height: 56 }} className={cx("preview-avatar")} />}
            </div>
          </div>
          {renderFieldError("bannerImage")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label className={cx("input-label")}>Business Details</label>
          <QuillEditor value={formDataBusinessDetails} onChange={handleBusinessChange} modules={QUILL_MODULES} formats={QUILL_FORMATS} placeholder="Type business details here..." style={{ height: "220px" }} />
          {renderFieldError("businessDetails")}
        </div>
      </div>
    </>
  );

  const renderOpeningHours = () => (
    <>
      {renderSectionIntro(
        "Working hours",
        "Keep the time rows easy to scan. Each day sits in a full-width row so the schedule reads like a proper operating table.",
        "7 days"
      )}

      <div className={fieldClass("field-span-full", "field-surface")}>
        <div className={cx("opening-hours-container")}>
          {formData.openingHours.map((hour, index) => (
            <div key={hour.day} className={cx("opening-hours-row")} data-closed={hour.isClosed} data-247={hour.is24Hours}>
              <div className={cx("day-label")}>{hour.day}</div>
              <div className={cx("time-group")}>
                <input type="time" value={hour.is24Hours ? "00:00" : hour.open} onChange={(e) => handleOpeningHourChange(index, "open", e.target.value)} disabled={hour.isClosed || hour.is24Hours} className={getInputClassName("text-input", `openingHours.${hour.day}`)} placeholder="Open Time" />
                <input type="time" value={hour.is24Hours ? "23:59" : hour.close} onChange={(e) => handleOpeningHourChange(index, "close", e.target.value)} disabled={hour.isClosed || hour.is24Hours} className={getInputClassName("text-input", `openingHours.${hour.day}`)} placeholder="Close Time" />
              </div>
              <div style={{ justifySelf: "end" }}>
                <select
                  value={hour.isClosed ? "closed" : hour.is24Hours ? "24/7" : "open"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "closed") {
                      handleOpeningHourChange(index, "isClosed", true);
                      handleOpeningHourChange(index, "is24Hours", false);
                    } else if (value === "24/7") {
                      handleOpeningHourChange(index, "isClosed", false);
                      handleOpeningHourChange(index, "is24Hours", true);
                      handleOpeningHourChange(index, "open", "00:00");
                      handleOpeningHourChange(index, "close", "23:59");
                    } else {
                      handleOpeningHourChange(index, "isClosed", false);
                      handleOpeningHourChange(index, "is24Hours", false);
                    }
                  }}
                  className={cx("select-input")}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="24/7">24/7</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        {formData.openingHours.map((hour) => (
          <div key={hour.day}>
            {renderFieldError(`openingHours.${hour.day}`)}
          </div>
        ))}
      </div>
    </>
  );

  const renderBadgesVisibility = () => (
    <>
      {renderSectionIntro(
        "Badges & Visibility",
        "Control how this listing is highlighted"
      )}

      <div className={cx("section-grid")}>
        {/* Badge Toggles */}
        <div className={fieldClass("field-span-full")}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {[
              { key: "isFeatured", label: "⭐ Featured", color: "#d97706", bg: "#fef3c7" },
              { key: "isSponsored", label: "💎 Sponsored", color: "#7c3aed", bg: "#ede9fe" },
              { key: "isTrending", label: "🔥 Trending", color: "#dc2626", bg: "#fee2e2" },
              { key: "isTrust", label: "🛡️ Trusted", color: "#059669", bg: "#d1fae5" },
            ].map(({ key, label, color, bg }) => {
              const on = !!formData.badges?.[key];
              return (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${on ? color : "#e0e0e0"}`,
                    background: on ? bg : "#fafafa",
                    cursor: "pointer",
                    userSelect: "none",
                    fontWeight: 600,
                    fontSize: "13px",
                    color: on ? color : "#555",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        badges: { ...prev.badges, [key]: e.target.checked },
                      }))
                    }
                    style={{ accentColor: color }}
                  />
                  {label}
                </label>
              );
            })}

            {/* Verified Badge */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "8px",
                border: `1.5px solid ${formData.verification?.isVerified ? "#2563eb" : "#e0e0e0"}`,
                background: formData.verification?.isVerified ? "#dbeafe" : "#fafafa",
                cursor: "pointer",
                userSelect: "none",
                fontWeight: 600,
                fontSize: "13px",
                color: formData.verification?.isVerified ? "#2563eb" : "#555",
              }}
            >
              <input
                type="checkbox"
                checked={!!formData.verification?.isVerified}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    verification: { ...prev.verification, isVerified: e.target.checked },
                  }))
                }
                style={{ accentColor: "#2563eb" }}
              />
              ✅ Verified
            </label>
          </div>
        </div>

        {/* Priority Score */}
        <div className={fieldClass("field-span-full")}>
          <label className={cx("input-label")}>Priority Score</label>
          <input
            type="number"
            min="0"
            max="100"
            className={cx("text-input")}
            value={formData.badges?.priorityScore ?? 0}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                badges: { ...prev.badges, priorityScore: Number(e.target.value) },
              }))
            }
            placeholder="0–100, higher = boosted in results"
          />
          <p className={cx("helper-note")}>Higher scores can surface the listing more prominently in some views.</p>
        </div>

        {/* Verification Type (conditional) */}
        {formData.verification?.isVerified && (
          <div className={fieldClass("field-span-full")}>
            <label className={cx("input-label")}>Verification Type</label>
            <select
              value={formData.verification?.verificationType || "ADMIN"}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  verification: { ...prev.verification, verificationType: e.target.value },
                }))
              }
              className={cx("select-input")}
            >
              <option value="ADMIN">Admin Verified</option>
              <option value="DOCUMENT">Document Verified</option>
              <option value="PHONE">Phone Verified</option>
              <option value="BUSINESS">Business Verified</option>
            </select>
          </div>
        )}
      </div>
    </>
  );

  const sectionRenderers = {
    clientBusiness: renderClientBusiness,
    address: renderAddress,
    contact: renderContact,
    businessInfo: renderBusinessInfo,
    locationWeb: renderLocationWeb,
    socialMedia: renderSocialMedia,
    bannerDetails: renderBannerDetails,
    openingHours: renderOpeningHours,
    badgesVisibility: renderBadgesVisibility,
  };

  const activeSection_obj = sections.find((s) => s.key === activeSection);
  const navigation = activeSection_obj && getSectionNavigation ? getSectionNavigation(0, activeSection_obj.key) : null;
  const isDisabled = activeSection_obj && getSectionIsDisabled ? getSectionIsDisabled(0, activeSection_obj.key) : false;

  return (
    <>
      {activeSection_obj && (
        <div>
          <BusinessFormSection
            step={0}
            sectionKey={activeSection_obj.key}
            title={activeSection_obj.title}
            subtitle={activeSection_obj.subtitle}
            isCollapsed={false}
            isDisabled={isDisabled}
            onToggleCollapse={() => {}}
            showAdvanceButton={!!navigation}
            onAdvance={() => handleSectionAdvance(0, activeSection_obj.key)}
            advanceLabel={navigation?.label || "Next"}
            advanceType={navigation?.type === "submit" ? "submit" : "next"}
          >
            {sectionRenderers[activeSection_obj.key]()}
          </BusinessFormSection>
        </div>
      )}
    </>
  );
};

export default BusinessFormStep0;
