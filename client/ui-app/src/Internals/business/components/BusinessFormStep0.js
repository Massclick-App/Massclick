import React from "react";
import { Button, Avatar, Autocomplete, TextField } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useSelector } from "react-redux";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import GooglePlacesInput from "../../../components/GooglePlacesInput/GooglePlacesInput";
import BusinessFormSection from "./BusinessFormSection";
import styles from "../business.module.css";
import { getAllUsersClient } from "../../../redux/actions/userClientAction";
import { searchMasterLocations } from "../../../redux/actions/masterLocationAction";

const getMasterLocationLabel = (option) => {
  if (!option || typeof option !== "object") return "";
  return option.locality || option.ward || option.zone || option.district || "";
};

const cx = createScopedClassNames(styles);

const BusinessFormStep0 = ({
  formData,
  fieldErrors,
  preview,
  logoPreview,
  paymentMethodOptions,
  normalizePaymentConcept,
  getInputClassName,
  renderFieldError,
  handleChange,
  handlePlaceSelect,
  handleGeoCoordinateChange,
  handleImageChange,
  handleLogoSelect,
  handleLogoClear,
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
  editMode,
  saveSectionData,
  sectionSavingState,
}) => {
  const [clientSearchInput, setClientSearchInput] = React.useState("");
  const [locationInput, setLocationInput] = React.useState(formData.location || "");
  const masterLocationState = useSelector((state) => state.masterLocationReducer) || {};
  const {
    locationSearchResults: masterLocationOptions = [],
    locationSearchLoading: masterLocationLoading = false,
  } = masterLocationState;

  React.useEffect(() => {
    // Load all clients when component mounts
    if (dispatch) {
      dispatch(getAllUsersClient());
    }
  }, [dispatch]);

  React.useEffect(() => {
    setLocationInput(formData.location || "");
  }, [formData.location]);

  React.useEffect(() => {
    if (!dispatch) return undefined;
    const query = locationInput.trim();
    if (query.length < 2) return undefined;
    const handle = setTimeout(() => dispatch(searchMasterLocations(query)), 300);
    return () => clearTimeout(handle);
  }, [locationInput, dispatch]);

  const handleMasterLocationPick = (loc) => {
    setFormData((prev) => ({
      ...prev,
      location: getMasterLocationLabel(loc),
      masterLocation: {
        locationId: loc._id,
        slug: loc.slug,
        state: loc.state || null,
        district: loc.district || null,
        zone: loc.zone || null,
        ward: loc.ward || null,
        locality: loc.locality || null,
        resolvedLevel: loc.level,
        confidence: "high",
        source: "manual",
        linkedAt: new Date().toISOString(),
      },
    }));
  };

  const handleClientSearch = (event, value) => {
    setClientSearchInput(value);

    // Only search if input is not empty and is a partial search (doesn't contain " — " which is the full label format)
    if (value && value.trim().length > 0 && !value.includes(" — ") && dispatch) {
      dispatch(getUserClientSuggestion(value));
    } else if (value && value.includes(" — ")) {
      }
  };

  // Get all available options - merge search results with user clients to avoid losing searched clients
  const allOptions = React.useMemo(() => {
    if (clientSearchInput && searchSuggestion?.length > 0) {
      // When searching, show search results
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
      }
    return mergedClients;
  }, [clientSearchInput, searchSuggestion, userClient]);

  // Find the selected client object from all available options
  const getSelectedClient = () => {
    if (!formData.clientId) return null;

    // Extract ID part if clientId is in extended format "MCYYMMDDHHMMSS — Name"
    const idPart = formData.clientId.split(' — ')[0].trim();

    const selected = allOptions.find((c) => c.clientId === idPart);
    const fallbackName = String(formData.clientId)
      .replace(idPart, "")
      .replace(/^\s*(?:\u2014|â€”|-)\s*/, "")
      .trim();
    return selected || { clientId: idPart, name: fallbackName };
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
    { key: "paymentDetails", title: "Payment Details", subtitle: "Track total, advance paid, and pending amount" },
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
  const paymentConcept = normalizePaymentConcept
    ? normalizePaymentConcept(formData.paymentConcept)
    : formData.paymentConcept;
  const paymentProgress = paymentConcept?.totalAmount > 0
    ? Math.min(100, Math.round((paymentConcept.advancePaid / paymentConcept.totalAmount) * 100))
    : 0;
  const paymentStatusLabel = {
    unpaid: "Unpaid",
    part_paid: "Part Paid",
    paid: "Paid",
  }[paymentConcept?.paymentStatus] || "Unpaid";
  const paymentMethodLabel = (paymentMethodOptions || []).find(
    option => option.value === paymentConcept?.paymentMethod
  )?.label || "Not selected";
  const formatAmount = value => Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const updatePaymentConcept = (patch) => {
    setFormData((prev) => ({
      ...prev,
      paymentConcept: normalizePaymentConcept
        ? normalizePaymentConcept({ ...(prev.paymentConcept || {}), ...patch })
        : { ...(prev.paymentConcept || {}), ...patch },
    }));
  };

  const renderClientBusiness = () => (
    <>
      {renderSectionIntro(
        "Business identity",
        "Start with the account owner and the business name. Keeping these aligned makes reviews and future edits much easier.",
        "2 core fields"
      )}

      <div className={cx("section-grid", "section-grid-wide-left")}>
        <div className={fieldClass("field-span-7")}>
          <label htmlFor="clientId" className="form-input-label">Client ID</label>
          <Autocomplete
            options={allOptions}
            getOptionLabel={(option) => `${option.clientId} — ${option.name}`}
            value={getSelectedClient()}
            onChange={(event, newValue) => {
              setFormData((prev) => {
                const updated = {
                  ...prev,
                  clientId: newValue ? newValue.clientId : ""
                };
                return updated;
              });
              setClientSearchInput("");
            }}
            onInputChange={handleClientSearch}
            isOptionEqualToValue={(option, value) => option.clientId === value.clientId}
            freeSolo={false}
            disableClearable={false}
            filterOptions={(options, state) => {
              // Only show options that match the search input
              if (!state.inputValue) return options;
              return options.filter(
                (option) =>
                  option.clientId.includes(state.inputValue.toUpperCase()) ||
                  option.name.toLowerCase().includes(state.inputValue.toLowerCase())
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search by client ID or name"
                size="small"
                helperText="Must select from the list below. Search your client by name or ID."
                error={!!fieldErrors.clientId}
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
          <label htmlFor="businessName" className="form-input-label">Business Name</label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            className={`form-text-input ${fieldErrors.businessName ? "error" : ""}`}
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
        <label className="form-input-label">Search Address (Auto-fill)</label>
        <GooglePlacesInput onPlaceSelect={handlePlaceSelect} placeholder="Type business name or address to search..." />
        <small className={cx("helper-note")}>
          Selecting from suggestions auto-fills street, pincode, location and coordinates.
        </small>
      </div>

      <div className={cx("section-grid", "section-grid-2")}>
        <div className={fieldClass()}>
          <label htmlFor="plotNumber" className="form-input-label">Plot Number</label>
          <input type="text" id="plotNumber" name="plotNumber" className={`form-text-input ${fieldErrors.plotNumber ? "error" : ""}`} value={formData.plotNumber} onChange={handleChange} />
          {renderFieldError("plotNumber")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="street" className="form-input-label">Street</label>
          <input type="text" id="street" name="street" className={`form-text-input ${fieldErrors.street ? "error" : ""}`} value={formData.street} onChange={handleChange} placeholder="Enter street address" />
          {renderFieldError("street")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="pincode" className="form-input-label">Pincode *</label>
          <input type="text" id="pincode" name="pincode" className={`form-text-input ${fieldErrors.pincode ? "error" : ""}`} value={formData.pincode} onChange={handleChange} placeholder="Enter 6-digit pincode" required />
          {renderFieldError("pincode")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="locationLegacy" className="form-input-label">Location (legacy list)</label>
          <select
            id="locationLegacy"
            name="location"
            className={`form-select-input ${fieldErrors.location ? "error" : ""}`}
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
        </div>

        <div className={fieldClass()}>
          <label htmlFor="location" className="form-input-label">Location (verified search)</label>
          <Autocomplete
            freeSolo
            id="location"
            options={masterLocationOptions.filter((loc) => loc.level !== "state")}
            loading={masterLocationLoading}
            getOptionLabel={getMasterLocationLabel}
            inputValue={locationInput}
            filterOptions={(options) => options}
            isOptionEqualToValue={(option, value) => option._id === value?._id}
            onInputChange={(event, newInputValue, reason) => {
              setLocationInput(newInputValue);
              if (reason === "input") {
                setFormData((prev) => ({ ...prev, location: newInputValue, masterLocation: null }));
              }
            }}
            onChange={(event, newValue) => {
              if (newValue && typeof newValue === "object") {
                handleMasterLocationPick(newValue);
              }
            }}
            renderOption={(props, option) => (
              <li {...props} key={option._id}>
                <span>
                  <span style={{ display: "block", fontWeight: 600 }}>{getMasterLocationLabel(option)}</span>
                  <span style={{ display: "block", fontSize: "12px", color: "#777" }}>{option.hierarchyPath}</span>
                </span>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search district, zone, ward, or locality"
                size="small"
                error={!!fieldErrors.location}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    padding: "6px !important",
                    borderRadius: "6px",
                    fontSize: "14px",
                  },
                }}
              />
            )}
          />
          {formData.masterLocation?.slug && (
            <small className={cx("helper-note")}>
              Linked: {[formData.masterLocation.district, formData.masterLocation.zone, formData.masterLocation.ward, formData.masterLocation.locality].filter(Boolean).join(" > ")}
            </small>
          )}
          {renderFieldError("location")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label htmlFor="globalAddress" className="form-input-label">Global Address</label>
          <input type="text" id="globalAddress" name="globalAddress" className={`form-text-input ${fieldErrors.globalAddress ? "error" : ""}`} value={formData.globalAddress} onChange={handleChange} />
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
          <label htmlFor="email" className="form-input-label">Email</label>
          <input type="email" id="email" name="email" className={`form-text-input ${fieldErrors.email ? "error" : ""}`} value={formData.email} onChange={handleChange} placeholder="business@example.com" />
          {renderFieldError("email")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="contact" className="form-input-label">Phone</label>
          <input type="text" id="contact" name="contact" className={`form-text-input ${fieldErrors.contact ? "error" : ""}`} value={formData.contact} onChange={handleChange} />
          {renderFieldError("contact")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="contactList" className="form-input-label">Enquiry Number</label>
          <input type="text" id="contactList" name="contactList" className={`form-text-input ${fieldErrors.contactList ? "error" : ""}`} value={formData.contactList} onChange={handleChange} placeholder="Alternate contact number" />
          {renderFieldError("contactList")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="whatsappNumber" className="form-input-label">WhatsApp Number</label>
          <input type="text" id="whatsappNumber" name="whatsappNumber" className={`form-text-input ${fieldErrors.whatsappNumber ? "error" : ""}`} value={formData.whatsappNumber} onChange={handleChange} placeholder="Business WhatsApp number" />
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
          <label htmlFor="gstin" className="form-input-label">GSTIN</label>
          <input type="text" id="gstin" name="gstin" className={`form-text-input ${fieldErrors.gstin ? "error" : ""}`} value={formData.gstin} onChange={handleChange} placeholder="Enter GST registration number" />
          {renderFieldError("gstin")}
        </div>

        <div className={fieldClass("field-span-4")}>
          <label htmlFor="experience" className="form-input-label">Experience (Years)</label>
          <input type="text" id="experience" name="experience" className={`form-text-input ${fieldErrors.experience ? "error" : ""}`} value={formData.experience} onChange={handleChange} />
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
          <label htmlFor="googleMap" className="form-input-label">Google Map Link</label>
          <input type="text" id="googleMap" name="googleMap" className={`form-text-input ${fieldErrors.googleMap ? "error" : ""}`} value={formData.googleMap} onChange={handleChange} placeholder="https://maps.google.com/..." />
          {renderFieldError("googleMap")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="geoLatitude" className="form-input-label">Latitude *</label>
          <input type="number" id="geoLatitude" className={`form-text-input ${fieldErrors.geoLatitude ? "error" : ""}`} value={formData.geoLocation?.coordinates?.[1] ?? ""} onChange={(e) => handleGeoCoordinateChange(1, e.target.value)} placeholder="Example: 13.0827" step="any" min="-90" max="90" required />
          {renderFieldError("geoLatitude")}
        </div>

        <div className={fieldClass()}>
          <label htmlFor="geoLongitude" className="form-input-label">Longitude *</label>
          <input type="number" id="geoLongitude" className={`form-text-input ${fieldErrors.geoLongitude ? "error" : ""}`} value={formData.geoLocation?.coordinates?.[0] ?? ""} onChange={(e) => handleGeoCoordinateChange(0, e.target.value)} placeholder="Example: 80.2707" step="any" min="-180" max="180" required />
          {renderFieldError("geoLongitude")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label htmlFor="website" className="form-input-label">Website</label>
          <input type="text" id="website" name="website" className={`form-text-input ${fieldErrors.website ? "error" : ""}`} value={formData.website} onChange={handleChange} placeholder="https://example.com" />
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
            <label htmlFor={field} className="form-input-label">{label}</label>
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
              <label className="form-input-label">Banner Image</label>
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

        <div className={fieldClass("field-span-full", "upload-section")}>
          <div className={cx("upload-panel")}>
            <div>
              <label className="form-input-label">Business Logo</label>
              <p className={cx("upload-panel-copy")}>Upload a square logo (1:1 aspect ratio). We'll auto-crop it for you.</p>
            </div>
            <div className={cx("upload-content")}>
              <Button variant="contained" startIcon={<CloudUploadIcon />} component="label" className={cx("upload-button")}>
                Upload Logo
                <input type="file" accept="image/*" hidden onChange={handleLogoSelect} />
              </Button>
              {logoPreview && (
                <div className={cx("logo-preview")}>
                  <Avatar src={logoPreview} sx={{ width: 100, height: 100 }} />
                  <Button size="small" onClick={handleLogoClear} sx={{ mt: 1 }}>Clear</Button>
                </div>
              )}
            </div>
          </div>
          {renderFieldError("logoImage")}
        </div>

        <div className={fieldClass("field-span-full")}>
          <label className="form-input-label">Business Details</label>
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
          <label className="form-input-label">Priority Score</label>
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
            <label className="form-input-label">Verification Type</label>
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
              <option value="AUTO">Auto Verified</option>
            </select>
          </div>
        )}
      </div>
    </>
  );

  const renderPaymentDetails = () => (
    <>
      {renderSectionIntro(
        "Payment concept",
        "Record the base amount, 18% GST, total payable, advance paid, and pending amount for this business.",
        paymentStatusLabel
      )}

      <div className={cx("payment-concept-panel")}>
        <div className={cx("payment-concept-header")}>
          <div>
            <p className={cx("payment-concept-eyebrow")}>Business Payment Summary</p>
            <h3 className={cx("payment-concept-title")}>{formData.businessName || "New business"}</h3>
          </div>
          <span className={cx("payment-concept-status", `payment-concept-status-${paymentConcept.paymentStatus}`)}>
            {paymentStatusLabel}
          </span>
        </div>

        <div className={cx("payment-concept-metrics")}>
          <div className={cx("payment-concept-metric")}>
            <span className={cx("payment-concept-metric-label")}>Base Amount</span>
            <strong className={cx("payment-concept-metric-value")}>{formatAmount(paymentConcept.baseAmount)}</strong>
          </div>
          <div className={cx("payment-concept-metric")}>
            <span className={cx("payment-concept-metric-label")}>GST 18%</span>
            <strong className={cx("payment-concept-metric-value")}>{formatAmount(paymentConcept.gstAmount)}</strong>
          </div>
          <div className={cx("payment-concept-metric")}>
            <span className={cx("payment-concept-metric-label")}>Total Amount Incl. GST</span>
            <strong className={cx("payment-concept-metric-value")}>{formatAmount(paymentConcept.totalAmount)}</strong>
          </div>
          <div className={cx("payment-concept-metric")}>
            <span className={cx("payment-concept-metric-label")}>Advance Paid</span>
            <strong className={cx("payment-concept-metric-value")}>{formatAmount(paymentConcept.advancePaid)}</strong>
          </div>
          <div className={cx("payment-concept-metric", "payment-concept-pending")}>
            <span className={cx("payment-concept-metric-label")}>Pending Amount</span>
            <strong className={cx("payment-concept-metric-value", "payment-concept-metric-value-pending")}>{formatAmount(paymentConcept.pendingAmount)}</strong>
          </div>
        </div>

        <div className={cx("payment-concept-progress")}>
          <span className={cx("payment-concept-progress-fill")} style={{ width: `${paymentProgress}%` }} />
        </div>

        <div className={cx("section-grid", "section-grid-2")}>
          <div className={fieldClass()}>
            <label htmlFor="paymentBaseAmount" className="form-input-label">Base Amount</label>
            <input
              id="paymentBaseAmount"
              type="number"
              min="0"
              className={cx("text-input")}
              value={paymentConcept.baseAmount}
              onChange={(event) => updatePaymentConcept({ baseAmount: event.target.value })}
            />
          </div>

          <div className={fieldClass()}>
            <label className="form-input-label">GST 18%</label>
            <input
              type="text"
              className={cx("text-input")}
              value={formatAmount(paymentConcept.gstAmount)}
              readOnly
            />
          </div>

          <div className={fieldClass()}>
            <label className="form-input-label">Total Amount Incl. GST</label>
            <input
              type="text"
              className={cx("text-input")}
              value={formatAmount(paymentConcept.totalAmount)}
              readOnly
            />
          </div>

          <div className={fieldClass()}>
            <label htmlFor="paymentAdvancePaid" className="form-input-label">Advance / Paid Amount</label>
            <input
              id="paymentAdvancePaid"
              type="number"
              min="0"
              className={cx("text-input")}
              value={paymentConcept.advancePaid}
              onChange={(event) => updatePaymentConcept({ advancePaid: event.target.value })}
            />
          </div>

          <div className={fieldClass()}>
            <label className="form-input-label">Pending Amount</label>
            <input
              type="text"
              className={cx("text-input")}
              value={formatAmount(paymentConcept.pendingAmount)}
              readOnly
            />
          </div>

          <div className={fieldClass()}>
            <label htmlFor="paymentMethod" className="form-input-label">Payment Method</label>
            <select
              id="paymentMethod"
              className={cx("select-input")}
              value={paymentConcept.paymentMethod}
              onChange={(event) => updatePaymentConcept({ paymentMethod: event.target.value })}
            >
              {(paymentMethodOptions || []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className={fieldClass()}>
            <label htmlFor="paymentDueDate" className="form-input-label">Payment Due Date</label>
            <input
              id="paymentDueDate"
              type="date"
              className={cx("text-input")}
              value={paymentConcept.paymentDueDate}
              onChange={(event) => updatePaymentConcept({ paymentDueDate: event.target.value })}
            />
          </div>

          <div className={fieldClass()}>
            <label className="form-input-label">Payment Status</label>
            <input
              type="text"
              className={cx("text-input")}
              value={`${paymentStatusLabel} - ${paymentMethodLabel}`}
              readOnly
            />
          </div>

          <div className={fieldClass("field-span-full")}>
            <label htmlFor="paymentReference" className="form-input-label">Payment Reference</label>
            <input
              id="paymentReference"
              type="text"
              className={cx("text-input")}
              value={paymentConcept.paymentReference}
              onChange={(event) => updatePaymentConcept({ paymentReference: event.target.value })}
              placeholder="Transaction ID, receipt number, cheque number, or manual note"
            />
          </div>

          <div className={fieldClass("field-span-full")}>
            <label htmlFor="paymentNotes" className="form-input-label">Internal Payment Notes</label>
            <textarea
              id="paymentNotes"
              className={cx("textarea-input")}
              value={paymentConcept.notes}
              onChange={(event) => updatePaymentConcept({ notes: event.target.value })}
              placeholder="Add any payment follow-up notes for the team"
            />
          </div>
        </div>
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
    paymentDetails: renderPaymentDetails,
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
            showAdvanceButton={!editMode && !!navigation}
            onAdvance={() => handleSectionAdvance(0, activeSection_obj.key)}
            advanceLabel={navigation?.label || "Next"}
            advanceType={navigation?.type === "submit" ? "submit" : "next"}
            showSaveButton={editMode}
            onSave={() => saveSectionData(activeSection_obj.key)}
            isSaving={sectionSavingState[activeSection_obj.key] || false}
          >
            {sectionRenderers[activeSection_obj.key]()}
          </BusinessFormSection>
        </div>
      )}
    </>
  );
};

export default BusinessFormStep0;
