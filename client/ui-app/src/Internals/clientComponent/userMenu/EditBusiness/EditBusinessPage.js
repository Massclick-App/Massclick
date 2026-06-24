import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, AlertTitle, Autocomplete, Box, Button, Chip, Step, StepLabel, Stepper, TextField } from "@mui/material";
import StickySearchBar from '../../StickySearchBar/StickySearchBar';
import Footer from "../../footer/footer";
import { editBusinessList, findBusinessByMobile } from "../../../../redux/actions/businessListAction";
import { businessCategorySearch } from "../../../../redux/actions/categoryAction";
import styles from "./EditBusinessPage.module.css";
const cx = createScopedClassNames(styles);
const defaultOpeningHours = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => ({
  day,
  open: "09:00",
  close: "18:00",
  isClosed: false,
  is24Hours: false
}));
const steps = ["Business", "Details", "KYC", "Hours", "SEO"];
const initialFormData = {
  name: "",
  businessName: "",
  plotNumber: "",
  street: "",
  pincode: "",
  globalAddress: "",
  location: "",
  email: "",
  contact: "",
  contactList: "",
  whatsappNumber: "",
  gstin: "",
  experience: "",
  category: "",
  subcategory: "",
  keywords: [],
  restaurantOptions: "",
  googleMap: "",
  website: "",
  facebook: "",
  instagram: "",
  youtube: "",
  pinterest: "",
  twitter: "",
  linkedin: "",
  bannerImage: "",
  businessDetails: "",
  kycDocuments: [],
  openingHours: defaultOpeningHours,
  title: "",
  description: "",
  slug: "",
  seoTitle: "",
  seoDescription: ""
};
const editableFields = Object.keys(initialFormData);
const normalizeBusiness = (business = {}) => {
  const normalized = editableFields.reduce((acc, key) => ({
    ...acc,
    [key]: business[key] ?? initialFormData[key]
  }), {});
  return {
    ...normalized,
    name: business.name || business.businessName || "",
    businessName: business.businessName || business.name || "",
    keywords: Array.isArray(business.keywords) ? business.keywords : String(business.keywords || "").split(",").map(item => item.trim()).filter(Boolean),
    openingHours: Array.isArray(business.openingHours) && business.openingHours.length ? business.openingHours : defaultOpeningHours,
    kycDocuments: Array.isArray(business.kycDocuments) ? business.kycDocuments : []
  };
};
const getBusinessId = business => business?._id?.$oid || business?._id || business?.id || business?.businessId || "";
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};
export default function EditBusinessPage() {
  const dispatch = useDispatch();
  const {
    matchedBusiness,
    matchedBusinessLoading,
    matchedBusinessError,
    loading: savingBusiness
  } = useSelector(state => state.businessListReducer || {});
  const {
    searchCategory = [],
    loading: categoryLoading
  } = useSelector(state => state.categoryReducer || {});
  const storedUser = useMemo(readStoredUser, []);
  const mobileNumber = localStorage.getItem("mobileNumber") || storedUser.mobileNumber1 || storedUser.contact || "";
  const [activeStep, setActiveStep] = useState(0);
  const [businessId, setBusinessId] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [bannerPreview, setBannerPreview] = useState("");
  const [kycDocumentPreviews, setKycDocumentPreviews] = useState([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [categoryKeywordSuggestions, setCategoryKeywordSuggestions] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  useEffect(() => {
    if (!mobileNumber) return;
    dispatch(findBusinessByMobile(mobileNumber)).then(business => {
      if (!business) return;
      setBusinessId(getBusinessId(business));
      setFormData(normalizeBusiness(business));
      setBannerPreview(business.bannerImage || "");
      setKycDocumentPreviews((business.kycDocuments || []).map((url, index) => ({
        name: `Existing document ${index + 1}`,
        preview: url,
        type: "existing",
        value: url
      })));
    });
  }, [dispatch, mobileNumber]);
  
  useEffect(() => {
    if (!matchedBusiness) return;
    setBusinessId(getBusinessId(matchedBusiness));
    setFormData(normalizeBusiness(matchedBusiness));
    setBannerPreview(matchedBusiness.bannerImage || "");
    setKycDocumentPreviews((matchedBusiness.kycDocuments || []).map((url, index) => ({
      name: `Existing document ${index + 1}`,
      preview: url,
      type: "existing",
      value: url
    })));
  }, [matchedBusiness]);
  const applyCategory = category => {
    if (!category || typeof category !== "object") return;
    setCategoryKeywordSuggestions(Array.isArray(category.keywords) ? category.keywords : []);
    setFormData(prev => ({
      ...prev,
      category: category.category || "",
      subcategory: category.subCategoryType || category.subcategory || prev.subcategory || "",
      keywords: [],
      slug: category.slug || "",
      seoTitle: category.seoTitle || "",
      seoDescription: category.seoDescription || "",
      title: category.title || "",
      description: category.description || ""
    }));
  };
  const updateField = (field, value) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [field]: value
      };
      if (field === "businessName") {
        next.name = value;
      }
      return next;
    });
  };
  const updateOpeningHour = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      openingHours: prev.openingHours.map((hour, hourIndex) => hourIndex === index ? {
        ...hour,
        [field]: value
      } : hour)
    }));
  };
  const addKeyword = () => {
    const keyword = keywordInput.trim();
    if (!keyword) return;
    setFormData(prev => {
      const keywords = Array.isArray(prev.keywords) ? prev.keywords : [];
      if (keywords.some(item => item.toLowerCase() === keyword.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        keywords: [...keywords, keyword]
      };
    });
    setKeywordInput("");
  };
  const removeKeyword = keyword => {
    setFormData(prev => ({
      ...prev,
      keywords: (prev.keywords || []).filter(item => item !== keyword)
    }));
  };
  const handleCategoryInputChange = value => {
    setCategoryKeywordSuggestions([]);
    updateField("category", value);
    if (value.trim().length >= 2) {
      dispatch(businessCategorySearch(value.trim()));
    }
  };
  const handleBannerChange = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updateField("bannerImage", reader.result);
      setBannerPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const handleKycUpload = async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const docs = await Promise.all(files.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        name: file.name,
        preview: reader.result,
        type: file.type,
        value: reader.result
      });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    setKycDocumentPreviews(prev => [...prev, ...docs]);
    setFormData(prev => ({
      ...prev,
      kycDocuments: [...(prev.kycDocuments || []), ...docs.map(doc => doc.value)]
    }));
    event.target.value = "";
  };
  const removeKycDocument = index => {
    setKycDocumentPreviews(prev => prev.filter((_, itemIndex) => itemIndex !== index));
    setFormData(prev => ({
      ...prev,
      kycDocuments: (prev.kycDocuments || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };
  const validateCurrentStep = () => {
    if (activeStep === 0) {
      if (!formData.businessName.trim()) return "Business name is required.";
      if (!formData.category.trim()) return "Business category is required.";
      if (!formData.location.trim()) return "Business location is required.";
      if (!formData.contact.trim()) return "Business contact number is required.";
    }
    return "";
  };
  const handleNext = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setErrorMessage("");
    setActiveStep(step => Math.min(step + 1, steps.length - 1));
  };
  const handleBack = () => {
    setErrorMessage("");
    setActiveStep(step => Math.max(step - 1, 0));
  };
  const handleSubmit = async event => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    const validationError = validateCurrentStep();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (!businessId) {
      setErrorMessage("Business ID not found for this login number.");
      return;
    }
    const payload = {
      ...formData,
      name: formData.businessName,
      keywords: Array.isArray(formData.keywords) ? formData.keywords : []
    };
    try {
      const updatedBusiness = await dispatch(editBusinessList(businessId, payload));
      const business = updatedBusiness?.data || updatedBusiness?.business || updatedBusiness;
      setFormData(normalizeBusiness(business));
      setBannerPreview(business?.bannerImage || bannerPreview);
      setSuccessMessage("Business details updated successfully.");
      setActiveStep(0);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.response?.data || error.message || "Failed to update business details.");
    }
  };
  const renderInput = ({
    field,
    label,
    type = "text",
    required = false
  }) => <div className={cx("edit-business-field")} key={field}>
      <label htmlFor={field}>
        {label}
        {required ? " *" : ""}
      </label>
      <input id={field} type={type} value={formData[field] || ""} onChange={event => updateField(field, event.target.value)} />
    </div>;
  const renderCategoryAutocomplete = () => <div className={cx("edit-business-field")}>
      <label htmlFor="categoryAutocomplete">Category *</label>
      <Autocomplete freeSolo loading={categoryLoading} options={searchCategory} getOptionLabel={option => typeof option === "string" ? option : option?.category || ""} inputValue={formData.category || ""} onInputChange={(event, value, reason) => {
      if (reason !== "reset") handleCategoryInputChange(value);
    }} onChange={(event, value) => {
      if (typeof value === "string") {
        updateField("category", value);
        return;
      }
      applyCategory(value);
    }} renderOption={(props, option) => <li {...props} key={option._id || option.category}>
            <div className={cx("edit-business-category-option")}>
              <strong>{option.category}</strong>
              <span>{option.title || option.description || option.slug}</span>
            </div>
          </li>} renderInput={params => <TextField {...params} placeholder="Search category..." />} />
      <p className={cx("edit-business-help-text")}>
        Selecting a suggestion updates title, description, slug and SEO fields. Keywords stay empty and appear as selectable suggestions.
      </p>
    </div>;
  const renderStep = () => {
    if (activeStep === 0) {
      return <div className={cx("edit-business-grid")}>
          {renderInput({
          field: "businessName",
          label: "Business Name",
          required: true
        })}
          {renderCategoryAutocomplete()}
          {renderInput({
          field: "subcategory",
          label: "Subcategory"
        })}
          {renderInput({
          field: "location",
          label: "Location",
          required: true
        })}
          {renderInput({
          field: "plotNumber",
          label: "Plot / Door Number"
        })}
          {renderInput({
          field: "street",
          label: "Street / Area"
        })}
          {renderInput({
          field: "pincode",
          label: "Pincode"
        })}
          {renderInput({
          field: "globalAddress",
          label: "Full Address"
        })}
          {renderInput({
          field: "contact",
          label: "Primary Contact",
          required: true
        })}
          {renderInput({
          field: "contactList",
          label: "Enquiry Number"
        })}
          {renderInput({
          field: "whatsappNumber",
          label: "WhatsApp Number"
        })}
          {renderInput({
          field: "email",
          label: "Business Email",
          type: "email"
        })}
          {renderInput({
          field: "gstin",
          label: "GSTIN"
        })}
          {renderInput({
          field: "experience",
          label: "Experience"
        })}
        </div>;
    }
    if (activeStep === 1) {
      return <>
          <div className={cx("edit-business-grid")}>
            {renderInput({
            field: "website",
            label: "Website"
          })}
            {renderInput({
            field: "googleMap",
            label: "Google Map Link"
          })}
            {renderInput({
            field: "facebook",
            label: "Facebook"
          })}
            {renderInput({
            field: "instagram",
            label: "Instagram"
          })}
            {renderInput({
            field: "youtube",
            label: "YouTube"
          })}
            {renderInput({
            field: "pinterest",
            label: "Pinterest"
          })}
            {renderInput({
            field: "twitter",
            label: "Twitter / X"
          })}
            {renderInput({
            field: "linkedin",
            label: "LinkedIn"
          })}
          </div>

          <div className={cx("edit-business-field edit-business-full")}>
            <label htmlFor="restaurantOptions">Restaurant / Hotel Option</label>
            <select id="restaurantOptions" value={formData.restaurantOptions || ""} onChange={event => updateField("restaurantOptions", event.target.value)}>
              <option value="">Not applicable</option>
              <option value="Veg">Vegetarian Only</option>
              <option value="Non-Veg">Non-Vegetarian</option>
              <option value="Both">Both Veg & Non-Veg</option>
            </select>
          </div>

          <div className={cx("edit-business-field edit-business-full")}>
            <label htmlFor="businessDetails">Business Details</label>
            <textarea id="businessDetails" rows={7} value={formData.businessDetails || ""} onChange={event => updateField("businessDetails", event.target.value)} />
          </div>

          <div className={cx("edit-business-upload")}>
            <div>
              <label>Banner Image</label>
              <p>Upload a new image only when you want to replace the current banner.</p>
              <Button variant="contained" component="label">
                Upload Banner
                <input type="file" accept="image/*" hidden onChange={handleBannerChange} />
              </Button>
            </div>
            {bannerPreview && <img src={bannerPreview} alt="Business banner preview" />}
          </div>
        </>;
    }
    if (activeStep === 2) {
      return <div className={cx("edit-business-kyc")}>
          <div className={cx("edit-business-upload edit-business-upload-compact")}>
            <div>
              <label>KYC Documents</label>
              <p>Upload identity proof and business documents as PDF, PNG, JPG, or JPEG.</p>
              <Button variant="contained" component="label">
                Upload Files
                <input type="file" multiple accept=".pdf,.png,.jpg,.jpeg" hidden onChange={handleKycUpload} />
              </Button>
            </div>
          </div>

          <div className={cx("edit-business-kyc-list")}>
            {kycDocumentPreviews.length === 0 ? <div className={cx("edit-business-loading")}>No KYC documents uploaded.</div> : kycDocumentPreviews.map((doc, index) => <div className={cx("edit-business-kyc-item")} key={`${doc.name}-${index}`}>
                  <div>
                    <strong>{doc.name}</strong>
                    <span>{doc.type || "document"}</span>
                  </div>
                  {String(doc.type).includes("image") && <img src={doc.preview} alt={doc.name} />}
                  {doc.type === "existing" ? <Chip label="Saved document" size="small" /> : <Button variant="outlined" color="error" onClick={() => removeKycDocument(index)}>
                      Remove
                    </Button>}
                </div>)}
          </div>
        </div>;
    }
    if (activeStep === 3) {
      return <div className={cx("edit-business-hours")}>
          {formData.openingHours.map((hour, index) => <div className={cx("edit-business-hour-row")} key={hour.day || index}>
              <strong>{hour.day}</strong>
              <input type="time" value={hour.is24Hours ? "00:00" : hour.open || "09:00"} disabled={hour.isClosed || hour.is24Hours} onChange={event => updateOpeningHour(index, "open", event.target.value)} />
              <input type="time" value={hour.is24Hours ? "23:59" : hour.close || "18:00"} disabled={hour.isClosed || hour.is24Hours} onChange={event => updateOpeningHour(index, "close", event.target.value)} />
              <select value={hour.isClosed ? "closed" : hour.is24Hours ? "24hours" : "open"} onChange={event => {
            const value = event.target.value;
            updateOpeningHour(index, "isClosed", value === "closed");
            updateOpeningHour(index, "is24Hours", value === "24hours");
            if (value === "24hours") {
              updateOpeningHour(index, "open", "00:00");
              updateOpeningHour(index, "close", "23:59");
            }
          }}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="24hours">24 Hours</option>
              </select>
            </div>)}
        </div>;
    }
    return <div className={cx("edit-business-grid")}>
        <div className={cx("edit-business-field edit-business-full")}>
          <label htmlFor="keywords">Keywords</label>
          <div className={cx("edit-business-keywords-box")}>
            {categoryKeywordSuggestions.length > 0 && <div className={cx("edit-business-keyword-suggestions")}>
                {categoryKeywordSuggestions.filter(keyword => !(formData.keywords || []).some(selectedKeyword => String(selectedKeyword).toLowerCase() === String(keyword).toLowerCase())).map(keyword => <button type="button" className={cx("edit-business-keyword-suggestion")} key={keyword} onClick={() => {
              setFormData(prev => ({
                ...prev,
                keywords: [...(prev.keywords || []), keyword]
              }));
            }}>
                    {keyword}
                  </button>)}
              </div>}
            <div className={cx("edit-business-keyword-chips")}>
              {(formData.keywords || []).map(keyword => <button type="button" className={cx("edit-business-keyword-chip")} key={keyword} onClick={() => removeKeyword(keyword)} title={`Remove ${keyword}`}>
                  <span>{keyword}</span>
                  <span aria-hidden="true">x</span>
                </button>)}
            </div>
            <div className={cx("edit-business-keyword-entry")}>
              <input id="keywords" value={keywordInput} onChange={event => setKeywordInput(event.target.value)} onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                addKeyword();
              }
            }} placeholder="Add keywords" />
              <button type="button" onClick={addKeyword} aria-label="Add keyword">
                +
              </button>
            </div>
          </div>
        </div>
        {renderInput({
        field: "title",
        label: "Display Title"
      })}
        {renderInput({
        field: "slug",
        label: "Slug"
      })}
        <div className={cx("edit-business-field edit-business-full")}>
          <label htmlFor="description">Display Description</label>
          <textarea id="description" rows={3} value={formData.description || ""} onChange={event => updateField("description", event.target.value)} />
        </div>
        {renderInput({
        field: "seoTitle",
        label: "SEO Title"
      })}
        <div className={cx("edit-business-field edit-business-full")}>
          <label htmlFor="seoDescription">SEO Description</label>
          <textarea id="seoDescription" rows={3} value={formData.seoDescription || ""} onChange={event => updateField("seoDescription", event.target.value)} />
        </div>
      </div>;
  };
  return <>
      <StickySearchBar />
      <div className={cx("edit-business-page")}>
        <div className={cx("edit-business-container")}>
          <div className={cx("edit-business-header")}>
            <span>Business Account</span>
            <h1>Edit Business</h1>
            <p>Update the business listing connected with your login number.</p>
          </div>

          {successMessage && <Alert severity="success" sx={{
          mb: 2
        }}>
              <AlertTitle>Success</AlertTitle>
              {successMessage}
            </Alert>}

          {(errorMessage || matchedBusinessError) && <Alert severity="error" sx={{
          mb: 2
        }}>
              <AlertTitle>Error</AlertTitle>
              {errorMessage || matchedBusinessError}
            </Alert>}

          {!mobileNumber && <Alert severity="warning" sx={{
          mb: 2
        }}>
              <AlertTitle>Login Required</AlertTitle>
              Mobile number was not found in the current login session.
            </Alert>}

          {matchedBusinessLoading ? <div className={cx("edit-business-loading")}>Loading your business details...</div> : !businessId ? <div className={cx("edit-business-loading")}>
              No business listing was found for this login number.
            </div> : <form onSubmit={handleSubmit}>
              <Stepper activeStep={activeStep} alternativeLabel className={cx("edit-business-stepper")}>
                {steps.map(label => <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>)}
              </Stepper>

              <div className={cx("edit-business-step-content")}>{renderStep()}</div>

              <Box className={cx("edit-business-actions")}>
                <Button disabled={activeStep === 0 || savingBusiness} onClick={handleBack}>
                  Back
                </Button>
                {activeStep < steps.length - 1 ? <Button variant="contained" onClick={handleNext}>
                    Save & Continue
                  </Button> : <Button variant="contained" type="submit" disabled={savingBusiness}>
                    {savingBusiness ? "Updating..." : "Update Business"}
                  </Button>}
              </Box>
            </form>}
        </div>
      </div>
      <Footer />
    </>;
}
