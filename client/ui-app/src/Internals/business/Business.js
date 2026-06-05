import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useRef, lazy, Suspense, useCallback } from "react";
import axiosInstance from "../../services/axiosInstance.js";
import { useDispatch, useSelector } from "react-redux";
import InputValidator from "../validators/inputValidator.js";
import { getAllBusinessList, createBusinessList, editBusinessList, deleteBusinessList, trackQrDownload } from "../../redux/actions/businessListAction";
import { getAllLocation, createLocation } from "../../redux/actions/locationAction";
import { getAllCategory, createCategory, editCategory, businessCategorySearch } from "../../redux/actions/categoryAction";
import { getAllUsersClient, getUserClientSuggestion } from "../../redux/actions/userClientAction.js";
import { getAllUsers } from "../../redux/actions/userAction.js";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { Box, Button, Typography, CircularProgress, IconButton, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
// Stepper Imports:
Stack, Stepper, Step, StepLabel, InputAdornment, Chip, Checkbox, FormControlLabel, RadioGroup, Radio, Slider, FormGroup } from "@mui/material";
import PaidIcon from '@mui/icons-material/Paid';
import PendingIcon from '@mui/icons-material/Pending';
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import { checkPhonePeStatus, createPhonePePayment } from "../../redux/actions/phonePayAction.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import Tooltip from "@mui/material/Tooltip";
import styles from "./business.module.css";
import GooglePlacesInput from "../../components/GooglePlacesInput/GooglePlacesInput";
import AdminViewTabs from "../../components/AdminViewTabs.js";
const cx = createScopedClassNames(styles);
const FORCE_BYPASS_BLOCKED_FIELDS = new Set(["businessName", "category", "location"]);
const ReactQuill = lazy(() => import('react-quill').then(m => {
  require('react-quill/dist/quill.snow.css');
  return {
    default: m.default
  };
}));
const ORANGE_PRIMARY = '#FF8C00';
const ORANGE_HOVER = '#D97800';
const ColorlibConnector = styled(StepConnector)(({
  theme
}) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient( 95deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`
    }
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient( 95deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`
    }
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1
  }
}));
const ColorlibStepIconRoot = styled('div')(({
  theme,
  ownerState
}) => ({
  backgroundColor: '#ccc',
  zIndex: 1,
  color: '#fff',
  width: 50,
  height: 50,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  ...(ownerState.active && {
    backgroundImage: `linear-gradient( 136deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`,
    boxShadow: '0 4px 10px 0 rgba(255, 140, 0, 0.4)'
  }),
  ...(ownerState.completed && {
    backgroundImage: `linear-gradient( 136deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`
  })
}));
function ColorlibStepIcon(props) {
  const {
    active,
    completed,
    className
  } = props;
  const icons = {
    1: <BusinessCenterIcon />,
    2: <CategoryIcon />,
    3: <PrivacyTipIcon />,
    4: <VerifiedUserIcon />
  };
  return <ColorlibStepIconRoot ownerState={{
    completed,
    active
  }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>;
}
ColorlibStepIcon.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  completed: PropTypes.bool,
  icon: PropTypes.node
};
const steps = ["Business Details", "Category", "Privacy Settings", "Payment"];
const BusinessList = React.memo(() => {
  const dispatch = useDispatch();
  const {
    enqueueSnackbar
  } = useSnackbar();
  const {
    businessList = [],
    total = 0,
    loading
  } = useSelector(state => state.businessListReducer || {});
  const {
    searchSuggestion = []
  } = useSelector(state => state.userClientReducer || {});
  const [showCategorySuggest, setShowCategorySuggest] = useState(false);
  const [showLocationSuggest, setShowLocationSuggest] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const {
    searchCategory
  } = useSelector(state => state.categoryReducer);
  const {
    location = []
  } = useSelector(state => state.locationReducer || {});
  const {
    category = []
  } = useSelector(state => state.categoryReducer || {});
  const fileInputRef = useRef();
  const [businessvalue, setBusinessValue] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [activeView, setActiveView] = useState("list");
  const [editId, setEditId] = useState(null);
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [createdBusinessId, setCreatedBusinessId] = useState(null);
  const [createUserId, setCreateUserId] = useState(null);
  const [galleryDialog, setGalleryDialog] = useState({
    open: false,
    data: null
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputKeyword, setInputKeyword] = useState("");
  
  // Search & Filter States
  const [searchMode, setSearchMode] = useState("easy"); // "easy" or "advanced"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all"); // "all", "paid", "pending"
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [activeFilters, setActiveFilters] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    category: "",
    location: "",
    paymentStatus: "all"
  });
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  
  const handlePayNow = row => {
    const amount = 1;
    let businessId = row?._id?.$oid || row?._id || row?.businessId || row?.id || createdBusinessId;
    let userId = row?.createdBy?.$oid || (typeof row?.createdBy === "string" ? row.createdBy : null) || createUserId;
    if (!row) {
      businessId = createdBusinessId;
      userId = createUserId;
    }
    if (!businessId || !userId) {
      console.error("❌ Missing businessId or userId:", {
        businessId,
        userId
      });
      return;
    }
    dispatch(createPhonePePayment(amount, userId, businessId));
  };
  const [activeStep, setActiveStep] = useState(0);
  const [kycFiles, setKycFiles] = useState([]);
  const handleKycUpload = event => {
    clearForceBypassForFields("kycDocuments");
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(f => f instanceof File);
    const newFiles = validFiles.map(file => {
      file.preview = URL.createObjectURL(file);
      return file;
    });
    setKycFiles(prev => [...prev, ...newFiles]);
  };
  const handleRemoveFile = index => {
    clearForceBypassForFields("kycDocuments");
    setKycFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      URL.revokeObjectURL(updatedFiles[index].preview);
      updatedFiles.splice(index, 1);
      return updatedFiles;
    });
  };
  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const handleGalleryImageChange = e => {
    const files = Array.from(e.target.files);
    const readers = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(images => {
      setNewGalleryImages(prev => [...prev, ...images]);
    });
  };
  const handleUploadGalleryImages = async () => {
    if (!galleryDialog.data?._id) return;
    try {
      const uploadPayload = {
        businessImages: newGalleryImages.length > 0 ? newGalleryImages : null
      };
      const updatedBusiness = await dispatch(editBusinessList(galleryDialog.data._id, uploadPayload));
      setGalleryDialog(prev => ({
        ...prev,
        data: {
          ...prev.data,
          businessImages: updatedBusiness.businessImages
        }
      }));
      setNewGalleryImages([]);
      handleCloseGallery();
      await dispatch(getAllBusinessList());
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };
  const fieldsToCheck = ["keywords", "slug", "seoTitle", "seoDescription", "title", "description"];
  const getUpdatedCategoryFields = (existing, current) => {
    const updates = {};
    fieldsToCheck.forEach(field => {
      if (Array.isArray(current[field])) {
        const newValues = current[field].map(k => k.trim().toLowerCase()).filter(k => !existing[field]?.map(e => e.trim().toLowerCase()).includes(k));
        if (newValues.length > 0) {
          updates[field] = [...existing[field], ...newValues];
        }
      } else {
        if (current[field] && current[field] !== existing[field]) {
          updates[field] = current[field];
        }
      }
    });
    return updates;
  };
  const defaultOpeningHours = [{
    day: "Monday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }, {
    day: "Tuesday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }, {
    day: "Wednesday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }, {
    day: "Thursday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }, {
    day: "Friday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }, {
    day: "Saturday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }, {
    day: "Sunday",
    open: "",
    close: "",
    isClosed: false,
    is24Hours: false
  }];
  const handleOpenGallery = rowId => {
    const business = businessList.find(b => b._id === rowId);
    if (business) {
      setGalleryDialog({
        open: true,
        data: business
      });
      setNewGalleryImages([]);
    } else {
      console.error("Business not found in Redux store");
    }
  };
  const handleCloseGallery = () => {
    setGalleryDialog({
      open: false,
      data: null
    });
  };
  const [formData, setFormData] = useState({
    clientId: "",
    businessName: "",
    plotNumber: "",
    street: "",
    pincode: "",
    globalAddress: "",
    email: "",
    contact: "",
    contactList: "",
    gstin: "",
    whatsappNumber: "",
    experience: "",
    location: "",
    category: "",
    keywords: [],
    slug: "",
    seoTitle: "",
    seoDescription: "",
    title: "",
    description: "",
    bannerImage: "",
    googleMap: "",
    website: "",
    facebook: "",
    instagram: "",
    youtube: "",
    pinterest: "",
    twitter: "",
    linkedin: "",
    businessDetails: "",
    kycDocuments: [],
    openingHours: defaultOpeningHours,
    geoLocation: {
      type: "Point",
      coordinates: ["", ""]
    },
    filters: {}
  });
  const [categoryFilterConfig, setCategoryFilterConfig] = useState([]);
  const [filterConfigLoading, setFilterConfigLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [forceBypassedFields, setForceBypassedFields] = useState([]);
  const [warnLevel, setWarnLevel] = useState(0);
  const [warnDialog, setWarnDialog] = useState(false);
  const [preview, setPreview] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null
  });
  const modules = {
    toolbar: [[{
      'header': '1'
    }, {
      'header': '2'
    }], ['bold', 'italic', 'underline', 'strike'], [{
      'list': 'ordered'
    }, {
      'list': 'bullet'
    }], ['link', 'image', 'video'], ['clean']]
  };
  const formats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "link", "image", "video"];
  const isForceBypassableField = field => Boolean(field) && !FORCE_BYPASS_BLOCKED_FIELDS.has(field);
  const getUniqueFields = fields => [...new Set((fields || []).filter(Boolean))];
  const clearForceBypassForFields = useCallback(fields => {
    const names = Array.isArray(fields) ? fields : [fields];
    setForceBypassedFields(prev => prev.filter(field => !names.includes(field)));
    setWarnLevel(0);
  }, []);
  const handleBusinessChange = content => {
    clearForceBypassForFields("businessDetails");
    setBusinessValue(content);
    setFormData(prev => ({
      ...prev,
      businessDetails: content
    }));
    updateLiveValidation({
      ...formData,
      businessDetails: content
    }, "businessDetails");
  };
  const handleOpeningHourChange = (index, field, value) => {
    const bypassField = `openingHours.${formData.openingHours?.[index]?.day}`;
    clearForceBypassForFields(bypassField);
    setFormData(prev => {
      const updatedHours = [...(prev.openingHours || defaultOpeningHours)];
      updatedHours[index][field] = value;
      if (field === "isClosed" && value) {
        updatedHours[index].open = "";
        updatedHours[index].close = "";
      }
      if (index === 0 && (field === "open" || field === "close")) {
        const monday = updatedHours[0];
        for (let i = 1; i < updatedHours.length; i++) {
          if (!updatedHours[i].isClosed && !updatedHours[i].is24Hours) {
            updatedHours[i].open = monday.open;
            updatedHours[i].close = monday.close;
          }
        }
      }
      return {
        ...prev,
        openingHours: updatedHours
      };
    });
    const baseHours = [...(formData.openingHours || defaultOpeningHours)];
    baseHours[index] = {
      ...baseHours[index],
      [field]: value
    };
    updateLiveValidation({
      ...formData,
      openingHours: baseHours
    }, `openingHours.${baseHours[index]?.day}`);
  };
  useEffect(() => {
    dispatch(getAllBusinessList());
    dispatch(getAllLocation({
      pageNo: 1,
      pageSize: 1000
    }));
    dispatch(getAllCategory({
      pageNo: 1,
      pageSize: 1000,
      options: {
        status: "active"
      }
    }));
    dispatch(businessCategorySearch(""));
    dispatch(getAllUsersClient());
    dispatch(getAllUsers());
    dispatch(checkPhonePeStatus());
  }, [dispatch]);

  // ===== FILTER & SEARCH HANDLERS =====
  const normalizeSearchValue = value => String(value ?? "").replace(/<[^>]*>/g, " ").toLowerCase().trim();

  const valueMatchesSearch = (value, term) => {
    if (Array.isArray(value)) {
      return value.some(item => valueMatchesSearch(item, term));
    }
    return normalizeSearchValue(value).includes(term);
  };

  const matchesSelectedValue = (value, selectedValue) => {
    if (!selectedValue) return true;
    return normalizeSearchValue(value) === normalizeSearchValue(selectedValue);
  };

  const getServerSearchQuery = (filters = appliedFilters) => {
    return (filters.searchTerm || filters.category || filters.location || "").trim();
  };

  const updateActiveFilters = (newFilters) => {
    const filters = [];
    const cleanFilters = {
      searchTerm: (newFilters.searchTerm || "").trim(),
      category: newFilters.category || "",
      location: newFilters.location || "",
      paymentStatus: newFilters.paymentStatus || "all"
    };

    if (cleanFilters.searchTerm) filters.push({ type: "search", label: `Search: ${cleanFilters.searchTerm}`, value: cleanFilters.searchTerm });
    if (cleanFilters.category) filters.push({ type: "category", label: `Category: ${cleanFilters.category}`, value: cleanFilters.category });
    if (cleanFilters.location) filters.push({ type: "location", label: `Location: ${cleanFilters.location}`, value: cleanFilters.location });
    if (cleanFilters.paymentStatus !== "all") filters.push({ type: "payment", label: `Payment: ${cleanFilters.paymentStatus}`, value: cleanFilters.paymentStatus });
    setActiveFilters(filters);
  };

  const handleApplyFilters = () => {
    const nextFilters = {
      searchTerm: searchTerm.trim(),
      category: selectedCategory,
      location: selectedLocation,
      paymentStatus
    };
    setAppliedFilters(nextFilters);
    updateActiveFilters(nextFilters);
    setTableRefreshKey(prev => prev + 1);
  };

  const handleClearFilters = () => {
    const nextFilters = {
      searchTerm: "",
      category: "",
      location: "",
      paymentStatus: "all"
    };
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedLocation("");
    setPaymentStatus("all");
    setDateRange({ from: "", to: "" });
    setAppliedFilters(nextFilters);
    setActiveFilters([]);
    setTableRefreshKey(prev => prev + 1);
  };

  const handleRemoveFilter = (filterType) => {
    const nextFilters = {
      ...appliedFilters,
      ...(filterType === "search" ? { searchTerm: "" } : {}),
      ...(filterType === "category" ? { category: "" } : {}),
      ...(filterType === "location" ? { location: "" } : {}),
      ...(filterType === "payment" ? { paymentStatus: "all" } : {})
    };

    setSearchTerm(nextFilters.searchTerm);
    setSelectedCategory(nextFilters.category);
    setSelectedLocation(nextFilters.location);
    setPaymentStatus(nextFilters.paymentStatus);
    setAppliedFilters(nextFilters);
    updateActiveFilters(nextFilters);
    setTableRefreshKey(prev => prev + 1);
  };

  const getFilteredRows = () => {
    return rows.filter(row => {
      const {
        searchTerm: appliedSearchTerm,
        category: appliedCategory,
        location: appliedLocation,
        paymentStatus: appliedPaymentStatus
      } = appliedFilters;

      // Search term filter
      if (appliedSearchTerm) {
        const term = normalizeSearchValue(appliedSearchTerm);
        const matchesSearch = [
          row.businessName,
          row.location,
          row.category,
          row.email,
          row.contact,
          row.contactList,
          row.whatsappNumber,
          row.globalAddress,
          row.street,
          row.pincode,
          row.gstin,
          row.title,
          row.description,
          row.seoTitle,
          row.seoDescription,
          row.slug,
          row.businessDetails,
          row.keywords,
          row.mniDetails?.map(item => item?.categoryGroup)
        ].some(value => valueMatchesSearch(value, term));
        if (!matchesSearch) return false;
      }

      // Category filter
      if (!matchesSelectedValue(row.category, appliedCategory)) return false;

      // Location filter
      if (!matchesSelectedValue(row.location, appliedLocation)) return false;

      // Payment status filter
      if (appliedPaymentStatus !== "all") {
        const isPaid = row.amountPaid === true;
        if (appliedPaymentStatus === "paid" && !isPaid) return false;
        if (appliedPaymentStatus === "pending" && isPaid) return false;
      }

      return true;
    });
  };

  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    if (name === "category") {
      const selected = category.find(cat => cat.category === value);
      const categoryFields = ["category", "keywords", "title", "description", "seoTitle", "seoDescription", "slug"];
      clearForceBypassForFields(categoryFields);
      const nextData = {
        ...formData,
        category: value,
        keywords: selected?.keywords || [],
        slug: selected?.slug || "",
        seoTitle: selected?.seoTitle || "",
        seoDescription: selected?.seoDescription || "",
        title: selected?.title || "",
        description: selected?.description || ""
      };
      setFormData(prev => ({
        ...prev,
        category: value,
        keywords: selected?.keywords || [],
        slug: selected?.slug || "",
        seoTitle: selected?.seoTitle || "",
        seoDescription: selected?.seoDescription || "",
        title: selected?.title || "",
        description: selected?.description || ""
      }));
      updateLiveValidation(nextData, categoryFields);
      return;
    }
    clearForceBypassForFields(name);
    const nextData = {
      ...formData,
      [name]: value
    };
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    updateLiveValidation(nextData, name);
  };
  const handlePlaceSelect = useCallback((place) => {
    const nextData = {
      ...formData,
      street: place.street || formData.street,
      pincode: place.pincode || formData.pincode,
      location: place.location || formData.location,
      geoLocation: {
        type: "Point",
        coordinates: [String(place.lng), String(place.lat)]
      }
    };
    setFormData(nextData);
    updateLiveValidation(nextData, ["street", "pincode", "location", "geoLatitude", "geoLongitude"]);
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGeoCoordinateChange = (coordinateIndex, value) => {
    clearForceBypassForFields(coordinateIndex === 1 ? "geoLatitude" : "geoLongitude");
    const coordinates = Array.isArray(formData.geoLocation?.coordinates) ? [...formData.geoLocation.coordinates] : ["", ""];
    coordinates[coordinateIndex] = value;
    const nextData = {
      ...formData,
      geoLocation: {
        type: "Point",
        coordinates
      }
    };
    setFormData(prev => {
      const nextCoordinates = Array.isArray(prev.geoLocation?.coordinates) ? [...prev.geoLocation.coordinates] : ["", ""];
      nextCoordinates[coordinateIndex] = value;

      return {
        ...prev,
        geoLocation: {
          type: "Point",
          coordinates: nextCoordinates
        }
      };
    });
    updateLiveValidation(nextData, coordinateIndex === 1 ? "geoLatitude" : "geoLongitude");
  };
  const normalizeText = value => String(value ?? "").trim().replace(/\s+/g, " ");
  const stripHtml = value => normalizeText(String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " "));
  const digitsOnly = value => String(value ?? "").replace(/\D/g, "");
  const isValidUrl = value => {
    try {
      const url = new URL(String(value ?? "").trim());
      return ["http:", "https:"].includes(url.protocol);
    } catch {
      return false;
    }
  };
  const isEmptyFilterValue = value => {
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "boolean") return false;
    return normalizeText(value) === "";
  };
  const getCleanBusinessFormData = data => ({
    ...data,
    clientId: normalizeText(data.clientId),
    businessName: normalizeText(data.businessName),
    plotNumber: normalizeText(data.plotNumber),
    street: normalizeText(data.street),
    pincode: normalizeText(data.pincode),
    globalAddress: normalizeText(data.globalAddress),
    email: normalizeText(data.email).toLowerCase(),
    contact: normalizeText(data.contact),
    contactList: normalizeText(data.contactList),
    gstin: normalizeText(data.gstin).toUpperCase(),
    whatsappNumber: normalizeText(data.whatsappNumber),
    experience: normalizeText(data.experience),
    location: normalizeText(data.location),
    category: normalizeText(data.category),
    keywords: Array.isArray(data.keywords) ? [...new Set(data.keywords.map(normalizeText).filter(Boolean))] : [],
    slug: normalizeText(data.slug).toLowerCase(),
    seoTitle: normalizeText(data.seoTitle),
    seoDescription: normalizeText(data.seoDescription),
    title: normalizeText(data.title),
    description: normalizeText(data.description),
    googleMap: normalizeText(data.googleMap),
    website: normalizeText(data.website),
    facebook: normalizeText(data.facebook),
    instagram: normalizeText(data.instagram),
    youtube: normalizeText(data.youtube),
    pinterest: normalizeText(data.pinterest),
    twitter: normalizeText(data.twitter),
    linkedin: normalizeText(data.linkedin),
    businessDetails: data.businessDetails,
    geoLocation: {
      type: "Point",
      coordinates: Array.isArray(data.geoLocation?.coordinates) ? data.geoLocation.coordinates.map(value => String(value ?? "").trim()) : ["", ""]
    }
  });
  const getValidationMessage = error => {
    const example = error.example ? ` Example: ${error.example}` : "";
    const suggestion = error.suggestion ? ` Suggestion: ${error.suggestion}` : "";
    return `${error.label}: ${error.message}${example}${suggestion}`;
  };
  const passOrMessage = (condition, message) => condition ? true : message;
  const getBusinessValidationRules = data => {
    const latitudeRaw = data.geoLocation?.coordinates?.[1];
    const longitudeRaw = data.geoLocation?.coordinates?.[0];
    const socialRules = [
      ["facebook", "Facebook", "https://facebook.com/massclick"],
      ["instagram", "Instagram", "https://instagram.com/massclick"],
      ["youtube", "YouTube", "https://youtube.com/@massclick"],
      ["pinterest", "Pinterest", "https://pinterest.com/massclick"],
      ["twitter", "Twitter", "https://x.com/massclick"],
      ["linkedin", "LinkedIn", "https://linkedin.com/company/massclick"]
    ].map(([field, label, example]) => ({
      field,
      label,
      example,
      suggestion: "Leave it blank if the business does not have this profile.",
      validate: value => !value || isValidUrl(value) || "must be a valid http or https URL."
    }));
    const categoryFilterRules = (categoryFilterConfig || []).filter(filter => filter.isRequired).map(filter => ({
      field: `filters.${filter.key}`,
      label: filter.label || filter.key,
      step: 1,
      required: true,
      example: Array.isArray(filter.options) && filter.options.length > 0 ? String(filter.options[0]) : "Select the applicable option",
      suggestion: "This field is required by the selected category.",
      getValue: source => source.filters?.[filter.key]
    }));
    const openingHourRules = (data.openingHours || []).flatMap(hour => {
      if (hour.isClosed || hour.is24Hours) return [];
      return [{
        field: `openingHours.${hour.day}`,
        label: `${hour.day} hours`,
        required: true,
        example: "09:00 to 18:00",
        suggestion: "Enter both times, or mark the day as closed/24 hours.",
        getValue: () => hour.open && hour.close ? `${hour.open}-${hour.close}` : "",
        validate: () => passOrMessage(!hour.open || !hour.close || hour.open < hour.close, "closing time must be after opening time.")
      }];
    });

    return [
      { field: "clientId", label: "Client ID", required: true, example: "MC-1023 - Kumar Stores", suggestion: "Pick an existing client suggestion." },
      { field: "businessName", label: "Business name", required: true, example: "Kumar Electricals", suggestion: "Use the legal or public shop name.", validate: value => passOrMessage(value.length >= 2 && !/(.)\1{3,}/.test(value), "must be at least 2 characters and not repeated/gibberish.") },
      { field: "plotNumber", label: "Plot number", required: true, example: "12A", suggestion: "Use door, shop, plot, or building number." },
      { field: "street", label: "Street", required: true, example: "Gandhi Road", suggestion: "Add the road, area, or landmark street." },
      { field: "pincode", label: "Pincode", required: true, example: "600001", suggestion: "Enter a valid 6 digit Indian pincode.", validate: value => /^[1-9][0-9]{5}$/.test(value) || "must be a valid 6 digit Indian pincode." },
      { field: "location", label: "Location", required: true, example: "Chennai", suggestion: "Choose from location suggestions when available." },
      { field: "globalAddress", label: "Global address", required: true, example: "12A Gandhi Road, Chennai, Tamil Nadu 600001", suggestion: "Enter the complete searchable address." },
      { field: "email", label: "Email", required: true, example: "owner@example.com", suggestion: "Use the business or owner email.", validate: value => /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value) || "must be a valid email address." },
      { field: "contact", label: "Phone", required: true, example: "9876543210", suggestion: "Enter the main customer-facing number.", validate: value => passOrMessage(digitsOnly(value).length >= 10 && digitsOnly(value).length <= 15, "must contain 10 to 15 digits.") },
      { field: "contactList", label: "Enquiry number", required: true, example: "9876543210", suggestion: "Use the number that should receive enquiries.", validate: value => passOrMessage(digitsOnly(value).length >= 10 && digitsOnly(value).length <= 15, "must contain 10 to 15 digits.") },
      { field: "whatsappNumber", label: "WhatsApp number", required: true, example: "9876543210", suggestion: "Use a WhatsApp-enabled number.", validate: value => passOrMessage(digitsOnly(value).length >= 10 && digitsOnly(value).length <= 15, "must contain 10 to 15 digits.") },
      { field: "gstin", label: "GSTIN", required: true, example: "22AAAAA0000A1Z5", suggestion: "Use the registered GSTIN in uppercase format.", validate: value => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value) || "must be a valid GSTIN." },
      { field: "experience", label: "Experience", required: true, example: "5", suggestion: "Enter years only, between 0 and 100.", validate: value => passOrMessage(/^\d{1,3}$/.test(value) && Number(value) >= 0 && Number(value) <= 100, "must be a number between 0 and 100.") },
      { field: "googleMap", label: "Google Map link", required: true, example: "https://maps.google.com/?q=13.0827,80.2707", suggestion: "Paste the share link from Google Maps.", validate: value => isValidUrl(value) || "must be a valid http or https URL." },
      { field: "geoLatitude", label: "Latitude", required: true, example: "13.0827", suggestion: "Use the latitude copied from Google Maps.", getValue: () => latitudeRaw, validate: value => passOrMessage(Number.isFinite(Number(value)) && Number(value) >= -90 && Number(value) <= 90, "must be a number between -90 and 90.") },
      { field: "geoLongitude", label: "Longitude", required: true, example: "80.2707", suggestion: "Use the longitude copied from Google Maps.", getValue: () => longitudeRaw, validate: value => passOrMessage(Number.isFinite(Number(value)) && Number(value) >= -180 && Number(value) <= 180, "must be a number between -180 and 180.") },
      { field: "website", label: "Website", required: true, example: "https://example.com", suggestion: "Use the official website URL.", validate: value => isValidUrl(value) || "must be a valid http or https URL." },
      { field: "bannerImage", label: "Business banner image", required: true, example: "shop-front.jpg", suggestion: "Upload a clear shop, logo, or business image.", getValue: source => preview || source.bannerImage },
      { field: "kycDocuments", label: "KYC document", required: true, example: "GST certificate or shop proof", suggestion: "Upload at least one verification document.", getValue: source => editMode ? [...(source.kycDocuments || []), ...kycFiles] : kycFiles },
      { field: "businessDetails", label: "Business details", required: true, example: "We provide electrical repairs, wiring, and inverter service in Chennai.", suggestion: "Write at least 20 useful characters.", getValue: source => stripHtml(source.businessDetails), validate: value => value.length >= 20 || "must be at least 20 characters." },
      { field: "category", label: "Category", step: 1, required: true, example: "Electricians", suggestion: "Pick or type the closest business category." },
      { field: "keywords", label: "Keywords", step: 1, required: true, example: "electrician, wiring, inverter repair", suggestion: "Add at least one search keyword.", getValue: source => source.keywords },
      { field: "title", label: "Display title", step: 1, required: true, example: "Trusted Electrician in Chennai", suggestion: "Use a customer-friendly listing title." },
      { field: "description", label: "Display description", step: 1, required: true, example: "Fast electrical repair and installation services for homes and shops.", suggestion: "Summarize what the business offers." },
      { field: "seoTitle", label: "SEO title", step: 1, required: true, example: "Kumar Electricals - Electrician in Chennai", suggestion: "Keep it between 20 and 70 characters.", validate: value => passOrMessage(value.length >= 20 && value.length <= 70, "should be 20 to 70 characters.") },
      { field: "seoDescription", label: "SEO description", step: 1, required: true, example: "Book Kumar Electricals for wiring, inverter repair, and electrical services in Chennai.", suggestion: "Keep it between 50 and 170 characters.", validate: value => passOrMessage(value.length >= 50 && value.length <= 170, "should be 50 to 170 characters.") },
      { field: "slug", label: "Slug", step: 1, required: true, example: "kumar-electricals-chennai", suggestion: "Use lowercase words separated by hyphens.", validate: value => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || "must use lowercase letters, numbers, and hyphens only." },
      ...socialRules,
      ...categoryFilterRules,
      ...openingHourRules
    ];
  };
  const validateBusinessEntryData = data => {
    return getBusinessValidationRules(data).reduce((errors, rule) => {
      const value = rule.getValue ? rule.getValue(data) : data[rule.field];
      const empty = isEmptyFilterValue(value);

      if (rule.required && empty) {
        return [...errors, {
          ...rule,
          message: "is required."
        }];
      }

      if (!empty && rule.validate) {
        const result = rule.validate(value, data);
        if (result !== true) {
          return [...errors, {
            ...rule,
            message: typeof result === "string" ? result : "has invalid information."
          }];
        }
      }

      return errors;
    }, []);
  };
  const updateLiveValidation = (nextFormData, fieldNames) => {
    const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    const cleanData = getCleanBusinessFormData(nextFormData);
    const bypassed = new Set(forceBypassedFields);
    const matchingErrors = validateBusinessEntryData(cleanData).filter(error => names.includes(error.field) && !bypassed.has(error.field));

    setFieldErrors(prev => {
      const next = { ...prev };
      names.forEach(name => {
        delete next[name];
      });
      matchingErrors.forEach(error => {
        next[error.field] = getValidationMessage(error);
      });
      return next;
    });
  };
  const handleEdit = row => {
    setEditMode(true);
    setActiveView("form");
    setEditId(row.id);
    setFormData({
      clientId: row.clientId || "",
      businessName: row.businessName || "",
      plotNumber: row.plotNumber || "",
      street: row.street || "",
      pincode: row.pincode || "",
      globalAddress: row.globalAddress || "",
      email: row.email || "",
      contact: row.contact || "",
      contactList: row.contactList || "",
      gstin: row.gstin || "",
      whatsappNumber: row.whatsappNumber || "",
      experience: row.experience || "",
      location: row.location || "",
      category: row.category || "",
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      slug: row.slug || "",
      seoTitle: row.seoTitle || "",
      seoDescription: row.seoDescription || "",
      title: row.title || "",
      description: row.description || "",
      restaurantOptions: row.restaurantOptions || "",
      bannerImage: row.bannerImage || "",
      googleMap: row.googleMap || "",
      website: row.website || "",
      facebook: row.facebook || "",
      instagram: row.instagram || "",
      youtube: row.youtube || "",
      pinterest: row.pinterest || "",
      twitter: row.twitter || "",
      linkedin: row.linkedin || "",
      businessDetails: row.businessDetails || "",
      openingHours: row.openingHours?.length ? row.openingHours : defaultOpeningHours,
      kycDocuments: row.kycDocuments || [],
      geoLocation: {
        type: "Point",
        coordinates: Array.isArray(row.geoLocation?.coordinates) ? row.geoLocation.coordinates.map(value => value ?? "") : ["", ""]
      },
      filters: (row.filters && typeof row.filters === "object") ? row.filters : {}
    });
    setBusinessValue(row.businessDetails || "");
    setPreview(row.bannerImage || null);
    setActiveStep(0);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  // Fetch filterConfig when category changes
  useEffect(() => {
    const cat = formData.category;
    if (!cat) { setCategoryFilterConfig([]); return; }
    // Check Redux searchCategory first
    const found = searchCategory?.find(c => c.category?.toLowerCase() === cat.toLowerCase());
    if (found && Array.isArray(found.filterConfig) && found.filterConfig.length > 0) {
      setCategoryFilterConfig(found.filterConfig);
      return;
    }
    // Fallback: fetch from API
    setFilterConfigLoading(true);
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    axiosInstance.get(`/category/${encodeURIComponent(slug)}/filters`)
      .then(res => setCategoryFilterConfig(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategoryFilterConfig([]))
      .finally(() => setFilterConfigLoading(false));
  }, [formData.category]); // eslint-disable-line

  const handleFilterChange = useCallback((key, value) => {
    clearForceBypassForFields(`filters.${key}`);
    setFormData(prev => {
      const nextData = { ...prev, filters: { ...prev.filters, [key]: value } };
      updateLiveValidation(nextData, `filters.${key}`);
      return nextData;
    });
  }, [clearForceBypassForFields]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = row => {
    setDeleteDialog({
      open: true,
      id: row.id,
      name: row.businessName
    });
  };
  const confirmDelete = () => {
    if (deleteDialog.id) {
      dispatch(deleteBusinessList(deleteDialog.id)).then(() => {
        dispatch(getAllBusinessList());
      });
    }
    setDeleteDialog({
      open: false,
      id: null,
      name: ""
    });
  };
  const handleImageChange = e => {
    clearForceBypassForFields("bannerImage");
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          bannerImage: reader.result
        }));
        setPreview(reader.result);
        updateLiveValidation({
          ...formData,
          bannerImage: reader.result
        }, "bannerImage");
      };
      reader.readAsDataURL(file);
    }
  };
  const buildFieldErrorMap = errors => errors.reduce((acc, error) => ({
    ...acc,
    [error.field]: getValidationMessage(error)
  }), {});
  const getFirstErrorStep = errors => typeof errors[0]?.step === "number" ? errors[0].step : 0;
  const getActiveValidationErrors = (cleanedFormData, forceBypassFields = []) => {
    const bypassed = new Set([...forceBypassedFields, ...forceBypassFields]);
    return validateBusinessEntryData(cleanedFormData).filter(error => !bypassed.has(error.field));
  };
  const showBusinessValidationErrors = validationErrors => {
    setActiveStep(getFirstErrorStep(validationErrors));
    setFieldErrors(buildFieldErrorMap(validationErrors));
    const errorMessage = validationErrors.slice(0, 8).map(error => `- ${getValidationMessage(error)}`).join("\n");
    enqueueSnackbar(`Please fix these fields before saving:\n${errorMessage}${validationErrors.length > 8 ? `\n- ${validationErrors.length - 8} more issue(s)` : ""}`, {
      variant: "error"
    });
  };
  const saveBusiness = async ({ forceBypassFields = [] } = {}) => {
    const cleanedFormData = getCleanBusinessFormData(formData);
    const bypassFields = getUniqueFields(forceBypassFields).filter(isForceBypassableField);
    const validationErrors = getActiveValidationErrors(cleanedFormData, bypassFields);

    if (validationErrors.length > 0) {
      showBusinessValidationErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    if (bypassFields.length > 0) {
      setForceBypassedFields(prev => getUniqueFields([...prev, ...bypassFields]));
      enqueueSnackbar(`Force bypass applied for ${bypassFields.length} optional field${bypassFields.length === 1 ? "" : "s"}.`, {
        variant: "warning"
      });
    }

    // Validate business data using InputValidator
    try {
      const businessData = {
        businessName: cleanedFormData.businessName || '',
        category: cleanedFormData.category || '',
        location: cleanedFormData.location || '',
        contact: cleanedFormData.contact || '',
        keywords: cleanedFormData.keywords || []
      };
      InputValidator.validateBusiness(businessData);
    } catch (error) {
      const errorMessage = error.message.split('\n').filter(line => line.trim()).join('\n');
      enqueueSnackbar(`Validation error: ${errorMessage}`, {
        variant: "error"
      });
      return;
    }
    const kycBase64 = await Promise.all(kycFiles.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
    const longitudeRaw = cleanedFormData.geoLocation?.coordinates?.[0];
    const latitudeRaw = cleanedFormData.geoLocation?.coordinates?.[1];
    const longitude = Number.isFinite(Number(longitudeRaw)) ? Number(longitudeRaw) : 0;
    const latitude = Number.isFinite(Number(latitudeRaw)) ? Number(latitudeRaw) : 0;
    const locationExists = location.some(loc => loc.city?.toLowerCase() === cleanedFormData.location?.toLowerCase() || loc.district?.toLowerCase() === cleanedFormData.location?.toLowerCase());
    if (!locationExists && cleanedFormData.location) {
      await dispatch(createLocation({
        city: cleanedFormData.location,
        district: cleanedFormData.location,
        state: "N/A",
        country: "N/A"
      }));
    }
    const existingCategory = category.find(cat => String(cat.category || "").toLowerCase() === String(cleanedFormData.category || "").toLowerCase());
    if (existingCategory) {
      const updates = getUpdatedCategoryFields(existingCategory, cleanedFormData);
      if (Object.keys(updates).length > 0) {
        await dispatch(editCategory(existingCategory._id, updates));
      }
    } else {
      await dispatch(createCategory({
        category: cleanedFormData.category,
        keywords: cleanedFormData.keywords || [],
        slug: cleanedFormData.slug || "",
        seoTitle: cleanedFormData.seoTitle || "",
        seoDescription: cleanedFormData.seoDescription || "",
        title: cleanedFormData.title || "",
        description: cleanedFormData.description || ""
      }));
    }
    const payload = {
      ...cleanedFormData,
      name: cleanedFormData.businessName,
      businessDetails: businessvalue,
      kycDocuments: kycBase64,
      geoLocation: {
        type: "Point",
        coordinates: [longitude, latitude]
      }
    };
    try {
      let response;
      if (editMode && editId) {
        response = await dispatch(editBusinessList(editId, payload));
        enqueueSnackbar(`${cleanedFormData.businessName} updated successfully!`, {
          variant: "success"
        });
      } else {
        response = await dispatch(createBusinessList(payload));
        const businessId = response?.data?._id || response?._id || response?.payload?._id || response?.payload?.data?._id;
        const userId = response?.data?.createdBy || response?.createdBy || response?.payload?.createdBy || response?.payload?.data?.createdBy;
        if (businessId) {
          setCreatedBusinessId(businessId);
        }
        if (userId) {
          setCreateUserId(userId);
        }
        enqueueSnackbar(`${cleanedFormData.businessName} created successfully!`, {
          variant: "success"
        });
      }
      dispatch(getAllBusinessList());
      setForceBypassedFields([]);
      setActiveStep(3);
    } catch (err) {
      console.error("Error saving business:", err);

      // Handle backend validation errors
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        enqueueSnackbar(`Validation errors:\n${errorMessages}`, {
          variant: "error"
        });
      } else if (err.response?.data?.message) {
        enqueueSnackbar(err.response.data.message, {
          variant: "error"
        });
      } else {
        enqueueSnackbar("Error saving business. Please try again.", {
          variant: "error"
        });
      }
    }
  };
  const handleSubmit = async e => {
    e.preventDefault();
    await saveBusiness();
  };
  const warnMessages = [
    null,
    { title: "Warning 1 of 3", body: "Some fields are incomplete. The listing may appear low quality to users.", confirm: "Yes, continue" },
    { title: "Warning 2 of 3", body: "Are you sure? This data will be published as-is to users browsing the directory.", confirm: "Yes, I'm sure" },
    { title: "Final confirmation", body: "You are about to save incomplete business data. Only proceed if you are certain.", confirm: "Save anyway" }
  ];
  const handleWarnConfirm = async () => {
    const nextLevel = warnLevel + 1;
    setWarnDialog(false);
    if (nextLevel < 3) {
      setWarnLevel(nextLevel);
    } else {
      setWarnLevel(0);
      const cleanedFormData = getCleanBusinessFormData(formData);
      const allErrors = validateBusinessEntryData(cleanedFormData);
      const bypassFields = getUniqueFields(allErrors.filter(e => isForceBypassableField(e.field)).map(e => e.field));
      await saveBusiness({ forceBypassFields: bypassFields });
    }
  };
  const rows = businessList.filter(c => c.isActive).map((bl, index) => ({
    id: bl._id || index,
    _id: bl._id,
    clientId: bl.clientId || "-",
    businessName: bl.businessName || "-",
    plotNumber: bl.plotNumber || "-",
    street: bl.street || "-",
    pincode: bl.pincode || "-",
    globalAddress: bl.globalAddress || "-",
    email: bl.email || "-",
    contact: bl.contact || "-",
    contactList: bl.contactList || "-",
    gstin: bl.gstin || "-",
    whatsappNumber: bl.whatsappNumber || "-",
    experience: bl.experience || "-",
    location: bl.location || "-",
    category: bl.category || "-",
    seoTitle: bl.seoTitle || "",
    seoDescription: bl.seoDescription || "",
    title: bl.title || "",
    description: bl.description || "",
    slug: bl.slug || "",
    keywords: bl.keywords || [],
    restaurantOptions: bl.restaurantOptions || "",
    bannerImage: bl.bannerImage || null,
    businessImages: bl.businessImages || [],
    googleMap: bl.googleMap || "-",
    geoLocation: bl.geoLocation || {
      type: "Point",
      coordinates: ["", ""]
    },
    website: bl.website || "-",
    facebook: bl.facebook || "-",
    instagram: bl.instagram || "-",
    youtube: bl.youtube || "-",
    pinterest: bl.pinterest || "-",
    twitter: bl.twitter || "-",
    linkedin: bl.linkedin || "-",
    businessDetails: bl.businessDetails || "-",
    openingHours: bl.openingHours || defaultOpeningHours,
    mniDetails: bl.mniDetails || [],
    payment: bl.payment || [],
    qrImage: bl.qrCode?.qrImage || null,
    qrDownloads: bl.qrDownloads || [],
    amountPaid: bl.amountPaid || false,
    paidDate: bl.paidDate || null
  }));
  
  const filteredRows = getFilteredRows();
  const categoryOptions = Array.from(new Set(
    [...category, ...searchCategory].map(c => c?.category).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));
  const locationOptions = Array.from(new Set(
    location.map(l => l?.city || l?.district || l?.location || l?.name).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));
  
  const businessListTable = [{
    id: "clientId",
    label: "Client ID"
  }, {
    id: "bannerImage",
    label: "Banner Image",
    renderCell: value => value ? <Avatar src={value} alt="Banner" /> : "-"
  }, {
    id: "businessName",
    label: "Business Name"
  }, {
    id: "location",
    label: "Location Name"
  }, {
    id: "category",
    label: "Category"
  }, {
    id: "mniDetails",
    label: "Category Group",
    renderCell: value => {
      if (!Array.isArray(value) || value.length === 0) return "—";
      const groups = value.map(item => item?.categoryGroup).filter(Boolean);
      return groups.length > 0 ? groups.join(", ") : "—";
    }
  }, {
    id: "qrCode",
    label: "Review QR",
    renderCell: (_, row) => {
      if (!row.qrImage) return "—";
      const handleDownload = async () => {
        try {
          const link = document.createElement("a");
          link.href = row.qrImage;
          link.target = "_blank";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          await dispatch(trackQrDownload(row._id));
          enqueueSnackbar("QR downloaded successfully", {
            variant: "success"
          });
        } catch (err) {
          enqueueSnackbar("Download failed", {
            variant: "error"
          });
        }
      };
      const lastDownload = row.qrDownloads?.length > 0 ? new Date(row.qrDownloads[row.qrDownloads.length - 1].downloadedAt).toLocaleString() : "Not Downloaded";
      return <Box sx={{
        textAlign: "center"
      }}>
            <Avatar src={row.qrImage} sx={{
          width: 60,
          height: 60,
          margin: "0 auto"
        }} />
            <Typography variant="caption" sx={{
          display: "block",
          mt: 1
        }}>
              {row.qrText}
            </Typography>
            <Typography variant="caption" sx={{
          display: "block",
          mt: 1
        }}>
              Last: {lastDownload}
            </Typography>
            <Button size="small" variant="contained" sx={{
          mt: 1
        }} onClick={handleDownload}>
              Download
            </Button>
          </Box>;
    }
  }, {
    id: "payment",
    label: "Payment",
    renderCell: (value, row) => {
      const handleMarkPaid = async () => {
        if (!row?._id) return;
        try {
          const payload = {
            name: row.businessName,
            businessName: row.businessName,
            category: row.category,
            location: row.location,
            payment: [{
              amount: row?.subscription?.price || 1
            }]
          };
          await dispatch(editBusinessList(row._id, payload));
          enqueueSnackbar(`${row.businessName} marked as paid`, {
            variant: "success"
          });
          dispatch(getAllBusinessList());
        } catch (error) {
          console.error(error);
          enqueueSnackbar("Payment failed. Please try again!", {
            variant: "error"
          });
        }
      };
      const paidDateValue = row.paidDate?.$date ? row.paidDate.$date : row.paidDate;
      const formattedDate = paidDateValue ? new Date(paidDateValue).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }) : null;
      const isPaid = Boolean(row.amountPaid);
      return <Box sx={{
        textAlign: "center"
      }}>

            <Tooltip title={isPaid ? `Paid on ${formattedDate}` : "Click to mark as paid"} arrow>
              <span>
                <IconButton color={isPaid ? "success" : "warning"} onClick={!isPaid ? handleMarkPaid : undefined} disabled={isPaid} sx={{
              transition: "transform 0.2s ease",
              "&:hover": {
                transform: !isPaid ? "scale(1.15)" : "none"
              }
            }}>
                  {isPaid ? <PaidIcon /> : <PendingIcon />}
                </IconButton>
              </span>
            </Tooltip>

            <Typography variant="caption" display="block" sx={{
          color: isPaid ? "green" : "orange",
          fontWeight: 600
        }}>
              {isPaid ? "Paid" : "Pending"}
            </Typography>

            {formattedDate && <Typography variant="caption" display="block" sx={{
          color: "#666"
        }}>
                {formattedDate}
              </Typography>}

          </Box>;
    }
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => <div style={{
      display: "flex",
      gap: "8px"
    }}>
          <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDelete(row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </div>
  }, {
    id: "gallery",
    label: "Gallery",
    renderCell: (_, row) => <IconButton color="primary" onClick={() => handleOpenGallery(row._id)}>
          <CollectionsBookmarkOutlinedIcon />
        </IconButton>
  }];
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle
  }) => <div className={cx("section-header")}>
      {Icon && <Icon className={cx("section-icon")} />}
      <div className={cx("section-title-group")}>
        <h3 className={cx("section-title")}>{title}</h3>
        {subtitle && <p className={cx("section-subtitle")}>{subtitle}</p>}
      </div>
    </div>;

  // ===== SEARCH PANEL COMPONENT =====
  const renderSearchPanel = () => (
    <div className={cx("search-panel")}>
      <div className={cx("search-header")}>
        <h2 className={cx("search-title")}>🔍 Find Business</h2>
        <div className={cx("search-mode-toggle")}>
          <button 
            type="button"
            className={cx("mode-btn", searchMode === "easy" ? "active" : "")} 
            onClick={() => setSearchMode("easy")}
          >
            Easy Search
          </button>
          <button 
            type="button"
            className={cx("mode-btn", searchMode === "advanced" ? "active" : "")} 
            onClick={() => setSearchMode("advanced")}
          >
            Advanced
          </button>
        </div>
      </div>

      {/* EASY SEARCH */}
      {searchMode === "easy" && (
        <div className={cx("search-content-easy")}>
          <div className={cx("search-input-wrapper")}>
            <input
              type="text"
              placeholder="Search by business name, location, or category..."
              className={cx("search-input-main")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
            />
            <Button 
              variant="contained" 
              className={cx("search-btn")}
              onClick={handleApplyFilters}
              sx={{ backgroundColor: "var(--color-primary-orange)", "&:hover": { backgroundColor: "var(--color-primary-hover)" } }}
            >
              Search
            </Button>
          </div>
        </div>
      )}

      {/* ADVANCED SEARCH */}
      {searchMode === "advanced" && (
        <div className={cx("search-content-advanced")}>
          <div className={cx("advanced-grid")}>
            {/* Business Name Search */}
            <div className={cx("advanced-field")}>
              <label className={cx("field-label")}>Business Name</label>
              <input
                type="text"
                placeholder="Enter business name..."
                className={cx("search-input")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className={cx("advanced-field")}>
              <label className={cx("field-label")}>Category</label>
              <select 
                className={cx("search-select")}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className={cx("advanced-field")}>
              <label className={cx("field-label")}>Location</label>
              <select 
                className={cx("search-select")}
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="">All Locations</option>
                {locationOptions.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div className={cx("advanced-field")}>
              <label className={cx("field-label")}>Payment Status</label>
              <select 
                className={cx("search-select")}
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={cx("search-actions")}>
            <Button 
              variant="contained" 
              className={cx("search-btn")}
              onClick={handleApplyFilters}
              sx={{ backgroundColor: "var(--color-primary-orange)", "&:hover": { backgroundColor: "var(--color-primary-hover)" } }}
            >
              Apply Filters
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleClearFilters}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* ACTIVE FILTERS DISPLAY */}
      {activeFilters.length > 0 && (
        <div className={cx("active-filters")}>
          <span className={cx("filters-label")}>Active Filters:</span>
          <div className={cx("filter-chips")}>
            {activeFilters.map((filter, idx) => (
              <Chip
                key={idx}
                label={filter.label}
                onDelete={() => handleRemoveFilter(filter.type)}
                icon={<span style={{ marginRight: "4px" }}>✕</span>}
                className={cx("filter-chip")}
                sx={{
                  backgroundColor: "#FFE8D6",
                  color: "#D97800",
                  fontWeight: 500,
                  "& .MuiChip-deleteIcon": { color: "#D97800", "&:hover": { color: "#B35900" } }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* RESULTS COUNT */}
      {activeFilters.length > 0 && (
        <div className={cx("results-count")}>
          Found <strong>{filteredRows.length}</strong> business{filteredRows.length !== 1 ? "es" : ""}
        </div>
      )}
    </div>
  );

  const renderStepContent = step => {
    switch (step) {
      case 0:
        return <>
            <SectionHeader title="Client & Business Information" subtitle="Basic details about your business" />

            <div className={cx("form-input-group")} style={{
            position: "relative"
          }}>
              <label htmlFor="clientId" className={cx("input-label")}>🔍 Client ID</label>

              <input type="text" id="clientId" name="clientId" className={cx("text-input")} value={formData.clientId} placeholder="Type client ID or name..." onChange={e => {
              const value = e.target.value;
              const nextData = {
                ...formData,
                clientId: value
              };
              setFormData(prev => ({
                ...prev,
                clientId: value
              }));
              updateLiveValidation(nextData, "clientId");
              if (value.length >= 2) {
                dispatch(getUserClientSuggestion(value));
                setShowSuggestions(true);
              } else {
                setShowSuggestions(false);
              }
            }} onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }} onFocus={() => {
              if (formData.clientId.length >= 2) {
                setShowSuggestions(true);
              }
            }} />

              {showSuggestions && searchSuggestion?.length > 0 && <ul className={cx("category-suggestion-box")}>
                  {searchSuggestion.map(client => <li key={client._id} onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  clientId: `${client.clientId} — ${client.name}`
                }));
                setShowSuggestions(false);
              }} style={{
                padding: "12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee"
              }}>
                      <strong>{client.clientId}</strong> — {client.name}
                    </li>)}
                </ul>}
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="businessName" className={cx("input-label")}>🏢 Business Name</label>
              <input type="text" id="businessName" name="businessName" className={cx("text-input")} value={formData.businessName} onChange={handleChange} />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Address Details" subtitle="Business location information" />

            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>🔍 Search Address (Auto-fill)</label>
              <GooglePlacesInput onPlaceSelect={handlePlaceSelect} placeholder="Type business name or address to search..." />
              <small style={{ color: "#888", marginTop: "4px", display: "block" }}>
                Selecting from suggestions auto-fills street, pincode, location and coordinates.
              </small>
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="plotNumber" className={cx("input-label")}>📍 Plot Number</label>
              <input type="text" id="plotNumber" name="plotNumber" className={cx("text-input")} value={formData.plotNumber} onChange={handleChange} />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="street" className={cx("input-label")}>🛣️ Street</label>
              <input type="text" id="street" name="street" className={cx("text-input")} value={formData.street} onChange={handleChange} placeholder="Enter street address" />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="pincode" className={cx("input-label")}>📮 Pincode *</label>
              <input type="text" id="pincode" name="pincode" className={cx("text-input")} value={formData.pincode} onChange={handleChange} placeholder="Enter 6-digit pincode" required />
            </div>

            <div className={cx("form-input-group")} style={{
            position: "relative"
          }}>
              <label htmlFor="location" className={cx("input-label")}>Location</label>
              <input type="text" id="location" name="location" autoComplete="off" className={cx("text-input")} value={formData.location} placeholder="Type to search location..." onChange={e => {
              const value = e.target.value;
              const nextData = {
                ...formData,
                location: value
              };
              setFormData(prev => ({
                ...prev,
                location: value
              }));
              updateLiveValidation(nextData, "location");
              if (value.length >= 1) {
                const filtered = location.filter(loc => loc.city?.toLowerCase().includes(value.toLowerCase()) || loc.district?.toLowerCase().includes(value.toLowerCase()));
                setLocationSuggestions(filtered);
                setShowLocationSuggest(true);
              } else {
                setShowLocationSuggest(false);
                setLocationSuggestions([]);
              }
            }} onBlur={() => setTimeout(() => setShowLocationSuggest(false), 200)} onFocus={() => {
              if (formData.location.length >= 1) {
                const filtered = location.filter(loc => loc.city?.toLowerCase().includes(formData.location.toLowerCase()) || loc.district?.toLowerCase().includes(formData.location.toLowerCase()));
                setLocationSuggestions(filtered);
                setShowLocationSuggest(filtered.length > 0);
              }
            }} />
              {showLocationSuggest && locationSuggestions.length > 0 && <ul className={cx("category-suggestion-box")}>
                  {locationSuggestions.map(loc => <li key={loc._id} onClick={() => {
                const nextLocation = loc.city || loc.district;
                setFormData(prev => ({
                  ...prev,
                  location: nextLocation
                }));
                updateLiveValidation({
                  ...formData,
                  location: nextLocation
                }, "location");
                setShowLocationSuggest(false);
                setLocationSuggestions([]);
              }} style={{
                padding: "10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee"
              }}>
                      {loc.city}{loc.district && loc.district !== loc.city ? `, ${loc.district}` : ""}
                      {loc.state ? ` — ${loc.state}` : ""}
                    </li>)}
                </ul>}
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="address2" className={cx("input-label")}>Global Address</label>
              <input type="text" id="globalAddress" name="globalAddress" className={cx("text-input")} value={formData.globalAddress} onChange={handleChange} />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Contact Information" subtitle="How customers can reach you" />

            <div className={cx("form-input-group")}>
              <label htmlFor="email" className={cx("input-label")}>📧 Email</label>
              <input type="email" id="email" name="email" className={cx("text-input")} value={formData.email} onChange={handleChange} placeholder="business@example.com" />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="contact" className={cx("input-label")}>📞 Phone</label>
              <input type="text" id="contact" name="contact" className={cx("text-input")} value={formData.contact} onChange={handleChange} />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="contactList" className={cx("input-label")}>☎️ Enquiry Number</label>
              <input type="text" id="contactList" name="contactList" className={cx("text-input")} value={formData.contactList} onChange={handleChange} placeholder="Alternate contact number" />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="whatsappNumber" className={cx("input-label")}>💬 WhatsApp Number</label>
              <input type="text" id="whatsappNumber" name="whatsappNumber" className={cx("text-input")} value={formData.whatsappNumber} onChange={handleChange} placeholder="Business WhatsApp number" />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Business Information" subtitle="Additional business details" />

            <div className={cx("form-input-group")}>
              <label htmlFor="gstin" className={cx("input-label")}>🏛️ GSTIN</label>
              <input type="text" id="gstin" name="gstin" className={cx("text-input")} value={formData.gstin} onChange={handleChange} placeholder="Enter GST registration number" />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="experience" className={cx("input-label")}>⭐ Experience (Years)</label>
              <input type="text" id="experience" name="experience" className={cx("text-input")} value={formData.experience} onChange={handleChange} />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Location & Web Presence" subtitle="Map and website links" />

            <div className={cx("form-input-group")}>
              <label htmlFor="googleMap" className={cx("input-label")}>🗺️ Google Map Link</label>
              <input type="text" id="googleMap" name="googleMap" className={cx("text-input")} value={formData.googleMap} onChange={handleChange} placeholder="https://maps.google.com/..." />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="geoLatitude" className={cx("input-label")}>Latitude *</label>
              <input type="number" id="geoLatitude" className={cx("text-input")} value={formData.geoLocation?.coordinates?.[1] ?? ""} onChange={e => handleGeoCoordinateChange(1, e.target.value)} placeholder="Example: 13.0827" step="any" min="-90" max="90" required />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="geoLongitude" className={cx("input-label")}>Longitude *</label>
              <input type="number" id="geoLongitude" className={cx("text-input")} value={formData.geoLocation?.coordinates?.[0] ?? ""} onChange={e => handleGeoCoordinateChange(0, e.target.value)} placeholder="Example: 80.2707" step="any" min="-180" max="180" required />
            </div>

            <div className={cx("form-input-group")}>
              <label htmlFor="website" className={cx("input-label")}>🌐 Website</label>
              <input type="text" id="website" name="website" className={cx("text-input")} value={formData.website} onChange={handleChange} placeholder="https://example.com" />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Social Media" subtitle="Connect your social profiles" />

            <div className={cx("social-media-grid")}>
              {[{
              field: "facebook",
              icon: "f",
              label: "Facebook"
            }, {
              field: "instagram",
              icon: "📷",
              label: "Instagram"
            }, {
              field: "youtube",
              icon: "▶️",
              label: "YouTube"
            }, {
              field: "pinterest",
              icon: "📌",
              label: "Pinterest"
            }, {
              field: "twitter",
              icon: "𝕏",
              label: "Twitter"
            }, {
              field: "linkedin",
              icon: "in",
              label: "LinkedIn"
            }].map(({
              field,
              icon,
              label
            }) => <div className={cx("form-input-group")} key={field}>
                  <label htmlFor={field} className={cx("input-label")}>{icon} {label}</label>
                  <input type="text" id={field} name={field} className={cx("text-input")} value={formData[field]} onChange={handleChange} placeholder={`Your ${label} profile URL`} />
                </div>)}
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Business Banner & Details" subtitle="Upload banner image and describe your business" />

            <div className={cx("form-input-group col-span-all upload-section")}>
              <label className={cx("input-label")}>🖼️ Banner Image</label>
              <div className={cx("upload-content")}>
                <Button variant="contained" startIcon={<CloudUploadIcon />} component="label" className={cx("upload-button")}>
                  Upload Image
                  <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageChange} />
                </Button>
                {preview && <Avatar src={preview} sx={{
                width: 56,
                height: 56
              }} className={cx("preview-avatar")} />}
              </div>
            </div>

            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>📝 Business Details</label>
              <Suspense fallback={<CircularProgress />}>
                <ReactQuill theme="snow" value={businessvalue} onChange={handleBusinessChange} modules={modules} formats={formats} placeholder="Type business details here..." style={{
                height: "200px"
              }} />
              </Suspense>
            </div><br />

            <div className={cx("form-input-group col-span-all")}>
              <SectionHeader title="Opening Hours" subtitle="Set business hours for each day" />
              <div className={cx("opening-hours-container")}>
                {formData.openingHours.map((hour, index) => <div key={hour.day} className={cx("opening-hours-row")} data-closed={hour.isClosed} data-247={hour.is24Hours}>
                    <div className={cx("day-label")}>{hour.day}</div>

                    <div className={cx("time-group")}>
                      <input type="time" value={hour.is24Hours ? "00:00" : hour.open} onChange={e => handleOpeningHourChange(index, "open", e.target.value)} disabled={hour.isClosed || hour.is24Hours} className={cx("text-input")} placeholder="Open Time" />
                      
                      <input type="time" value={hour.is24Hours ? "23:59" : hour.close} onChange={e => handleOpeningHourChange(index, "close", e.target.value)} disabled={hour.isClosed || hour.is24Hours} className={cx("text-input")} placeholder="Close Time" />
                    </div>

                    <div style={{
                  justifySelf: "end"
                }}>
                      <select value={hour.isClosed ? "closed" : hour.is24Hours ? "24/7" : "open"} onChange={e => {
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
                  }} className={cx("select-input")}>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="24/7">24/7</option>
                      </select>
                    </div>
                  </div>)}
              </div>
            </div>
          </>;
      case 1:
        return <>
            <SectionHeader title="KYC Documents" subtitle="Upload identity proof and business documents" />
            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>📄 Upload Documents (PDF, PNG, JPG)</label>

            <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} className={cx("upload-button")}>
              Upload Files
              <input type="file" multiple hidden onChange={handleKycUpload} accept=".pdf,.png,.jpg,.jpeg" />
            </Button>

              <div className={cx("kyc-file-list")}>
                {kycFiles.map((file, index) => <div key={index} className={cx("kyc-file-item")}>
                    <Typography variant="body2">
                      {file.name || `Document ${index + 1}`}
                    </Typography>
                    <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>

                    <div style={{
                  marginTop: "5px"
                }}>
                      {file.type?.includes("image") ? <img src={file.preview} alt={file.name} style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "8px",
                    objectFit: "cover"
                  }} /> : file.type?.includes("pdf") ? <iframe src={file.preview} title={file.name} width="100%" height="150px" style={{
                    border: "1px solid #ccc",
                    borderRadius: "8px"
                  }} /> : null}

                      <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                        <Button size="small" variant="outlined" onClick={() => window.open(file.preview, "_blank")}>
                          View Full
                        </Button>
                        <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </div>
                  </div>)}
              </div>
            </div>
          </>;
      case 2:
        return <>
            <SectionHeader title="Category & SEO" subtitle="Categorize your business and optimize for search" />

            <div className={cx("form-input-group")} style={{
            position: "relative"
          }}>
              <label className={cx("input-label")}>🏷️ Category</label>

              <input type="text" className={cx("text-input")} placeholder="Search category..." value={formData.category} onChange={e => {
              const value = e.target.value;
              const nextData = {
                ...formData,
                category: value
              };
              setFormData(nextData);
              updateLiveValidation(nextData, "category");
              if (value.length >= 2) {
                dispatch(businessCategorySearch(value));
                setShowCategorySuggest(true);
              } else {
                setShowCategorySuggest(false);
              }
            }} onFocus={() => {
              if (formData.category.length >= 2) {
                setShowCategorySuggest(true);
              }
            }} onBlur={() => setTimeout(() => setShowCategorySuggest(false), 200)} />

              {showCategorySuggest && searchCategory?.length > 0 && <ul className={cx("category-suggestion-box")}>
                  {searchCategory.map(cat => <li key={cat._id} onClick={() => {
                const nextData = {
                  ...formData,
                  category: cat.category,
                  keywords: cat.keywords || [],
                  slug: cat.slug || "",
                  seoTitle: cat.seoTitle || "",
                  seoDescription: cat.seoDescription || "",
                  title: cat.title || "",
                  description: cat.description || ""
                };
                setFormData(nextData);
                updateLiveValidation(nextData, ["category", "keywords", "slug", "seoTitle", "seoDescription", "title", "description"]);
                setShowCategorySuggest(false);
              }} style={{
                padding: "10px",
                cursor: "pointer",
                borderBottom: "1px solid #eee"
              }}>
                      {cat.category}
                    </li>)}
                </ul>}
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Keywords & Tags" subtitle="Help customers find you with relevant keywords" />

            <div className={cx("category-form-input-group")} style={{
            marginTop: "0px"
          }}>
              <label className={cx("category-input-label")}>🔑 Keywords</label>

              <Autocomplete multiple freeSolo options={[]} value={Array.isArray(formData.keywords) ? formData.keywords : []} onChange={(event, newValue) => {
              const nextData = {
                ...formData,
                keywords: newValue
              };
              setFormData(nextData);
              updateLiveValidation(nextData, "keywords");
            }} renderTags={(value, getTagProps) => value.map((option, index) => <Chip key={index} label={option} {...getTagProps({
              index
            })} onDelete={() => {
              // delete chip
              const nextData = {
                ...formData,
                keywords: formData.keywords.filter(k => k !== option)
              };
              setFormData(nextData);
              updateLiveValidation(nextData, "keywords");
            }} sx={{
              backgroundColor: "#ff8c00",
              color: "white",
              fontWeight: 500,
              "& .MuiChip-deleteIcon": {
                color: "white"
              }
            }} />)} renderInput={params => <TextField {...params} variant="outlined" placeholder="Add keywords" value={inputKeyword} onChange={e => setInputKeyword(e.target.value)} InputProps={{
              ...params.InputProps,
              endAdornment: <InputAdornment position="end">
                          <IconButton onClick={() => {
                  if (!inputKeyword.trim()) return;
                  const nextData = {
                    ...formData,
                    keywords: [...formData.keywords, inputKeyword.trim()]
                  };
                  setFormData(nextData);
                  updateLiveValidation(nextData, "keywords");
                  setInputKeyword("");
                }} sx={{
                  color: "var(--color-primary-orange)",
                  "&:hover": {
                    color: "var(--color-primary-hover)"
                  }
                }}>
                            <AddCircleOutlineIcon />
                          </IconButton>
                        </InputAdornment>
            }} />} />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Display & SEO" subtitle="How your business appears online" />

            <div className={cx("form-input-group")}>
              <label className={cx("input-label")}>👁️ Display Title</label>
              <input type="text" name="title" className={cx("text-input")} value={formData.title} onChange={handleChange} placeholder="How your business appears to customers" />
            </div>

            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>📖 Display Description</label>
              <textarea name="description" className={cx("textarea-input")} value={formData.description} rows={3} onChange={handleChange} placeholder="A brief description of your business" />
            </div>

            <div className={cx("form-divider")}></div>
            <SectionHeader title="Search Engine Optimization" subtitle="Improve your search visibility" />

            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>🔍 SEO Title</label>
              <input type="text" name="seoTitle" className={cx("text-input")} value={formData.seoTitle} onChange={handleChange} placeholder="Meta title for search engines (50-60 characters)" />
            </div>

            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>📝 SEO Description</label>
              <textarea name="seoDescription" className={cx("textarea-input")} value={formData.seoDescription} rows={2} onChange={handleChange} placeholder="Meta description for search engines (150-160 characters)" />
            </div>

            {["restaurants", "hotels"].includes(formData.category?.toLowerCase()) && <>
                <div className={cx("form-divider")}></div>
                <div className={cx("form-input-group")}>
                  <label className={cx("input-label")}>🍽️ Cuisine Type</label>
                  <select className={cx("select-input")} name="restaurantOptions" value={formData.restaurantOptions || ""} onChange={handleChange}>
                    <option value="">-- Select Option --</option>
                    <option value="Veg">Vegetarian Only</option>
                    <option value="Non-Veg">Non-Vegetarian</option>
                    <option value="Both">Both Veg & Non-Veg</option>
                  </select>
                </div>
              </>}

            {/* Dynamic category filters */}
            {filterConfigLoading && (
              <div className={cx("form-input-group col-span-all")}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption">Loading filters…</Typography>
                </Box>
              </div>
            )}
            {categoryFilterConfig.length > 0 && (
              <>
                <div className={cx("form-divider")}></div>
                <div className={cx("form-input-group col-span-all")}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Category Filters — {formData.category}
                  </Typography>
                </div>
                {categoryFilterConfig.map(fc => (
                  <div key={fc.key} className={cx("form-input-group")}>
                    <label className={cx("input-label")}>
                      {fc.label}{fc.isRequired && <span style={{ color: "red" }}> *</span>}
                    </label>

                    {fc.type === "multiselect" && (
                      <Autocomplete multiple options={fc.options || []}
                        value={Array.isArray(formData.filters?.[fc.key]) ? formData.filters[fc.key] : []}
                        onChange={(_, val) => handleFilterChange(fc.key, val)}
                        renderTags={(value, getTagProps) => value.map((opt, i) =>
                          <Chip key={i} label={opt} size="small" {...getTagProps({ index: i })}
                            sx={{ bgcolor: "#ff8c00", color: "#fff", "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.7)" } }} />)}
                        renderInput={params => <TextField {...params} variant="outlined" size="small" placeholder={`Select ${fc.label}`} />}
                      />
                    )}

                    {fc.type === "radio" && (
                      <select className={cx("select-input")} value={formData.filters?.[fc.key] || ""}
                        onChange={e => handleFilterChange(fc.key, e.target.value || null)}>
                        <option value="">-- Select {fc.label} --</option>
                        {(fc.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {fc.type === "toggle" && (
                      <FormControlLabel
                        control={
                          <Checkbox checked={Boolean(formData.filters?.[fc.key])}
                            onChange={e => handleFilterChange(fc.key, e.target.checked)}
                            sx={{ color: "#ff8c00", "&.Mui-checked": { color: "#ff8c00" } }} />
                        }
                        label={<Typography variant="body2">{fc.label}</Typography>}
                      />
                    )}

                    {fc.type === "range" && (
                      <Box sx={{ px: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                          {fc.min ?? 0}{fc.unit} – {fc.max ?? 100}{fc.unit}
                        </Typography>
                        <Slider value={formData.filters?.[fc.key] ?? fc.min ?? 0}
                          min={fc.min ?? 0} max={fc.max ?? 100}
                          step={Math.ceil(((fc.max ?? 100) - (fc.min ?? 0)) / 20)}
                          valueLabelDisplay="auto"
                          valueLabelFormat={v => `${v}${fc.unit || ""}`}
                          onChange={(_, val) => handleFilterChange(fc.key, val)}
                          sx={{ color: "#ff8c00" }} />
                      </Box>
                    )}
                  </div>
                ))}
              </>
            )}
            <div className={cx("form-input-group col-span-all")}>
              <label className={cx("input-label")}>📍 Slug (URL-friendly name)</label>
              <input type="text" name="slug" className={cx("text-input")} value={formData.slug} onChange={handleChange} placeholder="business-name-here" />
            </div>
          </>;
      case 3:
        return <>
            <Box sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            backgroundColor: "#f8f9fa",
            px: 2
          }}>
              <Box sx={{
              borderRadius: 2,
              p: {
                xs: 3,
                sm: 4
              },
              textAlign: "center",
              maxWidth: 320,
              width: "100%"
            }}>
                <Typography variant="h6" sx={{
                fontWeight: 600,
                fontSize: {
                  xs: "1.1rem",
                  sm: "1.25rem"
                },
                color: "#333",
                mb: 1
              }}>
                  List Your Business on{" "}
                  <Box component="span" sx={{
                  color: "#f57c00"
                }}>
                    MassClick
                  </Box>
                </Typography>

                <Typography sx={{
                fontWeight: 700,
                fontSize: {
                  xs: "1.2rem",
                  sm: "1.4rem"
                },
                mb: 3
              }}>
                  Just ₹ 99/- + GST
                </Typography>

                <Button variant="contained" onClick={handlePayNow} sx={{
                backgroundColor: "#f57c00",
                color: "#fff",
                fontWeight: 600,
                textTransform: "none",
                px: 4,
                py: 1.2,
                borderRadius: "6px",
                "&:hover": {
                  backgroundColor: "#e66b00"
                }
              }}>
                  Pay Now
                </Button>

              </Box>
            </Box>
          </>;
      default:
        return null;
    }
  };
  const bypassableFieldErrorCount = Object.keys(fieldErrors).filter(isForceBypassableField).length;
  return <div className={cx("business-page")}>
      <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={editMode} createLabel="Business" listLabel="Directory" listCount={filteredRows.length} />

      {activeView === "form" && <>
      <div className={cx("business-card")} style={{
      marginBottom: '20px',
      padding: '15px 30px',
      boxShadow: 'none'
    }}>
        <Stack sx={{
        width: '100%'
      }} spacing={4}>
          <Stepper alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
            {steps.map(label => <Step key={label}>
                <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
              </Step>)}
          </Stepper>
        </Stack>
      </div>

      <div className={cx("business-card form-section")}>
        <h2 className={cx("card-title")}>
          {editMode ? `Edit Business (${steps[activeStep]})` : `Add New Business (${steps[activeStep]})`}
        </h2>

        <form onSubmit={handleSubmit}>
          {Object.keys(fieldErrors).length > 0 && (
            <div className={cx("validation-panel")}>
              <strong>Fix these fields:</strong>
              {Object.values(fieldErrors).slice(0, 6).map((message, index) => (
                <p key={`${message}-${index}`}>{message}</p>
              ))}
              {Object.keys(fieldErrors).length > 6 && (
                <p>{Object.keys(fieldErrors).length - 6} more issue(s) need attention.</p>
              )}
              {bypassableFieldErrorCount > 0 && (
                <div className={cx("validation-actions")}>
                  <button type="button" className={cx("warn-save-button")} onClick={() => setWarnDialog(true)} disabled={loading}>
                    {warnLevel > 0 ? `⚠️ Warning ${warnLevel}/3 — Save with warnings` : "Save with warnings"}
                  </button>
                  <span className={cx("force-bypass-note")}>
                    businessName, category &amp; location still need valid values.
                  </span>
                </div>
              )}
            </div>
          )}
          <div className={cx("form-grid")}>
            {renderStepContent(activeStep)}
          </div>

          <div className={cx("col-span-all upload-section")} style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: activeStep !== 3 ? "28px" : "150px"
        }}>
            {activeStep > 0 && activeStep < steps.length - 1 && <div style={{
            display: "flex",
            justifyContent: "flex-start",
            marginBottom: "-88px"
          }}>
                <button type="button" className={cx("submit-button")} onClick={handleBack}>
                  <SkipPreviousIcon />
                </button>
              </div>}

            {activeStep < steps.length - 2 ? <div style={{
            width: "100%",
            display: "flex",
            justifyContent: "flex-end"
          }}>
                <button type="button" className={cx("submit-button")} onClick={handleNext} style={{
              marginLeft: "auto",
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "28px"
            }}>
                  <SkipNextIcon />
                </button>
              </div> : activeStep === steps.length - 2 ? <button type="submit" className={cx("submit-button")} disabled={loading} style={{
            marginLeft: "auto",
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "28px"
          }}>
                {loading ? <CircularProgress size={24} color="inherit" /> : editMode ? "Update" : "Create"}
              </button> : null}
          </div>
        </form>
      </div>
      </>}

      {activeView === "list" && <>
      {/* SEARCH SECTION */}
      {renderSearchPanel()}

      {/* TABLE SECTION */}
      <div className={cx("table-section")}>
        <div className={cx("table-header")}>
          <Typography variant="h6" className={cx("table-title")}>
            📋 Business Directory
          </Typography>
          <Typography variant="body2" className={cx("table-count")}>
            {filteredRows.length} shown of {total || rows.length} businesses
          </Typography>
        </div>

        <Box sx={{ width: "100%" }}>
          <CustomizedTable 
            key={tableRefreshKey}
            data={filteredRows} 
            total={total || filteredRows.length} 
            columns={businessListTable} 
            fetchData={(pageNo, pageSize, options = {}) => {
              const serverSearch = options.search || getServerSearchQuery();
              dispatch(getAllBusinessList({
                pageNo,
                pageSize,
                search: serverSearch,
                status: options.status || "all",
                sortBy: options.sortBy || null,
                sortOrder: options.sortOrder || "asc"
              }));
            }} 
          />
        </Box>
      </div>
      </>}

      <Dialog open={warnDialog} onClose={() => setWarnDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: "#D97800", fontWeight: 700 }}>
          ⚠️ {warnMessages[warnLevel + 1]?.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">{warnMessages[warnLevel + 1]?.body}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWarnDialog(false)} color="secondary">Cancel</Button>
          <Button color="warning" variant="contained" onClick={handleWarnConfirm} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : warnMessages[warnLevel + 1]?.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({
      open: false,
      id: null,
      name: ""
    })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{deleteDialog.name || "this business"}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({
          open: false,
          id: null,
          name: ""
        })} color="secondary">
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={galleryDialog.open} onClose={handleCloseGallery} maxWidth="md" fullWidth>
        <DialogTitle>Gallery - {galleryDialog.data?.businessName}</DialogTitle>
        <DialogContent dividers>
          <div style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap"
        }}>
            {galleryDialog.data?.businessImages?.map((img, idx) => <Avatar key={idx} src={img} sx={{
            width: 100,
            height: 100
          }} />)}
            {newGalleryImages.map((img, idx) => <Avatar key={idx} src={img} sx={{
            width: 100,
            height: 100,
            border: "2px dashed green"
          }} />)}
          </div>
          <Button variant="contained" component="label" sx={{
          mt: 2
        }}>
            Upload Images
            <input type="file" hidden multiple accept="image/*" onChange={handleGalleryImageChange} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGallery} color="secondary">Close</Button>
          <Button onClick={handleUploadGalleryImages} color="primary" variant="contained" disabled={newGalleryImages.length === 0}>Upload</Button>
        </DialogActions>
      </Dialog>
    </div>;
});
export default BusinessList;
