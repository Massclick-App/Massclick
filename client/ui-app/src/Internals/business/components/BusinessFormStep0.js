import React from "react";
import { Button, Avatar, CircularProgress } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import GooglePlacesInput from "../../../components/GooglePlacesInput/GooglePlacesInput";
import BusinessFormSection from "./BusinessFormSection";
import styles from "../business.module.css";

const cx = createScopedClassNames(styles);

const BusinessFormStep0 = ({
  formData,
  collapsedSections,
  fieldErrors,
  loading,
  preview,
  listingMode,
  getSectionRefKey,
  getSectionIsComplete,
  getSectionIsDisabled,
  toggleSectionCollapsed,
  handleSectionAdvance,
  renderSectionContent,
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
  locationSuggestions,
  showLocationSuggest,
  setFormData,
  setShowLocationSuggest,
  setLocationSuggestions,
  searchSuggestion,
  showSuggestions,
  setShowSuggestions,
  dispatch,
  getUserClientSuggestion,
}) => {
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

  const renderClientBusiness = () => (
    <>
      <div className={cx("form-input-group")} style={{ position: "relative" }}>
        <label htmlFor="clientId" className={cx("input-label")}>🔍 Client ID</label>
        <input
          type="text"
          id="clientId"
          name="clientId"
          className={getInputClassName("text-input", "clientId")}
          value={formData.clientId}
          placeholder="Type client ID or name..."
          onChange={(e) => {
            const value = e.target.value;
            setFormData((prev) => ({ ...prev, clientId: value }));
            if (value.length >= 2) {
              dispatch(getUserClientSuggestion(value));
              setShowSuggestions(true);
            } else {
              setShowSuggestions(false);
            }
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onFocus={() => {
            if (formData.clientId.length >= 2) {
              setShowSuggestions(true);
            }
          }}
        />
        {renderFieldError("clientId")}
        {showSuggestions && searchSuggestion?.length > 0 && (
          <ul className={cx("category-suggestion-box")}>
            {searchSuggestion.map((client) => (
              <li
                key={client._id}
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    clientId: `${client.clientId} — ${client.name}`,
                  }));
                  setShowSuggestions(false);
                }}
                style={{ padding: "12px", cursor: "pointer", borderBottom: "1px solid #eee" }}
              >
                <strong>{client.clientId}</strong> — {client.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="businessName" className={cx("input-label")}>🏢 Business Name</label>
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
    </>
  );

  const renderAddress = () => (
    <>
      <div className={cx("form-input-group col-span-all")}>
        <label className={cx("input-label")}>🔍 Search Address (Auto-fill)</label>
        <GooglePlacesInput onPlaceSelect={handlePlaceSelect} placeholder="Type business name or address to search..." />
        <small style={{ color: "#888", marginTop: "4px", display: "block" }}>
          Selecting from suggestions auto-fills street, pincode, location and coordinates.
        </small>
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="plotNumber" className={cx("input-label")}>📍 Plot Number</label>
        <input type="text" id="plotNumber" name="plotNumber" className={getInputClassName("text-input", "plotNumber")} value={formData.plotNumber} onChange={handleChange} />
        {renderFieldError("plotNumber")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="street" className={cx("input-label")}>🛣️ Street</label>
        <input type="text" id="street" name="street" className={getInputClassName("text-input", "street")} value={formData.street} onChange={handleChange} placeholder="Enter street address" />
        {renderFieldError("street")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="pincode" className={cx("input-label")}>📮 Pincode *</label>
        <input type="text" id="pincode" name="pincode" className={getInputClassName("text-input", "pincode")} value={formData.pincode} onChange={handleChange} placeholder="Enter 6-digit pincode" required />
        {renderFieldError("pincode")}
      </div>

      <div className={cx("form-input-group")} style={{ position: "relative" }}>
        <label htmlFor="location" className={cx("input-label")}>Location</label>
        <input
          type="text"
          id="location"
          name="location"
          autoComplete="off"
          className={getInputClassName("text-input", "location")}
          value={formData.location}
          placeholder="Type to search location..."
          onChange={(e) => {
            const value = e.target.value;
            setFormData((prev) => ({ ...prev, location: value }));
            if (value.length >= 1) {
              const filtered = locationSuggestions.filter(
                (loc) => loc.city?.toLowerCase().includes(value.toLowerCase()) || loc.district?.toLowerCase().includes(value.toLowerCase())
              );
              setLocationSuggestions(filtered);
              setShowLocationSuggest(true);
            } else {
              setShowLocationSuggest(false);
              setLocationSuggestions([]);
            }
          }}
          onBlur={() => setTimeout(() => setShowLocationSuggest(false), 200)}
          onFocus={() => {
            if (formData.location.length >= 1) {
              const filtered = locationSuggestions.filter(
                (loc) => loc.city?.toLowerCase().includes(formData.location.toLowerCase()) || loc.district?.toLowerCase().includes(formData.location.toLowerCase())
              );
              setLocationSuggestions(filtered);
              setShowLocationSuggest(filtered.length > 0);
            }
          }}
        />
        {showLocationSuggest && locationSuggestions.length > 0 && (
          <ul className={cx("category-suggestion-box")}>
            {locationSuggestions.map((loc) => (
              <li
                key={loc._id}
                onClick={() => {
                  const nextLocation = loc.city || loc.district;
                  setFormData((prev) => ({ ...prev, location: nextLocation }));
                  setShowLocationSuggest(false);
                  setLocationSuggestions([]);
                }}
                style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee" }}
              >
                {loc.city}{loc.district && loc.district !== loc.city ? `, ${loc.district}` : ""}
                {loc.state ? ` — ${loc.state}` : ""}
              </li>
            ))}
          </ul>
        )}
        {renderFieldError("location")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="globalAddress" className={cx("input-label")}>Global Address</label>
        <input type="text" id="globalAddress" name="globalAddress" className={getInputClassName("text-input", "globalAddress")} value={formData.globalAddress} onChange={handleChange} />
        {renderFieldError("globalAddress")}
      </div>
    </>
  );

  const renderContact = () => (
    <>
      <div className={cx("form-input-group")}>
        <label htmlFor="email" className={cx("input-label")}>📧 Email</label>
        <input type="email" id="email" name="email" className={getInputClassName("text-input", "email")} value={formData.email} onChange={handleChange} placeholder="business@example.com" />
        {renderFieldError("email")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="contact" className={cx("input-label")}>📞 Phone</label>
        <input type="text" id="contact" name="contact" className={getInputClassName("text-input", "contact")} value={formData.contact} onChange={handleChange} />
        {renderFieldError("contact")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="contactList" className={cx("input-label")}>☎️ Enquiry Number</label>
        <input type="text" id="contactList" name="contactList" className={getInputClassName("text-input", "contactList")} value={formData.contactList} onChange={handleChange} placeholder="Alternate contact number" />
        {renderFieldError("contactList")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="whatsappNumber" className={cx("input-label")}>💬 WhatsApp Number</label>
        <input type="text" id="whatsappNumber" name="whatsappNumber" className={getInputClassName("text-input", "whatsappNumber")} value={formData.whatsappNumber} onChange={handleChange} placeholder="Business WhatsApp number" />
        {renderFieldError("whatsappNumber")}
      </div>
    </>
  );

  const renderBusinessInfo = () => (
    <>
      <div className={cx("form-input-group")}>
        <label htmlFor="gstin" className={cx("input-label")}>🏛️ GSTIN</label>
        <input type="text" id="gstin" name="gstin" className={getInputClassName("text-input", "gstin")} value={formData.gstin} onChange={handleChange} placeholder="Enter GST registration number" />
        {renderFieldError("gstin")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="experience" className={cx("input-label")}>⭐ Experience (Years)</label>
        <input type="text" id="experience" name="experience" className={getInputClassName("text-input", "experience")} value={formData.experience} onChange={handleChange} />
        {renderFieldError("experience")}
      </div>
    </>
  );

  const renderLocationWeb = () => (
    <>
      <div className={cx("form-input-group")}>
        <label htmlFor="googleMap" className={cx("input-label")}>🗺️ Google Map Link</label>
        <input type="text" id="googleMap" name="googleMap" className={getInputClassName("text-input", "googleMap")} value={formData.googleMap} onChange={handleChange} placeholder="https://maps.google.com/..." />
        {renderFieldError("googleMap")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="geoLatitude" className={cx("input-label")}>Latitude *</label>
        <input type="number" id="geoLatitude" className={getInputClassName("text-input", "geoLatitude")} value={formData.geoLocation?.coordinates?.[1] ?? ""} onChange={(e) => handleGeoCoordinateChange(1, e.target.value)} placeholder="Example: 13.0827" step="any" min="-90" max="90" required />
        {renderFieldError("geoLatitude")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="geoLongitude" className={cx("input-label")}>Longitude *</label>
        <input type="number" id="geoLongitude" className={getInputClassName("text-input", "geoLongitude")} value={formData.geoLocation?.coordinates?.[0] ?? ""} onChange={(e) => handleGeoCoordinateChange(0, e.target.value)} placeholder="Example: 80.2707" step="any" min="-180" max="180" required />
        {renderFieldError("geoLongitude")}
      </div>

      <div className={cx("form-input-group")}>
        <label htmlFor="website" className={cx("input-label")}>🌐 Website</label>
        <input type="text" id="website" name="website" className={getInputClassName("text-input", "website")} value={formData.website} onChange={handleChange} placeholder="https://example.com" />
        {renderFieldError("website")}
      </div>
    </>
  );

  const renderSocialMedia = () => (
    <div className={cx("social-media-grid")}>
      {[
        { field: "facebook", icon: "f", label: "Facebook" },
        { field: "instagram", icon: "📷", label: "Instagram" },
        { field: "youtube", icon: "▶️", label: "YouTube" },
        { field: "pinterest", icon: "📌", label: "Pinterest" },
        { field: "twitter", icon: "𝕏", label: "Twitter" },
        { field: "linkedin", icon: "in", label: "LinkedIn" },
      ].map(({ field, icon, label }) => (
        <div className={cx("form-input-group")} key={field}>
          <label htmlFor={field} className={cx("input-label")}>{icon} {label}</label>
          <input type="text" id={field} name={field} className={getInputClassName("text-input", field)} value={formData[field]} onChange={handleChange} placeholder={`Your ${label} profile URL`} />
          {renderFieldError(field)}
        </div>
      ))}
    </div>
  );

  const renderBannerDetails = () => (
    <>
      <div className={cx("form-input-group col-span-all upload-section")}>
        <label className={cx("input-label")}>🖼️ Banner Image</label>
        <div className={cx("upload-content")}>
          <Button variant="contained" startIcon={<CloudUploadIcon />} component="label" className={cx("upload-button")}>
            Upload Image
            <input type="file" accept="image/*" hidden onChange={handleImageChange} />
          </Button>
          {preview && <Avatar src={preview} sx={{ width: 56, height: 56 }} className={cx("preview-avatar")} />}
        </div>
        {renderFieldError("bannerImage")}
      </div>

      <div className={cx("form-input-group col-span-all")}>
        <label className={cx("input-label")}>📝 Business Details</label>
        <QuillEditor value={formDataBusinessDetails} onChange={handleBusinessChange} modules={QUILL_MODULES} formats={QUILL_FORMATS} placeholder="Type business details here..." style={{ height: "200px" }} />
        {renderFieldError("businessDetails")}
      </div>
    </>
  );

  const renderOpeningHours = () => (
    <div className={cx("form-input-group col-span-all")}>
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
  );

  const renderBadgesVisibility = () => (
    <>
      <div className={cx("form-input-group col-span-all")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {[
            { key: "isFeatured", label: "⭐ Featured", color: "#d97706", bg: "#fef3c7" },
            { key: "isSponsored", label: "💎 Sponsored", color: "#7c3aed", bg: "#ede9fe" },
            { key: "isTrending", label: "🔥 Trending", color: "#dc2626", bg: "#fee2e2" },
          ].map(({ key, label, color, bg }) => {
            const on = !!formData.badges?.[key];
            return (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${on ? color : "#e0e0e0"}`, background: on ? bg : "#fafafa", cursor: "pointer", userSelect: "none", fontWeight: 600, fontSize: "13px", color: on ? color : "#555" }}>
                <input type="checkbox" checked={on} onChange={(e) => setFormData((prev) => ({ ...prev, badges: { ...prev.badges, [key]: e.target.checked } }))} style={{ accentColor: color }} />
                {label}
              </label>
            );
          })}
        </div>
      </div>

      <div className={cx("form-input-group")}>
        <label className={cx("input-label")}>Priority Score</label>
        <input type="number" min="0" max="100" className={cx("text-input")} value={formData.badges?.priorityScore ?? 0} onChange={(e) => setFormData((prev) => ({ ...prev, badges: { ...prev.badges, priorityScore: Number(e.target.value) } }))} placeholder="0–100, higher = boosted in results" style={{ flex: 1 }} />
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

  return (
    <>
      {sections.map((section, idx) => {
        const refKey = getSectionRefKey(0, section.key);
        const isCollapsed = collapsedSections[refKey] ?? (section.key !== "clientBusiness");
        const isDisabled = getSectionIsDisabled(0, section.key);

        return (
          <div key={section.key}>
            <BusinessFormSection
              step={0}
              sectionKey={section.key}
              title={section.title}
              subtitle={section.subtitle}
              isCollapsed={isCollapsed}
              isDisabled={isDisabled}
              onToggleCollapse={() => toggleSectionCollapsed(0, section.key)}
              onAdvance={() => handleSectionAdvance(0, section.key)}
              showAdvanceButton={true}
            >
              {sectionRenderers[section.key]()}
            </BusinessFormSection>
            {idx < sections.length - 1 && <div className={cx("form-divider")}></div>}
          </div>
        );
      })}
    </>
  );
};

export default BusinessFormStep0;
