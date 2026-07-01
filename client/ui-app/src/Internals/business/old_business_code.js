import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../services/axiosInstance.js";
import { useDispatch, useSelector } from "react-redux";
import InputValidator from "../validators/inputValidator.js";
import { getAllBusinessList, createBusinessList, editBusinessList, deleteBusinessList, trackQrDownload, updateBusinessBadges, exportBusinessList } from "../../redux/actions/businessListAction";
import { getAllLocation, createLocation } from "../../redux/actions/locationAction";
import { getAllCategory, businessCategorySearch } from "../../redux/actions/categoryAction";
import { getAllUsersClient, getUserClientSuggestion } from "../../redux/actions/userClientAction.js";
import { getAllUsers } from "../../redux/actions/userAction.js";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
  Box, Button, Typography, CircularProgress, IconButton, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  // Stepper Imports:
  Stack, Stepper, Step, StepLabel, Chip, Checkbox, FormControlLabel, RadioGroup, Radio, Slider, FormGroup
} from "@mui/material";
import PaidIcon from '@mui/icons-material/Paid';
import PendingIcon from '@mui/icons-material/Pending';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
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
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { checkPhonePeStatus, createPhonePePayment } from "../../redux/actions/phonePayAction.js";
import { updateGmapsLeadStatus, clearGmapsLeadImport, setGmapsLeadToImport } from "../../redux/actions/gmapsLeadsAction";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import Tooltip from "@mui/material/Tooltip";
import styles from "./business.module.css";
import GooglePlacesInput from "../../components/GooglePlacesInput/GooglePlacesInput";
import AdminViewTabs from "../../components/AdminViewTabs.js";
import "quill/dist/quill.snow.css";
const cx = createScopedClassNames(styles);
const LISTING_MODE = {
  FREE: "free",
  PAID: "paid"
};
const FORCE_BYPASS_BLOCKED_FIELDS = new Set(["businessName", "category", "location", "contact"]);
const FREE_REQUIRED_FIELDS = new Set(["businessName", "category", "location", "contact"]);
const BUSINESS_LOCAL_DRAFT_KEY = "massclick.business.createDraft";
const DEMO_PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0qDbgAAAAASUVORK5CYII=";
const ORANGE_PRIMARY = '#FF8C00';
const ORANGE_HOVER = '#D97800';
const QUILL_MODULES = {
  toolbar: [[{
    header: "1"
  }, {
    header: "2"
  }], ["bold", "italic", "underline", "strike"], [{
    list: "ordered"
  }, {
    list: "bullet"
  }], ["link", "image", "video"], ["clean"]]
};
const QUILL_FORMATS = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "link", "image", "video"];

const normalizeQuillHtml = value =>
  value === "<p><br></p>" ? "" : value || "";

const QuillEditor = ({
  value,
  onChange,
  modules,
  formats,
  placeholder,
  style
}) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const changeHandlerRef = useRef(onChange);
  const syncInProgressRef = useRef(false);
  const initialValueRef = useRef(value);

  useEffect(() => {
    changeHandlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let mounted = true;
    let textChangeHandler = null;
    const editorNode = editorRef.current;

    const loadEditor = async () => {
      const {
        default: Quill
      } = await import("quill");

      if (!mounted || !editorNode || quillRef.current) {
        return;
      }

      const quill = new Quill(editorNode, {
        theme: "snow",
        modules,
        formats,
        placeholder
      });

      quillRef.current = quill;
      syncInProgressRef.current = true;
      if (initialValueRef.current) {
        quill.clipboard.dangerouslyPasteHTML(initialValueRef.current);
      } else {
        quill.setText("");
      }
      syncInProgressRef.current = false;

      textChangeHandler = () => {
        if (syncInProgressRef.current) {
          return;
        }
        changeHandlerRef.current?.(normalizeQuillHtml(quill.root.innerHTML));
      };

      quill.on("text-change", textChangeHandler);
    };

    loadEditor();

    return () => {
      mounted = false;
      if (quillRef.current && textChangeHandler) {
        quillRef.current.off("text-change", textChangeHandler);
      }
      quillRef.current = null;
      if (editorNode) {
        const toolbarNode = editorNode.previousElementSibling;
        if (toolbarNode?.classList.contains("ql-toolbar")) {
          toolbarNode.remove();
        }
        editorNode.removeAttribute("class");
        editorNode.innerHTML = "";
      }
    };
  }, [formats, modules, placeholder]);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) {
      return;
    }

    const nextHtml = normalizeQuillHtml(value);
    const currentHtml = normalizeQuillHtml(quill.root.innerHTML);

    if (nextHtml === currentHtml) {
      return;
    }

    syncInProgressRef.current = true;
    if (nextHtml) {
      quill.clipboard.dangerouslyPasteHTML(nextHtml);
    } else {
      quill.setText("");
    }
    syncInProgressRef.current = false;
  }, [value]);

  return <div style={style}>
      <div ref={editorRef} />
    </div>;
};
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
const SEARCH_REFRESH_DELAY = 350;
const PAID_STEP_FIELD_MAP = {
  0: [
    "clientId",
    "businessName",
    "plotNumber",
    "street",
    "pincode",
    "location",
    "globalAddress",
    "email",
    "contact",
    "contactList",
    "whatsappNumber",
    "gstin",
    "experience",
    "googleMap",
    "geoLatitude",
    "geoLongitude",
    "website",
    "bannerImage",
    "businessDetails"
  ],
  1: ["kycDocuments"],
  2: ["category", "keywords", "title", "description", "seoTitle", "seoDescription", "slug"]
};
const FREE_STEP_FIELD_MAP = {
  0: ["businessName", "location", "contact"],
  2: ["category"]
};
const STEP_NOTIFICATION_CONTENT = {
  1: {
    free: {
      title: "Next section: KYC documents",
      body: "You can keep moving, but adding clear documents now makes review easier later."
    },
    paid: {
      title: "Next section: KYC documents",
      body: "Paid listings need at least one clear verification document before they can move forward."
    }
  },
  2: {
    free: {
      title: "Next section: Category and SEO",
      body: "This is a good place to tighten category, keywords, and search copy when you have it."
    },
    paid: {
      title: "Next section: Category and SEO",
      body: "Paid listings should finish category, keywords, and SEO details carefully for a complete profile."
    }
  },
  3: {
    free: {
      title: "Final review",
      body: "We'll validate the full form before saving and highlight anything still worth fixing."
    },
    paid: {
      title: "Final review",
      body: "We'll validate every paid-listing field now and show exact suggestions if anything is still missing."
    }
  }
};
const FORM_SECTION_FLOW = {
  0: [
    {
      key: "clientBusiness",
      title: "Client & Business Information",
      body: "Next, add the core address details so the listing can be searched properly."
    },
    {
      key: "address",
      title: "Address Details",
      body: "Now add the best contact numbers and email customers should use."
    },
    {
      key: "contact",
      title: "Contact Information",
      body: "Next up is the business background so people know what this shop or service does."
    },
    {
      key: "businessInfo",
      title: "Business Information",
      body: "Next, complete map and website details for better trust and discoverability."
    },
    {
      key: "locationWeb",
      title: "Location & Web Presence",
      body: "Social profiles are optional, but helpful if the business already uses them."
    },
    {
      key: "socialMedia",
      title: "Social Media",
      body: "Next, upload the banner and write a clean business description."
    },
    {
      key: "bannerDetails",
      title: "Business Banner & Details",
      body: "Then set opening hours so visitors know exactly when the business is available."
    },
    {
      key: "openingHours",
      title: "Opening Hours",
      body: "Last in this step: badges and visibility settings."
    },
    {
      key: "badgesVisibility",
      title: "Badges & Visibility"
    }
  ],
  1: [
    {
      key: "kycDocuments",
      title: "KYC Documents"
    }
  ],
  2: [
    {
      key: "categorySeo",
      title: "Category & SEO",
      body: "Next, add strong keywords and tags so search matching gets better."
    },
    {
      key: "keywordsTags",
      title: "Keywords & Tags",
      body: "Then shape how the listing title and description appear to customers."
    },
    {
      key: "displaySeo",
      title: "Display & SEO",
      body: "Finish with SEO metadata, slug, and any required category filters."
    },
    {
      key: "searchSeo",
      title: "Search Engine Optimization"
    }
  ]
};
const getSectionRefKey = (step, sectionKey) => `${step}:${sectionKey}`;
const BusinessList = React.memo(() => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    enqueueSnackbar
  } = useSnackbar();
  const {
    businessList = [],
    total = 0,
    loading,
    exportLoading = false
  } = useSelector(state => state.businessListReducer || {});
  const {
    searchSuggestion = []
  } = useSelector(state => state.userClientReducer || {});
  const {
    users = []
  } = useSelector(state => state.userReducer || {});
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
  const {
    leadToImport = null
  } = useSelector(state => state.gmapsLeadsReducer || {});
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
  const [categoryKeywordSuggestions, setCategoryKeywordSuggestions] = useState([]);

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
  const tableRefreshTimerRef = useRef(null);

  // ===== GMaps Picker State =====
  const [gmapsPickerOpen, setGmapsPickerOpen] = useState(false);
  const [pickerLeads, setPickerLeads] = useState([]);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerLocations, setPickerLocations] = useState([]);
  const [pickerFilters, setPickerFilters] = useState({
    search: '',
    massclick_location: '',
    min_rating: '',
    has_phone: false,
    status: 'available',
  });

  const getObjectId = (value) => {
    if (!value) return "";
    if (typeof value === "object") return value.$oid || value._id || value.id || "";
    return String(value);
  };

  const getUserDisplayName = (user) =>
    user?.userName || user?.name || user?.fullName || user?.emailId || user?.email || "";

  const getCreatedByDisplayName = (createdBy) => {
    if (!createdBy) return "—";

    if (typeof createdBy === "object") {
      const populatedName = getUserDisplayName(createdBy);
      if (populatedName) return populatedName;
    }

    const createdById = getObjectId(createdBy);
    const user = users.find((u) => getObjectId(u._id) === createdById);

    return getUserDisplayName(user) || "—";
  };

  const handlePayNow = row => {
    const amount = 1;
    let businessId = row?._id?.$oid || row?._id || row?.businessId || row?.id || createdBusinessId;
    let userId = row?.createdBy?.$oid || (typeof row?.createdBy === "string" ? row.createdBy : null) || createUserId;
    if (!row) {
      businessId = createdBusinessId;
      userId = createUserId;
    }
    if (!businessId || !userId) {
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
    const cleanedFormData = getCleanBusinessFormData(formData);

    if (activeStep === 0) {
      const duplicateSignature = getDuplicateCheckSignature(cleanedFormData);
      const duplicateMatches = getPotentialDuplicateMatches(cleanedFormData);

      if (duplicateMatches.length > 0 && duplicateBypassSignature !== duplicateSignature) {
        setDuplicateReview({
          open: true,
          matches: duplicateMatches,
          signature: duplicateSignature,
          action: "step-lock"
        });
        showSideSuggestion({
          title: "Review similar businesses before moving on",
          body: "This record looks close to an existing business. Confirm it first so we avoid a duplicate listing.",
          items: duplicateMatches.map(match => match.businessName),
          tone: "warning"
        });
        enqueueSnackbar("Duplicate restriction triggered in Step 1. Resolve it or save as draft locally.", {
          variant: "warning"
        });
        return;
      }
    }

    const stepValidationContext = {
      bannerPreview: preview,
      uploadedKycFiles: kycFiles,
      isEditing: editMode
    };
    const stepErrors = getStepValidationErrors(
      validateBusinessEntryData(cleanedFormData, stepValidationContext),
      cleanedFormData,
      activeStep,
      listingMode
    );

    if (stepErrors.length > 0) {
      setStepValidationTriggered(prev => ({
        ...prev,
        [activeStep]: true
      }));
      setFieldErrors(prev => ({
        ...prev,
        ...buildFieldErrorMap(stepErrors)
      }));
      showSideSuggestion({
        title: listingMode === LISTING_MODE.PAID ? "Complete this section before continuing" : "A few core details still need attention",
        body: listingMode === LISTING_MODE.PAID
          ? "Paid listings need these details before the next section unlocks."
          : "Free listings stay flexible, but these core details still block the next section.",
        items: stepErrors.map(error => error.label),
        tone: listingMode === LISTING_MODE.PAID ? "warning" : "info"
      });
      enqueueSnackbar(
        listingMode === LISTING_MODE.PAID
          ? "Finish the required details on this step to continue."
          : "Please complete the required core details on this step.",
        {
          variant: listingMode === LISTING_MODE.PAID ? "warning" : "error"
        }
      );
      return;
    }

    const nextStepIndex = activeStep + 1;
    setStepValidationTriggered(prev => ({
      ...prev,
      [activeStep]: true
    }));
    setActiveStep(nextStepIndex);
    const nextStepNotification = STEP_NOTIFICATION_CONTENT[nextStepIndex]?.[listingMode];
    if (nextStepNotification) {
      showSideSuggestion({
        title: nextStepNotification.title,
        body: nextStepNotification.body,
        tone: "info"
      });
    }
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
  const getSectionFlowForStep = step => FORM_SECTION_FLOW[step] || [];
  const getSectionNavigation = (step, sectionKey) => {
    const stepSections = getSectionFlowForStep(step);
    const currentIndex = stepSections.findIndex(section => section.key === sectionKey);

    if (currentIndex < 0) {
      return null;
    }

    const nextSection = stepSections[currentIndex + 1];
    if (nextSection) {
      return {
        type: "section",
        label: `Next: ${nextSection.title}`,
        title: `Up next: ${nextSection.title}`,
        body: nextSection.body || "Keep moving through the form one section at a time."
      };
    }

    if (step === steps.length - 2) {
      return {
        type: "submit",
        label: editMode ? "Save Business" : "Final Next"
      };
    }

    if (step < steps.length - 2) {
      const nextStepIndex = step + 1;
      const nextStepNotification = STEP_NOTIFICATION_CONTENT[nextStepIndex]?.[listingMode];
      return {
        type: "step",
        label: `Next: ${steps[nextStepIndex]}`,
        title: nextStepNotification?.title || `Next step: ${steps[nextStepIndex]}`,
        body: nextStepNotification?.body || "Move ahead when you're ready."
      };
    }

    return null;
  };
  const handleSectionAdvance = (step, sectionKey) => {
    const navigation = getSectionNavigation(step, sectionKey);
    if (!navigation) {
      return;
    }

    if (navigation.type === "section") {
      const stepSections = getSectionFlowForStep(step);
      const currentIndex = stepSections.findIndex(section => section.key === sectionKey);
      const nextSection = currentIndex >= 0 ? stepSections[currentIndex + 1] : null;

      showSideSuggestion({
        title: navigation.title,
        body: navigation.body,
        tone: "info"
      });
      const nextSectionNode = nextSection ? sectionRefs.current[getSectionRefKey(step, nextSection.key)] : null;
      if (nextSectionNode?.scrollIntoView) {
        nextSectionNode.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
      return;
    }

    if (navigation.type === "submit") {
      businessFormRef.current?.requestSubmit?.();
      return;
    }

    handleNext();
  };
  const renderSectionAdvanceButton = (step, sectionKey) => {
    const navigation = getSectionNavigation(step, sectionKey);

    if (!navigation || activeStep >= steps.length - 1) {
      return null;
    }

    return (
      <div className={cx("col-span-all", "section-nav-row")}>
        <button
          type="button"
          className={cx("step-nav-button", "section-next-button")}
          onClick={() => handleSectionAdvance(step, sectionKey)}
          disabled={navigation.type === "submit" && loading}
        >
          <span>{navigation.label}</span>
          <SkipNextIcon fontSize="small" />
        </button>
      </div>
    );
  };
  const renderSectionIntro = (step, sectionKey, title, subtitle) => (
    <div
      className={cx("col-span-all", "form-section-anchor")}
      ref={node => {
        const refKey = getSectionRefKey(step, sectionKey);
        if (node) {
          sectionRefs.current[refKey] = node;
        } else {
          delete sectionRefs.current[refKey];
        }
      }}
    >
      <SectionHeader title={title} subtitle={subtitle} />
    </div>
  );
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
      }
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
      }
  };
  const handleCloseGallery = () => {
    setGalleryDialog({
      open: false,
      data: null
    });
  };
  const createEmptyBusinessFormData = () => ({
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
    openingHours: defaultOpeningHours.map(hour => ({ ...hour })),
    geoLocation: {
      type: "Point",
      coordinates: ["", ""]
    },
    filters: {},
    badges: {
      isFeatured: false,
      isSponsored: false,
      isTrending: false,
      priorityScore: 0,
    },
    verification: {
      isVerified: false,
      verificationType: "ADMIN",
    },
  });
  const [formData, setFormData] = useState({
    ...createEmptyBusinessFormData()
  });
  const [categoryFilterConfig, setCategoryFilterConfig] = useState([]);
  const [filterConfigLoading, setFilterConfigLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [forceBypassedFields, setForceBypassedFields] = useState([]);
  const [listingMode, setListingMode] = useState(LISTING_MODE.FREE);
  const [warnLevel, setWarnLevel] = useState(0);
  const [warnDialog, setWarnDialog] = useState(false);
  const [possibleDuplicateMatches, setPossibleDuplicateMatches] = useState([]);
  const [duplicateReview, setDuplicateReview] = useState({
    open: false,
    matches: [],
    signature: "",
    action: "save"
  });
  const [duplicateBypassSignature, setDuplicateBypassSignature] = useState("");
  const [localDraftMeta, setLocalDraftMeta] = useState(null);
  const [preview, setPreview] = useState(null);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [badgeUpdateLoading, setBadgeUpdateLoading] = useState(false);
  const [postCreatePaidStatus, setPostCreatePaidStatus] = useState("idle");
  const [postCreateBusinessName, setPostCreateBusinessName] = useState("");
  const [stepValidationTriggered, setStepValidationTriggered] = useState({});
  const [sideSuggestion, setSideSuggestion] = useState({
    open: false,
    title: "",
    body: "",
    items: [],
    tone: "info"
  });
  const businessFormRef = useRef(null);
  const sectionRefs = useRef({});
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null
  });
  const isForceBypassableField = field => Boolean(field) && !FORCE_BYPASS_BLOCKED_FIELDS.has(field);
  const getUniqueFields = fields => [...new Set((fields || []).filter(Boolean))];
  const getPaidStepFieldNames = useCallback((data, step) => {
    const fields = [...(PAID_STEP_FIELD_MAP[step] || [])];

    if (step === 0) {
      (data?.openingHours || []).forEach(hour => {
        if (!hour?.isClosed && !hour?.is24Hours && hour?.day) {
          fields.push(`openingHours.${hour.day}`);
        }
      });
    }

    if (step === 2) {
      (categoryFilterConfig || []).forEach(filter => {
        if (filter?.isRequired && filter?.key) {
          fields.push(`filters.${filter.key}`);
        }
      });
    }

    return getUniqueFields(fields);
  }, [categoryFilterConfig]);
  const getFreeBlockingFieldsForStep = useCallback(step => getUniqueFields(FREE_STEP_FIELD_MAP[step] || []), []);
  const getStepValidationErrors = useCallback((allErrors, data, step, mode) => {
    const relevantFields = mode === LISTING_MODE.PAID
      ? new Set(getPaidStepFieldNames(data, step))
      : new Set(getFreeBlockingFieldsForStep(step));

    return allErrors.filter(error => relevantFields.has(error.field));
  }, [getFreeBlockingFieldsForStep, getPaidStepFieldNames]);
  const getFieldError = field => fieldErrors[field];
  const getInputClassName = (baseClass, field) => cx(baseClass, getFieldError(field) && "error");
  const renderFieldError = field => (
    getFieldError(field) ? <span className={cx("error-text")}>{getFieldError(field)}</span> : null
  );
  const showSideSuggestion = useCallback(({
    title,
    body,
    items = [],
    tone = "info"
  }) => {
    setSideSuggestion({
      open: true,
      title,
      body,
      items: getUniqueFields(items).slice(0, 6),
      tone
    });
  }, []);
  const getMarkPaidPayload = source => ({
    name: source?.businessName,
    businessName: source?.businessName,
    category: source?.category,
    location: source?.location,
    payment: [{
      amount: source?.subscription?.price || 1
    }]
  });
  function resetToCreateBusinessState({
    nextView = "form",
    nextStep = 0,
    prefill = null,
    syncDraftMeta = true,
    scroll = true
  } = {}) {
    const baseFormData = createEmptyBusinessFormData();
    const source = prefill && typeof prefill === "object" ? prefill : {};
    const nextFormData = {
      ...baseFormData,
      ...source,
      filters: source.filters && typeof source.filters === "object" ? source.filters : {},
      badges: {
        ...baseFormData.badges,
        ...(source.badges || {})
      },
      verification: {
        ...baseFormData.verification,
        ...(source.verification || {})
      },
      geoLocation: {
        type: "Point",
        coordinates: Array.isArray(source.geoLocation?.coordinates)
          ? source.geoLocation.coordinates.map(value => String(value ?? ""))
          : [...baseFormData.geoLocation.coordinates]
      },
      openingHours: Array.isArray(source.openingHours) && source.openingHours.length > 0
        ? source.openingHours.map(hour => ({
          day: hour.day || "",
          open: hour.open || "",
          close: hour.close || "",
          isClosed: Boolean(hour.isClosed),
          is24Hours: Boolean(hour.is24Hours)
        }))
        : baseFormData.openingHours
    };

    revokePreviewUrls(kycFiles);
    setEditMode(false);
    setEditId(null);
    setFormData(nextFormData);
    setBusinessValue(nextFormData.businessDetails || "");
    setPreview(nextFormData.bannerImage || null);
    setKycFiles([]);
    setFieldErrors({});
    setForceBypassedFields([]);
    setListingMode(LISTING_MODE.FREE);
    setWarnLevel(0);
    setWarnDialog(false);
    setPossibleDuplicateMatches([]);
    setDuplicateReview({
      open: false,
      matches: [],
      signature: "",
      action: "save"
    });
    setDuplicateBypassSignature("");
    setCategoryKeywordSuggestions([]);
    setInputKeyword("");
    setPostCreatePaidStatus("idle");
    setPostCreateBusinessName("");
    setStepValidationTriggered({});
    setSideSuggestion({
      open: false,
      title: "",
      body: "",
      items: [],
      tone: "info"
    });
    setActiveView(nextView);
    setActiveStep(nextStep);

    if (syncDraftMeta) {
      const draft = getStoredBusinessDraft();
      setLocalDraftMeta(draft?.savedAt ? { savedAt: draft.savedAt } : null);
    } else {
      setLocalDraftMeta(null);
    }

    if (scroll) {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  }

  const handleAdminViewChange = nextView => {
    if (nextView === "list") {
      if (editMode) {
        resetToCreateBusinessState({
          nextView: "list",
          scroll: false
        });
        return;
      }

      setActiveView("list");
      return;
    }

    setActiveView("form");
  };

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
    dispatch(getAllUsers({ pageNo: 1, pageSize: 1000 }));
    dispatch(checkPhonePeStatus());
  }, [dispatch]);

  // ===== GMaps Lead Pre-fill =====
  useEffect(() => {
    if (!leadToImport) return;
    const [lng, lat] = leadToImport.geoLocation?.coordinates || ['', ''];
    // Try to match category by slug or by search_query text
    const matchedCategory = category.find(c =>
      c.slug === leadToImport.massclick_category ||
      String(c.category || '').toLowerCase() === String(leadToImport.search_query || '').toLowerCase()
    );
    resetToCreateBusinessState({
      syncDraftMeta: false,
      prefill: {
        businessName: leadToImport.name || '',
        contact: leadToImport.phone || '',
        contactList: leadToImport.phone || '',
        whatsappNumber: leadToImport.phone || '',
        website: leadToImport.website || '',
        location: leadToImport.massclick_location || '',
        globalAddress: leadToImport.formatted_address || '',
        geoLocation: {
          type: 'Point',
          coordinates: [String(lng || ''), String(lat || '')]
        },
        category: matchedCategory?.category || '',
      }
    });
    enqueueSnackbar(`Pre-filled from GMaps: ${leadToImport.name}`, { variant: 'info' });
  }, [leadToImport]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== GMaps Picker Functions =====
  const fetchPickerLeads = useCallback(async (page, filters) => {
    setPickerLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const f = filters || pickerFilters;
      const params = new URLSearchParams({
        pageNo: page || pickerPage,
        pageSize: 15,
        search: f.search || '',
        massclick_location: f.massclick_location || '',
        min_rating: f.min_rating || '',
        has_phone: f.has_phone ? 'true' : '',
        status: f.status || 'all',
        business_status: 'OPERATIONAL',
      }).toString();
      const res = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/gmaps-leads/viewall?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPickerLeads(res.data.data || []);
      setPickerTotal(res.data.total || 0);
    } catch (e) {
      enqueueSnackbar('Failed to load GMaps leads', { variant: 'error' });
    } finally {
      setPickerLoading(false);
    }
  }, [pickerFilters, pickerPage, enqueueSnackbar]);

  const openGmapsPicker = useCallback(async () => {
    setGmapsPickerOpen(true);
    setPickerPage(1);
    if (pickerLocations.length === 0) {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await axiosInstance.get(
          `${process.env.REACT_APP_API_URL}/gmaps-leads/distincts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPickerLocations(res.data.locations || []);
      } catch (e) { }
    }
    fetchPickerLeads(1, pickerFilters);
  }, [pickerLocations.length, pickerFilters, fetchPickerLeads]);

  const applyGmapsLead = useCallback((lead) => {
    const [lng, lat] = lead.geoLocation?.coordinates || ['', ''];
    const matchedCategory = category.find(c =>
      c.slug === lead.massclick_category ||
      String(c.category || '').toLowerCase() === String(lead.search_query || '').toLowerCase()
    );
    resetToCreateBusinessState({
      syncDraftMeta: false,
      prefill: {
        businessName: lead.name || '',
        contact: lead.phone || '',
        contactList: lead.phone || '',
        whatsappNumber: lead.phone || '',
        website: lead.website || '',
        location: lead.massclick_location || '',
        globalAddress: lead.formatted_address || '',
        geoLocation: {
          type: 'Point',
          coordinates: [String(lng || ''), String(lat || '')],
        },
        category: matchedCategory?.category || '',
      }
    });
    dispatch(setGmapsLeadToImport(lead));
    setGmapsPickerOpen(false);
    enqueueSnackbar(`Pre-filled: ${lead.name}`, { variant: 'info' });
  }, [category, dispatch, enqueueSnackbar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== FILTER & SEARCH HANDLERS =====
  const normalizeSearchValue = value => String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const collectSearchValues = value => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(collectSearchValues);
    if (value instanceof Date) return [value.toISOString()];
    if (typeof value === "object") return Object.values(value).flatMap(collectSearchValues);
    return [String(value)];
  };

  const buildSearchHaystack = values => collectSearchValues(values).map(normalizeSearchValue).filter(Boolean).join(" ");

  const valueMatchesSearch = (value, term) => {
    const normalizedTerm = normalizeSearchValue(term);
    if (!normalizedTerm) return true;
    const tokens = normalizedTerm.split(" ").filter(Boolean);
    const haystack = buildSearchHaystack(value);
    return tokens.every(token => haystack.includes(token));
  };

  const matchesSelectedValue = (value, selectedValue) => {
    const selected = normalizeSearchValue(selectedValue);
    if (!selected) return true;
    const candidates = collectSearchValues(value).map(normalizeSearchValue).filter(Boolean);
    return candidates.some(candidate => (
      candidate === selected ||
      candidate.includes(selected) ||
      (candidate.length >= 3 && selected.includes(candidate))
    ));
  };

  const isBusinessPaid = row => {
    if (row.amountPaid === true || Boolean(row.paidDate)) return true;
    if (!Array.isArray(row.payment)) return false;
    return row.payment.some(payment => {
      if (!payment || typeof payment !== "object") return false;
      const status = normalizeSearchValue(payment.status || payment.paymentStatus || payment.payment_status);
      const amount = Number(payment.amount || payment.amountPaid || payment.paidAmount || 0);
      return status === "paid" || amount > 0;
    });
  };

  const getServerSearchQuery = (filters = appliedFilters) => {
    return [filters.searchTerm, filters.category, filters.location]
      .map(value => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
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

  const buildFilterState = (overrides = {}) => ({
    searchTerm: String(overrides.searchTerm ?? searchTerm).trim(),
    category: overrides.category ?? selectedCategory,
    location: overrides.location ?? selectedLocation,
    paymentStatus: overrides.paymentStatus ?? paymentStatus
  });

  const queueTableRefresh = useCallback((delay = SEARCH_REFRESH_DELAY) => {
    if (tableRefreshTimerRef.current) clearTimeout(tableRefreshTimerRef.current);
    tableRefreshTimerRef.current = setTimeout(() => {
      setTableRefreshKey(prev => prev + 1);
    }, delay);
  }, []);

  const syncFilters = (overrides = {}, { refreshDelay = SEARCH_REFRESH_DELAY } = {}) => {
    const nextFilters = buildFilterState(overrides);
    setAppliedFilters(nextFilters);
    updateActiveFilters(nextFilters);
    queueTableRefresh(refreshDelay);
    return nextFilters;
  };

  useEffect(() => () => {
    if (tableRefreshTimerRef.current) clearTimeout(tableRefreshTimerRef.current);
  }, []);

  const handleApplyFilters = () => {
    syncFilters({}, { refreshDelay: 0 });
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
    syncFilters(nextFilters, { refreshDelay: 0 });
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
    syncFilters(nextFilters, { refreshDelay: 0 });
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
        const matchesSearch = valueMatchesSearch([
          row.clientId,
          row.id,
          row._id,
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
          row.filters,
          row.mniDetails,
          row.openingHours,
          row.website,
          row.googleMap
        ], appliedSearchTerm);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (!matchesSelectedValue([row.category, row.mniDetails, row.filters], appliedCategory)) return false;

      // Location filter
      if (!matchesSelectedValue([row.location, row.globalAddress, row.street, row.pincode, row.googleMap], appliedLocation)) return false;

      // Payment status filter
      if (appliedPaymentStatus !== "all") {
        const paid = isBusinessPaid(row);
        if (appliedPaymentStatus === "paid" && !paid) return false;
        if (appliedPaymentStatus === "pending" && paid) return false;
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
        keywords: [],
        slug: selected?.slug || "",
        seoTitle: selected?.seoTitle || "",
        seoDescription: selected?.seoDescription || "",
        title: selected?.title || "",
        description: selected?.description || ""
      };
      setFormData(prev => ({
        ...prev,
        category: value,
        keywords: [],
        slug: selected?.slug || "",
        seoTitle: selected?.seoTitle || "",
        seoDescription: selected?.seoDescription || "",
        title: selected?.title || "",
        description: selected?.description || ""
      }));
      setCategoryKeywordSuggestions(Array.isArray(selected?.keywords) ? selected.keywords : []);
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
  const getStoredBusinessDraft = () => {
    try {
      const rawDraft = localStorage.getItem(BUSINESS_LOCAL_DRAFT_KEY);
      if (!rawDraft) return null;
      const parsedDraft = JSON.parse(rawDraft);
      return parsedDraft && typeof parsedDraft === "object" ? parsedDraft : null;
    } catch {
      return null;
    }
  };
  const normalizeCategoryKey = value => normalizeText(value).toLowerCase();
  const normalizeLooseText = value => normalizeCategoryKey(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const toCategorySlug = value => normalizeCategoryKey(value).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const stripHtml = value => normalizeText(String(value ?? "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " "));
  const digitsOnly = value => String(value ?? "").replace(/\D/g, "");
  const createBigramList = value => {
    const compact = normalizeLooseText(value).replace(/\s+/g, "");
    if (compact.length < 2) return compact ? [compact] : [];
    const grams = [];
    for (let index = 0; index < compact.length - 1; index += 1) {
      grams.push(compact.slice(index, index + 2));
    }
    return grams;
  };
  const getTokenSimilarity = (left, right) => {
    const leftTokens = normalizeLooseText(left).split(" ").filter(Boolean);
    const rightTokens = normalizeLooseText(right).split(" ").filter(Boolean);
    if (!leftTokens.length || !rightTokens.length) return 0;
    const leftSet = new Set(leftTokens);
    const rightSet = new Set(rightTokens);
    let sharedCount = 0;
    leftSet.forEach(token => {
      if (rightSet.has(token)) sharedCount += 1;
    });
    return sharedCount / Math.max(leftSet.size, rightSet.size);
  };
  const getDiceSimilarity = (left, right) => {
    const leftBigrams = createBigramList(left);
    const rightBigrams = createBigramList(right);
    if (!leftBigrams.length || !rightBigrams.length) return 0;
    const remaining = [...rightBigrams];
    let overlap = 0;
    leftBigrams.forEach(bigram => {
      const matchIndex = remaining.indexOf(bigram);
      if (matchIndex >= 0) {
        overlap += 1;
        remaining.splice(matchIndex, 1);
      }
    });
    return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
  };
  const getTextSimilarity = (left, right) => {
    const leftValue = normalizeLooseText(left);
    const rightValue = normalizeLooseText(right);
    if (!leftValue || !rightValue) return 0;
    if (leftValue === rightValue) return 1;
    if (leftValue.includes(rightValue) || rightValue.includes(leftValue)) return 0.93;
    return Math.max(getTokenSimilarity(leftValue, rightValue), getDiceSimilarity(leftValue, rightValue));
  };
  const getPhoneCandidates = data => [...new Set([
    digitsOnly(data.contact),
    digitsOnly(data.contactList),
    digitsOnly(data.whatsappNumber)
  ].filter(number => number.length >= 10))];
  const getDuplicateCheckSignature = data => [
    normalizeLooseText(data.businessName),
    normalizeLooseText(data.location),
    normalizeLooseText(data.plotNumber),
    normalizeLooseText(data.street),
    normalizeLooseText(data.globalAddress),
    normalizeLooseText(data.pincode),
    normalizeLooseText(data.category),
    ...getPhoneCandidates(data),
    ...((Array.isArray(data.geoLocation?.coordinates) ? data.geoLocation.coordinates : ["", ""]).map(value => normalizeText(value)))
  ].join("|");
  const getCoordinatesFromSource = source => {
    const [longitudeRaw = "", latitudeRaw = ""] = Array.isArray(source?.geoLocation?.coordinates) ? source.geoLocation.coordinates : ["", ""];
    const longitude = Number(longitudeRaw);
    const latitude = Number(latitudeRaw);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    return {
      latitude,
      longitude
    };
  };
  const getDistanceInKm = (leftCoords, rightCoords) => {
    if (!leftCoords || !rightCoords) return null;
    const toRadians = degrees => degrees * (Math.PI / 180);
    const earthRadiusKm = 6371;
    const deltaLatitude = toRadians(rightCoords.latitude - leftCoords.latitude);
    const deltaLongitude = toRadians(rightCoords.longitude - leftCoords.longitude);
    const latitudeA = toRadians(leftCoords.latitude);
    const latitudeB = toRadians(rightCoords.latitude);
    const haversine = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(deltaLongitude / 2) ** 2;
    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  };
  const toSortedUniqueTextOptions = values => Array.from(new Set(
    (values || [])
      .map(value => normalizeText(typeof value === "string" || typeof value === "number" ? value : value ?? ""))
      .filter(Boolean)
  )).sort((left, right) => String(left).localeCompare(String(right), undefined, { sensitivity: "base" }));
  const getPotentialDuplicateMatches = cleanedFormData => {
    const currentId = editMode ? getObjectId(editId) : "";
    const candidatePhones = getPhoneCandidates(cleanedFormData);
    const candidateCoords = getCoordinatesFromSource(cleanedFormData);
    const minimumSignalsPresent = [
      cleanedFormData.businessName,
      cleanedFormData.globalAddress,
      cleanedFormData.street,
      cleanedFormData.location,
      cleanedFormData.pincode,
      ...candidatePhones
    ].some(value => normalizeText(value).length >= 3);

    if (!minimumSignalsPresent) return [];

    return (businessList || []).filter(item => item?.isActive !== false).map(item => {
      const businessId = getObjectId(item?._id || item?.id);
      if (currentId && businessId === currentId) return null;

      const existingPhones = getPhoneCandidates(item || {});
      const matchingPhones = candidatePhones.filter(number => existingPhones.includes(number));
      const nameSimilarity = getTextSimilarity(cleanedFormData.businessName, item?.businessName);
      const addressSimilarity = getTextSimilarity(
        `${cleanedFormData.plotNumber} ${cleanedFormData.street} ${cleanedFormData.globalAddress}`,
        `${item?.plotNumber || ""} ${item?.street || ""} ${item?.globalAddress || ""}`
      );
      const streetSimilarity = getTextSimilarity(cleanedFormData.street, item?.street);
      const sameLocation = normalizeLooseText(cleanedFormData.location) && normalizeLooseText(cleanedFormData.location) === normalizeLooseText(item?.location);
      const samePincode = normalizeText(cleanedFormData.pincode) && normalizeText(cleanedFormData.pincode) === normalizeText(item?.pincode);
      const sameCategory = normalizeLooseText(cleanedFormData.category) && normalizeLooseText(cleanedFormData.category) === normalizeLooseText(item?.category);
      const samePlotNumber = normalizeLooseText(cleanedFormData.plotNumber) && normalizeLooseText(cleanedFormData.plotNumber) === normalizeLooseText(item?.plotNumber);
      const distanceKm = getDistanceInKm(candidateCoords, getCoordinatesFromSource(item));
      const reasons = [];
      let score = 0;

      if (matchingPhones.length > 0) {
        score += 5;
        reasons.push(`same phone number (${matchingPhones[0]})`);
      }
      if (nameSimilarity >= 0.96) {
        score += 4;
        reasons.push("same business name");
      } else if (nameSimilarity >= 0.8) {
        score += 3;
        reasons.push("very similar business name");
      }
      if (addressSimilarity >= 0.92) {
        score += 3;
        reasons.push("same full address");
      } else if (addressSimilarity >= 0.75) {
        score += 2;
        reasons.push("very similar address");
      }
      if (streetSimilarity >= 0.88) {
        score += 1.5;
        reasons.push("same street");
      }
      if (sameLocation) {
        score += 1.25;
        reasons.push("same location");
      }
      if (samePincode) {
        score += 1.25;
        reasons.push("same pincode");
      }
      if (sameCategory) {
        score += 0.75;
        reasons.push("same category");
      }
      if (samePlotNumber && (addressSimilarity >= 0.55 || streetSimilarity >= 0.6)) {
        score += 1;
        reasons.push("same plot or shop number");
      }
      if (typeof distanceKm === "number" && distanceKm <= 0.2) {
        score += 2;
        reasons.push(distanceKm <= 0.05 ? "same map coordinates" : "very close map coordinates");
      }
      if (nameSimilarity >= 0.7 && (sameLocation || samePincode || addressSimilarity >= 0.6)) {
        score += 1;
      }

      const isLikelyDuplicate = score >= 5.5 || (matchingPhones.length > 0 && (nameSimilarity >= 0.55 || addressSimilarity >= 0.55 || sameLocation || samePincode));
      if (!isLikelyDuplicate) return null;

      return {
        id: businessId || item?._id,
        businessName: item?.businessName || "Untitled business",
        category: item?.category || "—",
        location: item?.location || "—",
        globalAddress: item?.globalAddress || `${item?.plotNumber || ""} ${item?.street || ""}`.trim() || "—",
        contact: item?.contact || item?.contactList || item?.whatsappNumber || "—",
        score,
        reasons: [...new Set(reasons)].slice(0, 4)
      };
    }).filter(Boolean).sort((left, right) => right.score - left.score).slice(0, 5);
  };
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
  const revokePreviewUrls = useCallback(files => {
    (files || []).forEach(file => {
      if (typeof file?.preview === "string" && file.preview.startsWith("blob:")) {
        URL.revokeObjectURL(file.preview);
      }
    });
  }, []);
  const buildDemoSvgMarkup = useCallback((headline, subline) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="demoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff7ed" />
      <stop offset="100%" stop-color="#fed7aa" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#demoGradient)" />
  <rect x="56" y="56" width="1088" height="518" rx="28" fill="#ffffff" opacity="0.95" />
  <text x="100" y="250" fill="#9a3412" font-family="Arial, sans-serif" font-size="42" font-weight="700">${headline}</text>
  <text x="100" y="320" fill="#7c2d12" font-family="Arial, sans-serif" font-size="28">${subline}</text>
  <text x="100" y="420" fill="#ea580c" font-family="Arial, sans-serif" font-size="22">MassClick automated demo asset</text>
</svg>`, []);
  const buildDemoImageAsset = useCallback((filename, headline, subline) => {
    const svgMarkup = buildDemoSvgMarkup(headline, subline);
    const file = new File([svgMarkup], filename, {
      type: "image/svg+xml"
    });
    file.preview = URL.createObjectURL(file);
    return {
      file,
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`
    };
  }, [buildDemoSvgMarkup]);
  const buildDemoDataUrlAsset = useCallback((filename, dataUrl) => {
    const [meta, base64Payload] = String(dataUrl || "").split(",");
    const mimeType = meta?.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
    const binary = atob(base64Payload || "");
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const file = new File([bytes], filename, {
      type: mimeType
    });
    file.preview = URL.createObjectURL(file);
    return {
      file,
      dataUrl
    };
  }, []);
  const passOrMessage = (condition, message) => condition ? true : message;
  const getBusinessValidationRules = (data, {
    bannerPreview = preview,
    uploadedKycFiles = kycFiles,
    isEditing = editMode
  } = {}) => {
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
      { field: "bannerImage", label: "Business banner image", required: true, example: "shop-front.jpg", suggestion: "Upload a clear shop, logo, or business image.", getValue: source => bannerPreview || source.bannerImage },
      { field: "kycDocuments", label: "KYC document", required: true, example: "GST certificate or shop proof", suggestion: "Upload at least one verification document.", getValue: source => isEditing ? [...(source.kycDocuments || []), ...uploadedKycFiles] : uploadedKycFiles },
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
  const validateBusinessEntryData = (data, validationContext = {}) => {
    return getBusinessValidationRules(data, validationContext).reduce((errors, rule) => {
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
  const saveDraftToLocal = () => {
    if (editMode) {
      enqueueSnackbar("Local drafts are only available while creating a new business.", {
        variant: "info"
      });
      return;
    }

    const cleanedFormData = getCleanBusinessFormData({
      ...formData,
      businessDetails: businessvalue
    });
    const draftPayload = {
      savedAt: new Date().toISOString(),
      activeStep,
      formData: {
        ...cleanedFormData,
        bannerImage: preview || cleanedFormData.bannerImage || "",
        businessDetails: businessvalue,
        kycDocuments: []
      }
    };

    localStorage.setItem(BUSINESS_LOCAL_DRAFT_KEY, JSON.stringify(draftPayload));
    setLocalDraftMeta({ savedAt: draftPayload.savedAt });
    enqueueSnackbar("Draft saved locally on this browser.", {
      variant: "success"
    });
  };
  const clearLocalDraft = (showMessage = true) => {
    localStorage.removeItem(BUSINESS_LOCAL_DRAFT_KEY);
    setLocalDraftMeta(null);
    if (showMessage) {
      enqueueSnackbar("Local business draft cleared.", {
        variant: "info"
      });
    }
  };
  const restoreDraftFromLocal = () => {
    if (editMode) return;

    const draft = getStoredBusinessDraft();
    if (!draft?.formData) {
      enqueueSnackbar("No saved local draft found.", {
        variant: "info"
      });
      setLocalDraftMeta(null);
      return;
    }

    const baseFormData = createEmptyBusinessFormData();
    const restoredFormData = {
      ...baseFormData,
      ...draft.formData,
      filters: draft.formData.filters && typeof draft.formData.filters === "object" ? draft.formData.filters : {},
      badges: {
        ...baseFormData.badges,
        ...(draft.formData.badges || {})
      },
      verification: {
        ...baseFormData.verification,
        ...(draft.formData.verification || {})
      },
      geoLocation: {
        type: "Point",
        coordinates: Array.isArray(draft.formData.geoLocation?.coordinates)
          ? draft.formData.geoLocation.coordinates.map(value => String(value ?? ""))
          : ["", ""]
      },
      openingHours: Array.isArray(draft.formData.openingHours) && draft.formData.openingHours.length > 0
        ? draft.formData.openingHours.map(hour => ({
          day: hour.day || "",
          open: hour.open || "",
          close: hour.close || "",
          isClosed: Boolean(hour.isClosed),
          is24Hours: Boolean(hour.is24Hours)
        }))
        : baseFormData.openingHours
    };

    setEditMode(false);
    setEditId(null);
    setFormData(restoredFormData);
    setBusinessValue(restoredFormData.businessDetails || "");
    setPreview(restoredFormData.bannerImage || null);
    setKycFiles([]);
    setFieldErrors({});
    setForceBypassedFields([]);
    setWarnLevel(0);
    setWarnDialog(false);
    setDuplicateReview({
      open: false,
      matches: [],
      signature: "",
      action: "save"
    });
    setDuplicateBypassSignature("");
    setActiveView("form");
    setActiveStep(Number.isInteger(draft.activeStep) ? Math.max(0, Math.min(draft.activeStep, steps.length - 2)) : 0);
    setLocalDraftMeta(draft.savedAt ? { savedAt: draft.savedAt } : null);
    enqueueSnackbar("Local draft restored.", {
      variant: "success"
    });
  };
  useEffect(() => {
    if (editMode) return;
    const draft = getStoredBusinessDraft();
    if (draft?.savedAt) {
      setLocalDraftMeta({ savedAt: draft.savedAt });
    } else {
      setLocalDraftMeta(null);
    }
  }, [editMode, activeView]);
  useEffect(() => {
    const cleanedFormData = getCleanBusinessFormData(formData);
    setPossibleDuplicateMatches(getPotentialDuplicateMatches(cleanedFormData));
  }, [formData, businessList, editId, editMode]); // eslint-disable-line react-hooks/exhaustive-deps
  const liveValidationContext = {
    bannerPreview: preview,
    uploadedKycFiles: kycFiles,
    isEditing: editMode
  };
  const cleanedLiveFormData = getCleanBusinessFormData(formData);
  const currentValidationErrors = validateBusinessEntryData(cleanedLiveFormData, liveValidationContext);
  const paidAllRequiredFields = getUniqueFields([
    ...getPaidStepFieldNames(cleanedLiveFormData, 0),
    ...getPaidStepFieldNames(cleanedLiveFormData, 1),
    ...getPaidStepFieldNames(cleanedLiveFormData, 2)
  ]);
  const paidCurrentStepErrors = getStepValidationErrors(currentValidationErrors, cleanedLiveFormData, activeStep, LISTING_MODE.PAID);
  const hasTriggeredCurrentPaidStep = Boolean(stepValidationTriggered[activeStep] || stepValidationTriggered.final);
  const paidCompletedCount = Math.max(0, paidAllRequiredFields.length - getUniqueFields(
    currentValidationErrors
      .filter(error => paidAllRequiredFields.includes(error.field))
      .map(error => error.field)
  ).length);
  const paidCompletionPercent = paidAllRequiredFields.length > 0
    ? Math.round((paidCompletedCount / paidAllRequiredFields.length) * 100)
    : 100;
  useEffect(() => {
  }, [activeStep, listingMode]);
  useEffect(() => {
    if (!sideSuggestion.open) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSideSuggestion(prev => ({
        ...prev,
        open: false
      }));
    }, 6000);

    return () => clearTimeout(timer);
  }, [sideSuggestion.open, sideSuggestion.title, sideSuggestion.body]);
  const selectedKeywordValues = Array.isArray(formData.keywords) ? formData.keywords : [];
  const availableKeywordSuggestions = categoryKeywordSuggestions.filter(keyword => !selectedKeywordValues.some(
    selectedKeyword => String(selectedKeyword).toLowerCase() === String(keyword).toLowerCase()
  ));
  const addKeywordToForm = keyword => {
    const cleanKeyword = normalizeText(keyword);
    if (!cleanKeyword) return;
    if (selectedKeywordValues.some(item => String(item).toLowerCase() === cleanKeyword.toLowerCase())) return;
    const nextData = {
      ...formData,
      keywords: [...selectedKeywordValues, cleanKeyword]
    };
    setFormData(nextData);
    updateLiveValidation(nextData, "keywords");
    setInputKeyword("");
  };
  const addKeywordsToForm = keywords => {
    const nextKeywords = [...selectedKeywordValues];
    (keywords || []).forEach(keyword => {
      const cleanKeyword = normalizeText(keyword);
      if (!cleanKeyword) return;
      if (nextKeywords.some(item => String(item).toLowerCase() === cleanKeyword.toLowerCase())) return;
      nextKeywords.push(cleanKeyword);
    });
    const nextData = {
      ...formData,
      keywords: nextKeywords
    };
    setFormData(nextData);
    updateLiveValidation(nextData, "keywords");
  };
  const removeKeywordFromForm = keyword => {
    const nextData = {
      ...formData,
      keywords: selectedKeywordValues.filter(item => item !== keyword)
    };
    setFormData(nextData);
    updateLiveValidation(nextData, "keywords");
  };
  const handleEdit = row => {
    setEditMode(true);
    setActiveView("form");
    setEditId(row.id);
    setDuplicateBypassSignature("");
    setLocalDraftMeta(null);
    setFieldErrors({});
    setForceBypassedFields([]);
    setWarnLevel(0);
    setWarnDialog(false);
    setDuplicateReview({
      open: false,
      matches: [],
      signature: "",
      action: "save"
    });
    setCategoryKeywordSuggestions([]);
    setInputKeyword("");
    setPostCreatePaidStatus("idle");
    setPostCreateBusinessName(row.businessName || "");
    setStepValidationTriggered({});
    setListingMode(isBusinessPaid(row) ? LISTING_MODE.PAID : LISTING_MODE.FREE);
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
      filters: (row.filters && typeof row.filters === "object") ? row.filters : {},
      badges: {
        isFeatured: row.badges?.isFeatured || false,
        isSponsored: row.badges?.isSponsored || false,
        isTrending: row.badges?.isTrending || false,
        priorityScore: row.badges?.priorityScore || 0,
      },
      verification: {
        isVerified: row.verification?.isVerified || false,
        verificationType: row.verification?.verificationType || "ADMIN",
      },
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
    const catKey = normalizeCategoryKey(cat);
    const catSlug = toCategorySlug(cat);
    const filterSources = [...(searchCategory || []), ...(category || [])];
    const found = filterSources.find(c => {
      const categoryKey = normalizeCategoryKey(c?.category);
      const slugKey = normalizeCategoryKey(c?.slug);
      return categoryKey === catKey || slugKey === catSlug || toCategorySlug(c?.category) === catSlug;
    });

    if (found && Array.isArray(found.filterConfig) && found.filterConfig.length > 0) {
      setCategoryFilterConfig(found.filterConfig);
      return;
    }

    setFilterConfigLoading(true);
    const slug = found?.slug || catSlug;
    axiosInstance.get(`/category/${encodeURIComponent(slug)}/filters`)
      .then(res => setCategoryFilterConfig(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategoryFilterConfig([]))
      .finally(() => setFilterConfigLoading(false));
  }, [formData.category, searchCategory, category]); // eslint-disable-line

  const handleFilterChange = useCallback((key, value) => {
    clearForceBypassForFields(`filters.${key}`);
    setFormData(prev => {
      const nextData = { ...prev, filters: { ...prev.filters, [key]: value } };
      updateLiveValidation(nextData, `filters.${key}`);
      return nextData;
    });
  }, [clearForceBypassForFields]); // eslint-disable-line react-hooks/exhaustive-deps
  const getFilterValue = fc => {
    const value = formData.filters?.[fc.key];
    if (fc.type === "multiselect") {
      if (Array.isArray(value)) return value;
      return value ? [value] : [];
    }
    if (fc.type === "range") {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : fc.min ?? 0;
    }
    return value ?? "";
  };

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
  const showBusinessValidationErrors = (validationErrors, {
    mode = listingMode
  } = {}) => {
    setStepValidationTriggered(prev => ({
      ...prev,
      final: true,
      [getFirstErrorStep(validationErrors)]: true
    }));
    setActiveStep(getFirstErrorStep(validationErrors));
    setFieldErrors(buildFieldErrorMap(validationErrors));
    showSideSuggestion({
      title: mode === LISTING_MODE.PAID ? "Final check found a few missing details" : "Before saving, these details still need attention",
      body: mode === LISTING_MODE.PAID
        ? "We checked the full listing before the final step. Fix these items and try Next again."
        : "You can review these items now, or use the existing bypass flow for non-core fields.",
      items: validationErrors.map(error => error.label),
      tone: mode === LISTING_MODE.PAID ? "warning" : "info"
    });
    const errorMessage = validationErrors.slice(0, 8).map(error => `- ${getValidationMessage(error)}`).join("\n");
    enqueueSnackbar(
      mode === LISTING_MODE.PAID
        ? `Finish these details to continue:\n${errorMessage}${validationErrors.length > 8 ? `\n- ${validationErrors.length - 8} more issue(s)` : ""}`
        : `Please fix these fields before saving:\n${errorMessage}${validationErrors.length > 8 ? `\n- ${validationErrors.length - 8} more issue(s)` : ""}`,
      {
        variant: mode === LISTING_MODE.PAID ? "warning" : "error"
      }
    );
  };
  const markBusinessAsPaidAfterCreate = async (businessId, sourceData) => {
    if (!businessId) {
      return false;
    }

    await dispatch(editBusinessList(businessId, getMarkPaidPayload(sourceData)));
    return true;
  };
  const handleRetryPaidActivation = async () => {
    if (!createdBusinessId) {
      enqueueSnackbar("This business was created, but its record could not be found for paid activation.", {
        variant: "error"
      });
      return;
    }

    try {
      await markBusinessAsPaidAfterCreate(createdBusinessId, formData);
      setPostCreatePaidStatus("paid");
      enqueueSnackbar(`${postCreateBusinessName || formData.businessName || "Business"} marked as paid.`, {
        variant: "success"
      });
      dispatch(getAllBusinessList());
    } catch (error) {
      enqueueSnackbar("Still unable to mark this business as paid. Please try again.", {
        variant: "error"
      });
    }
  };
  const saveBusiness = async ({
    forceBypassFields = [],
    skipDuplicateCheck = false,
    draftFormData = null,
    draftBusinessDetails = null,
    draftKycFiles = null
  } = {}) => {
    const sourceFormData = draftFormData || formData;
    const sourceBusinessDetails = draftBusinessDetails ?? businessvalue;
    const sourceKycFiles = draftKycFiles ?? kycFiles;
    const cleanedFormData = getCleanBusinessFormData(sourceFormData);
    const validationContext = {
      bannerPreview: draftFormData ? sourceFormData.bannerImage : preview,
      uploadedKycFiles: sourceKycFiles,
      isEditing: draftFormData ? false : editMode
    };
    const bypassFields = getUniqueFields(forceBypassFields).filter(isForceBypassableField);
    const duplicateSignature = getDuplicateCheckSignature(cleanedFormData);
    const duplicateMatches = getPotentialDuplicateMatches(cleanedFormData);

    if (!skipDuplicateCheck && duplicateMatches.length > 0 && duplicateBypassSignature !== duplicateSignature) {
      setActiveStep(0);
      setDuplicateReview({
        open: true,
        matches: duplicateMatches,
        signature: duplicateSignature,
        action: "save"
      });
      enqueueSnackbar("A very similar business already exists. Review the matches before saving.", {
        variant: "warning"
      });
      return;
    }

    const allValidationErrors = validateBusinessEntryData(cleanedFormData, validationContext);
    const validationErrors = allValidationErrors.filter(error => {
      if (listingMode === LISTING_MODE.PAID) {
        return true;
      }

      if (FREE_REQUIRED_FIELDS.has(error.field)) {
        return true;
      }

      const bypassed = new Set([...forceBypassedFields, ...bypassFields]);
      return !bypassed.has(error.field);
    });

    if (validationErrors.length > 0) {
      showBusinessValidationErrors(validationErrors, { mode: listingMode });
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
    const kycBase64 = await Promise.all(sourceKycFiles.map(file => new Promise((resolve, reject) => {
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
    const payload = {
      ...cleanedFormData,
      name: cleanedFormData.businessName,
      businessDetails: sourceBusinessDetails,
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
        setPostCreateBusinessName(cleanedFormData.businessName);
        setPostCreatePaidStatus(isBusinessPaid({
          ...response,
          amountPaid: response?.amountPaid,
          paidDate: response?.paidDate,
          payment: response?.payment
        }) ? "paid" : "free");
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
        setPostCreateBusinessName(cleanedFormData.businessName);
        if (listingMode === LISTING_MODE.PAID && businessId) {
          try {
            await markBusinessAsPaidAfterCreate(businessId, {
              ...response,
              ...cleanedFormData,
              businessName: cleanedFormData.businessName,
              category: cleanedFormData.category,
              location: cleanedFormData.location
            });
            setPostCreatePaidStatus("paid");
            enqueueSnackbar(`${cleanedFormData.businessName} marked as paid.`, {
              variant: "success"
            });
          } catch (paymentError) {
            setPostCreatePaidStatus("failed");
            enqueueSnackbar(`${cleanedFormData.businessName} was created, but it could not be marked as paid.`, {
              variant: "error"
            });
          }
        } else {
          setPostCreatePaidStatus(listingMode === LISTING_MODE.FREE ? "free" : "idle");
        }
      }
      // If this business was created from a GMaps lead, mark it as imported
      if (!editMode && leadToImport?._id) {
        dispatch(updateGmapsLeadStatus(leadToImport._id, { imported_to_main: true }));
        dispatch(clearGmapsLeadImport());
      }
      dispatch(getAllBusinessList());
      setDuplicateBypassSignature("");
      clearLocalDraft(false);
      setForceBypassedFields([]);
      setActiveStep(3);
    } catch (err) {
      const backendPayload = err.response?.data;

      // Handle backend validation errors
      if (backendPayload?.errors) {
        const errorMessages = backendPayload.errors.map(e => `${e.field}: ${e.message}`).join('\n');
        enqueueSnackbar(`Validation errors:\n${errorMessages}`, {
          variant: "error"
        });
      } else if (typeof backendPayload === "string" && backendPayload.trim()) {
        enqueueSnackbar(backendPayload, {
          variant: "error"
        });
      } else if (backendPayload?.message) {
        enqueueSnackbar(backendPayload.message, {
          variant: "error"
        });
      } else {
        enqueueSnackbar("Error saving business. Please try again.", {
          variant: "error"
        });
      }
    }
  };
  const updateBadgesOnly = async () => {
    if (!editId) {
      enqueueSnackbar("Please save the business first before updating badges.", {
        variant: "warning"
      });
      return;
    }

    setBadgeUpdateLoading(true);
    try {
      const payload = {
        badges: formData.badges,
        verification: formData.verification
      };

      await dispatch(updateBusinessBadges(editId, payload));
      enqueueSnackbar("Badges updated successfully!", {
        variant: "success"
      });
      dispatch(getAllBusinessList());
    } catch (err) {
      if (err.response?.data?.message) {
        enqueueSnackbar(err.response.data.message, {
          variant: "error"
        });
      } else {
        enqueueSnackbar("Error updating badges. Please try again.", {
          variant: "error"
        });
      }
    } finally {
      setBadgeUpdateLoading(false);
    }
  };
  const handleCreateDemoBusiness = async () => {
    if (editMode || loading || demoSubmitting) {
      return;
    }

    setDemoSubmitting(true);

    const uniqueSuffix = `${Date.now()}`.slice(-6);
    const demoLocation = normalizeText(location?.[0]?.city || location?.[0]?.district || "Chennai");
    const demoCategory = `Demo Services ${uniqueSuffix}`;
    const demoBusinessName = `MassClick Demo Business ${uniqueSuffix}`;
    const demoTitle = `${demoBusinessName} in ${demoLocation}`;
    const demoSeoDescription = `Automated demo listing for ${demoBusinessName} in ${demoLocation}, created to verify the business create flow end to end.`;
    const demoBanner = buildDemoImageAsset(`business-demo-banner-${uniqueSuffix}.svg`, demoBusinessName, `${demoLocation} demo listing`);
    const demoKyc = buildDemoDataUrlAsset(`business-demo-kyc-${uniqueSuffix}.png`, DEMO_PNG_DATA_URL);
    const demoOpeningHours = defaultOpeningHours.map(hour => ({
      ...hour,
      open: "09:00",
      close: "18:00",
      isClosed: false,
      is24Hours: false
    }));
    const demoBusinessDetails = `<p>${demoBusinessName} is an automated sample business created from the admin panel to verify the create, validation, and payment workflow.</p>`;
    const demoFormData = {
      ...createEmptyBusinessFormData(),
      clientId: `DEMO-${uniqueSuffix} - Codex Test`,
      businessName: demoBusinessName,
      plotNumber: "12A",
      street: "Demo Street",
      pincode: "600001",
      globalAddress: `12A Demo Street, ${demoLocation}, Tamil Nadu 600001`,
      email: `demo.business.${uniqueSuffix}@massclick.test`,
      contact: `90001${uniqueSuffix}`,
      contactList: `90002${uniqueSuffix}`,
      gstin: "33ABCDE1234F1Z5",
      whatsappNumber: `90003${uniqueSuffix}`,
      experience: "5",
      location: demoLocation,
      category: demoCategory,
      keywords: ["demo business", "test listing", "massclick automation"],
      slug: `massclick-demo-business-${uniqueSuffix}`,
      seoTitle: `${demoBusinessName} | Demo listing`,
      seoDescription: demoSeoDescription,
      title: demoTitle,
      description: "Auto-generated demo listing used to verify the business onboarding flow.",
      bannerImage: demoBanner.dataUrl,
      googleMap: "https://maps.google.com/?q=13.0827,80.2707",
      website: `https://demo-${uniqueSuffix}.massclick.test`,
      facebook: `https://facebook.com/massclick-demo-${uniqueSuffix}`,
      instagram: `https://instagram.com/massclick_demo_${uniqueSuffix}`,
      youtube: `https://youtube.com/@massclickdemo${uniqueSuffix}`,
      pinterest: `https://pinterest.com/massclickdemo${uniqueSuffix}`,
      twitter: `https://x.com/massclickdemo${uniqueSuffix}`,
      linkedin: `https://linkedin.com/company/massclick-demo-${uniqueSuffix}`,
      businessDetails: demoBusinessDetails,
      openingHours: demoOpeningHours,
      geoLocation: {
        type: "Point",
        coordinates: ["80.2707", "13.0827"]
      },
      filters: {},
      badges: {
        isFeatured: false,
        isSponsored: false,
        isTrending: false,
        priorityScore: 0,
      },
      verification: {
        isVerified: false,
        verificationType: "ADMIN",
      },
    };

    revokePreviewUrls(kycFiles);
    setEditMode(false);
    setEditId(null);
    setDuplicateBypassSignature("");
    setFieldErrors({});
    setForceBypassedFields([]);
    setWarnLevel(0);
    setWarnDialog(false);
    setDuplicateReview({
      open: false,
      matches: [],
      signature: "",
      action: "save"
    });
    setCategoryKeywordSuggestions([]);
    setInputKeyword("");
    setPreview(demoBanner.dataUrl);
    setBusinessValue(demoBusinessDetails);
    setFormData(demoFormData);
    setKycFiles([demoKyc.file]);
    setActiveStep(steps.length - 2);

    try {
      await saveBusiness({
        draftFormData: demoFormData,
        draftBusinessDetails: demoBusinessDetails,
        draftKycFiles: [demoKyc.file],
        skipDuplicateCheck: true
      });
    } finally {
      setDemoSubmitting(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    await saveBusiness();
  };
  const handleDuplicateOverride = async () => {
    const approvedSignature = duplicateReview.signature;
    const reviewAction = duplicateReview.action;
    setDuplicateReview({
      open: false,
      matches: [],
      signature: "",
      action: "save"
    });
    if (reviewAction === "step-lock") {
      return;
    }
    setDuplicateBypassSignature(approvedSignature);
    await saveBusiness({ skipDuplicateCheck: true });
  };
  const warnMessages = [
    null,
    { title: "Warning 1 of 3", body: "Some fields are incomplete. The listing may appear low quality to users.", confirm: "Yes, continue" },
    { title: "Warning 2 of 3", body: "Are you sure? This data will be published as-is to users browsing the directory.", confirm: "Yes, I'm sure" },
    { title: "Final confirmation", body: "You are about to save incomplete business data. Only proceed if you are certain.", confirm: "Save anyway" }
  ];
  const handleWarnConfirm = async () => {
    if (listingMode === LISTING_MODE.PAID) {
      setWarnDialog(false);
      return;
    }
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
    filters: bl.filters && typeof bl.filters === "object" ? bl.filters : {},
    mniDetails: bl.mniDetails || [],
    payment: bl.payment || [],
    createdBy: bl.createdBy,
    qrImage: bl.qrCode?.qrImage || null,
    qrDownloads: bl.qrDownloads || [],
    amountPaid: bl.amountPaid || false,
    paidDate: bl.paidDate || null,
    badges: bl.badges || { isFeatured: false, isSponsored: false, isTrending: false, priorityScore: 0 },
    verification: bl.verification || { isVerified: false, verificationType: "ADMIN" },
  }));

  const filteredRows = getFilteredRows();
  const categoryOptions = toSortedUniqueTextOptions(
    [...category, ...searchCategory].map(c => c?.category)
  );
  const locationOptions = toSortedUniqueTextOptions(
    location.map(l => l?.city || l?.district || l?.location || l?.name)
  );

  const mapBusinessToRow = (bl, index = 0) => ({
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
    filters: bl.filters && typeof bl.filters === "object" ? bl.filters : {},
    mniDetails: bl.mniDetails || [],
    payment: bl.payment || [],
    createdBy: bl.createdBy,
    createdAt: bl.createdAt || null,
    updatedAt: bl.updatedAt || null,
    qrText: bl.qrCode?.qrText || "",
    qrImage: bl.qrCode?.qrImage || null,
    qrDownloads: bl.qrDownloads || [],
    amountPaid: bl.amountPaid || false,
    paidDate: bl.paidDate || null,
    activeBusinesses: bl.activeBusinesses,
    businessesLive: bl.businessesLive,
    isActive: bl.isActive,
    badges: bl.badges || { isFeatured: false, isSponsored: false, isTrending: false, priorityScore: 0 },
    verification: bl.verification || { isVerified: false, verificationType: "ADMIN" },
  });

  const getRowsMatchingAppliedFilters = rowList => rowList.filter(row => {
    const {
      searchTerm: appliedSearchTerm,
      category: appliedCategory,
      location: appliedLocation,
      paymentStatus: appliedPaymentStatus
    } = appliedFilters;

    if (appliedSearchTerm) {
      const matchesSearch = valueMatchesSearch([
        row.clientId,
        row.id,
        row._id,
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
        row.filters,
        row.mniDetails,
        row.openingHours,
        row.website,
        row.googleMap
      ], appliedSearchTerm);
      if (!matchesSearch) return false;
    }

    if (!matchesSelectedValue([row.category, row.mniDetails, row.filters], appliedCategory)) return false;
    if (!matchesSelectedValue([row.location, row.globalAddress, row.street, row.pincode, row.googleMap], appliedLocation)) return false;

    if (appliedPaymentStatus !== "all") {
      const paid = isBusinessPaid(row);
      if (appliedPaymentStatus === "paid" && !paid) return false;
      if (appliedPaymentStatus === "pending" && paid) return false;
    }

    return true;
  });

  const removeInvalidXmlChars = value => Array.from(String(value ?? ""))
    .map(char => {
      const code = char.charCodeAt(0);
      return (code < 32 && code !== 9 && code !== 10 && code !== 13) ? " " : char;
    })
    .join("");

  const xmlEscape = value => removeInvalidXmlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const stripExportHtml = value => String(value ?? "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const cleanExportValue = value => {
    if (value == null || value === "") return "";
    if (Array.isArray(value)) return value.map(cleanExportValue).filter(Boolean).join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return Object.entries(value)
      .filter(([, nestedValue]) => nestedValue != null && nestedValue !== "")
      .map(([key, nestedValue]) => `${key}: ${cleanExportValue(nestedValue)}`)
      .join("; ");
    return stripExportHtml(value);
  };

  const formatExportDate = value => {
    const rawValue = value?.$date || value;
    if (!rawValue) return "";
    const date = new Date(rawValue);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatOpeningHours = hours => {
    if (!Array.isArray(hours) || hours.length === 0) return "";
    return hours.map(hour => {
      if (hour?.isClosed) return `${hour.day}: Closed`;
      if (hour?.is24Hours) return `${hour.day}: 24 Hours`;
      return `${hour?.day || ""}: ${hour?.open || "-"} to ${hour?.close || "-"}`;
    }).join("\n");
  };

  const formatPayments = payments => {
    if (!Array.isArray(payments) || payments.length === 0) return "";
    return payments.map(payment => {
      const amount = payment.totalAmount || payment.amount || "";
      const status = payment.paymentStatus || payment.status || "";
      const paidOn = formatExportDate(payment.paymentDate);
      return [status, amount ? `Rs. ${amount}` : "", paidOn].filter(Boolean).join(" | ");
    }).join("\n");
  };

  const formatMniDetails = details => {
    if (!Array.isArray(details) || details.length === 0) return "";
    return details.map(item => [
      item?.categoryGroup ? `Group: ${item.categoryGroup}` : "",
      item?.categoryGroupLocation ? `Location: ${item.categoryGroupLocation}` : "",
      item?.leadsCount != null ? `Leads: ${item.leadsCount}` : "",
      Array.isArray(item?.leadsCategory) && item.leadsCategory.length ? `Lead Categories: ${item.leadsCategory.join(", ")}` : ""
    ].filter(Boolean).join(" | ")).join("\n");
  };

  const getCoordinate = (row, index) => {
    const value = row.geoLocation?.coordinates?.[index];
    return value == null || value === "" ? "" : value;
  };

  const getExcelColumnName = index => {
    let columnIndex = index + 1;
    let columnName = "";
    while (columnIndex > 0) {
      const remainder = (columnIndex - 1) % 26;
      columnName = String.fromCharCode(65 + remainder) + columnName;
      columnIndex = Math.floor((columnIndex - 1) / 26);
    }
    return columnName;
  };

  const exportColumns = [
    { label: "S.No", width: 7, value: (_, index) => index + 1, style: 4 },
    { label: "Client ID", width: 34, value: row => row.clientId },
    { label: "Business Name", width: 34, value: row => row.businessName },
    { label: "Category", width: 24, value: row => row.category },
    { label: "Location", width: 22, value: row => row.location },
    { label: "Plot No", width: 14, value: row => row.plotNumber },
    { label: "Street", width: 38, value: row => row.street },
    { label: "Pincode", width: 14, value: row => row.pincode },
    { label: "Full Address", width: 46, value: row => row.globalAddress },
    { label: "Contact", width: 17, value: row => row.contact },
    { label: "Contact List", width: 18, value: row => row.contactList },
    { label: "WhatsApp", width: 17, value: row => row.whatsappNumber },
    { label: "Email", width: 28, value: row => row.email },
    { label: "GSTIN", width: 20, value: row => row.gstin },
    { label: "Experience", width: 14, value: row => row.experience },
    { label: "Payment Status", width: 16, value: row => isBusinessPaid(row) ? "Paid" : "Pending" },
    { label: "Paid Date", width: 22, value: row => formatExportDate(row.paidDate) },
    { label: "Payment History", width: 34, value: row => formatPayments(row.payment) },
    { label: "Live", width: 10, value: row => row.businessesLive },
    { label: "Active", width: 10, value: row => row.activeBusinesses },
    { label: "Verified", width: 12, value: row => row.verification?.isVerified },
    { label: "Verification Type", width: 18, value: row => row.verification?.verificationType },
    { label: "Featured", width: 12, value: row => row.badges?.isFeatured },
    { label: "Sponsored", width: 12, value: row => row.badges?.isSponsored },
    { label: "Trending", width: 12, value: row => row.badges?.isTrending },
    { label: "Priority Score", width: 14, value: row => row.badges?.priorityScore, style: 4 },
    { label: "Created By", width: 24, value: row => getCreatedByDisplayName(row.createdBy) },
    { label: "Created At", width: 22, value: row => formatExportDate(row.createdAt) },
    { label: "Updated At", width: 22, value: row => formatExportDate(row.updatedAt) },
    { label: "Opening Hours", width: 42, value: row => formatOpeningHours(row.openingHours) },
    { label: "Keywords", width: 38, value: row => row.keywords },
    { label: "Title", width: 34, value: row => row.title },
    { label: "Description", width: 50, value: row => row.description },
    { label: "SEO Title", width: 38, value: row => row.seoTitle },
    { label: "SEO Description", width: 50, value: row => row.seoDescription },
    { label: "Slug", width: 32, value: row => row.slug },
    { label: "Business Details", width: 54, value: row => row.businessDetails },
    { label: "Website", width: 34, value: row => row.website },
    { label: "Google Map", width: 44, value: row => row.googleMap },
    { label: "Facebook", width: 28, value: row => row.facebook },
    { label: "Instagram", width: 28, value: row => row.instagram },
    { label: "YouTube", width: 28, value: row => row.youtube },
    { label: "Pinterest", width: 28, value: row => row.pinterest },
    { label: "Twitter", width: 28, value: row => row.twitter },
    { label: "LinkedIn", width: 28, value: row => row.linkedin },
    { label: "Longitude", width: 14, value: row => getCoordinate(row, 0), style: 4 },
    { label: "Latitude", width: 14, value: row => getCoordinate(row, 1), style: 4 },
    { label: "Category Group / MNI", width: 42, value: row => formatMniDetails(row.mniDetails) },
    { label: "Category Filters", width: 42, value: row => row.filters },
    { label: "QR Review Link", width: 48, value: row => row.qrText },
    { label: "QR Downloads", width: 16, value: row => row.qrDownloads?.length || 0, style: 4 },
  ];

  const getCrcTable = () => Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    return value >>> 0;
  });

  const crc32 = bytes => {
    const crcTable = getCrcTable();
    let crc = 0xffffffff;
    for (let index = 0; index < bytes.length; index += 1) {
      crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };

  const createZip = files => {
    const encoder = new TextEncoder();
    const parts = [];
    const centralParts = [];
    let offset = 0;

    const pushUint16 = (target, value) => {
      target.push(value & 0xff, (value >>> 8) & 0xff);
    };
    const pushUint32 = (target, value) => {
      target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
    };

    files.forEach(file => {
      const nameBytes = encoder.encode(file.name);
      const dataBytes = encoder.encode(file.content);
      const checksum = crc32(dataBytes);
      const localHeader = [];

      pushUint32(localHeader, 0x04034b50);
      pushUint16(localHeader, 20);
      pushUint16(localHeader, 0);
      pushUint16(localHeader, 0);
      pushUint16(localHeader, 0);
      pushUint16(localHeader, 0);
      pushUint32(localHeader, checksum);
      pushUint32(localHeader, dataBytes.length);
      pushUint32(localHeader, dataBytes.length);
      pushUint16(localHeader, nameBytes.length);
      pushUint16(localHeader, 0);

      parts.push(new Uint8Array(localHeader), nameBytes, dataBytes);

      const centralHeader = [];
      pushUint32(centralHeader, 0x02014b50);
      pushUint16(centralHeader, 20);
      pushUint16(centralHeader, 20);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint32(centralHeader, checksum);
      pushUint32(centralHeader, dataBytes.length);
      pushUint32(centralHeader, dataBytes.length);
      pushUint16(centralHeader, nameBytes.length);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint16(centralHeader, 0);
      pushUint32(centralHeader, 0);
      pushUint32(centralHeader, offset);
      centralParts.push(new Uint8Array(centralHeader), nameBytes);

      offset += localHeader.length + nameBytes.length + dataBytes.length;
    });

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const centralOffset = offset;
    const endRecord = [];
    pushUint32(endRecord, 0x06054b50);
    pushUint16(endRecord, 0);
    pushUint16(endRecord, 0);
    pushUint16(endRecord, files.length);
    pushUint16(endRecord, files.length);
    pushUint32(endRecord, centralSize);
    pushUint32(endRecord, centralOffset);
    pushUint16(endRecord, 0);

    return new Blob([...parts, ...centralParts, new Uint8Array(endRecord)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
  };

  const buildWorkbookBlob = dataRows => {
    const sheetRows = [
      `<row r="1" ht="24" customHeight="1">${exportColumns.map((column, index) => `<c r="${getExcelColumnName(index)}1" s="1" t="inlineStr"><is><t>${xmlEscape(column.label)}</t></is></c>`).join("")}</row>`,
      ...dataRows.map((row, rowIndex) => {
        const excelRow = rowIndex + 2;
        const cells = exportColumns.map((column, colIndex) => {
          const cellRef = `${getExcelColumnName(colIndex)}${excelRow}`;
          const rawValue = column.value(row, rowIndex);
          const value = cleanExportValue(rawValue);
          const style = column.style || 2;
          return `<c r="${cellRef}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
        }).join("");
        return `<row r="${excelRow}" ht="42" customHeight="1">${cells}</row>`;
      })
    ].join("");

    const lastColumn = getExcelColumnName(exportColumns.length - 1);
    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${exportColumns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`).join("")}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="A1:${lastColumn}${Math.max(dataRows.length + 1, 1)}"/>
</worksheet>`;

    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF8C00"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9E2EC"/></left><right style="thin"><color rgb="FFD9E2EC"/></right><top style="thin"><color rgb="FFD9E2EC"/></top><bottom style="thin"><color rgb="FFD9E2EC"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

    return createZip([
      { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
      { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
      { name: "docProps/core.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>MassClick Business Export</dc:title><dc:creator>MassClick Admin</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>` },
      { name: "docProps/app.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>MassClick</Application></Properties>` },
      { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Business Directory" sheetId="1" r:id="rId1"/></sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", content: styles },
      { name: "xl/worksheets/sheet1.xml", content: worksheet },
    ]);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDownloadFilename = (contentDisposition, fallback) => {
    const match = String(contentDisposition || "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match ? decodeURIComponent(match[1].replace(/"/g, "")) : fallback;
  };

  const handleExportBusinessData = async () => {
    if (exportLoading) return;
    try {
      const serverSearch = getServerSearchQuery();
      const { exportedCount = 0 } = await dispatch(exportBusinessList({
        search: serverSearch,
        searchTerm: appliedFilters.searchTerm,
        category: appliedFilters.category,
        location: appliedFilters.location,
        paymentStatus: appliedFilters.paymentStatus,
        sortBy: "createdAt",
        sortOrder: "desc",
      }));

      enqueueSnackbar(
        exportedCount > 0 ? `${exportedCount} businesses exported successfully.` : "Business export downloaded successfully.",
        { variant: "success" }
      );
    } catch (error) {
      enqueueSnackbar(error.message || "Export failed. Please try again.", { variant: "error" });
    }
  };

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
    id: "createdBy",
    label: "Created By",
    renderCell: value => getCreatedByDisplayName(value)
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
  const renderListingModeSelector = () => (
    <div className={cx("listing-mode-shell")}>
      <div>
        <p className={cx("listing-mode-eyebrow")}>Listing type</p>
        <h3 className={cx("listing-mode-title")}>Choose how this business should be onboarded</h3>
        <p className={cx("listing-mode-copy")}>
          Free listings stay flexible. Paid listings guide the team through a polished, fully-complete profile before publishing.
        </p>
      </div>
      <div className={cx("listing-mode-toggle")} role="tablist" aria-label="Listing mode">
        {[{
          value: LISTING_MODE.FREE,
          title: "Free listing",
          description: "Permissive flow with inline field errors and bypass for non-core details."
        }, {
          value: LISTING_MODE.PAID,
          title: "Paid listing",
          description: "Strict completion flow with guided progress and automatic paid activation."
        }].map(option => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={listingMode === option.value}
            className={cx("listing-mode-option", listingMode === option.value && "active")}
            onClick={() => {
              setListingMode(option.value);
              setFieldErrors({});
              setForceBypassedFields([]);
              setWarnDialog(false);
              setWarnLevel(0);
              setPostCreatePaidStatus("idle");
            }}
          >
            <span className={cx("listing-mode-option-title")}>{option.title}</span>
            <span className={cx("listing-mode-option-copy")}>{option.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
  const renderPaidAssistant = () => {
    if (listingMode !== LISTING_MODE.PAID || activeStep >= steps.length - 1) {
      return null;
    }

    return (
      <div className={cx("paid-assistant-panel")}>
        <div className={cx("paid-assistant-header")}>
          <div>
            <p className={cx("paid-assistant-eyebrow")}>Paid listing completion</p>
            <h3 className={cx("paid-assistant-title")}>A polished paid profile is {paidCompletionPercent}% complete</h3>
            <p className={cx("paid-assistant-copy")}>
              {hasTriggeredCurrentPaidStep
                ? paidCurrentStepErrors.length > 0
                  ? "Use Next to keep moving. If something important is missing, we'll show a side suggestion with exactly what to fix."
                  : "This step looks good. Use Next when you're ready for the following section."
                : "Complete this section naturally. We'll only surface detailed suggestions when you press Next or run the final check."}
            </p>
          </div>
          <div className={cx("paid-assistant-meter")}>
            <span>{paidCompletedCount}/{paidAllRequiredFields.length}</span>
            <strong>{paidCompletionPercent}%</strong>
          </div>
        </div>

        <div className={cx("paid-progress-track")} aria-hidden="true">
          <div className={cx("paid-progress-fill")} style={{ width: `${paidCompletionPercent}%` }} />
        </div>

        <div className={cx("paid-step-status-row")}>
          {steps.slice(0, steps.length - 1).map((label, index) => {
            const stepFields = getPaidStepFieldNames(cleanedLiveFormData, index);
            const stepErrors = getStepValidationErrors(currentValidationErrors, cleanedLiveFormData, index, LISTING_MODE.PAID);
            const isComplete = stepFields.length > 0 && stepErrors.length === 0;

            return (
              <div key={label} className={cx("paid-step-pill", activeStep === index && "active", isComplete && "complete")}>
                {isComplete ? <CheckCircleRoundedIcon fontSize="small" /> : <InfoOutlinedIcon fontSize="small" />}
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const renderSideSuggestion = () => {
    if (!sideSuggestion.open) {
      return null;
    }

    return (
      <aside className={cx("side-suggestion-shell", sideSuggestion.tone === "warning" && "side-suggestion-warning")} aria-live="polite">
        <div className={cx("side-suggestion-head")}>
          <div>
            <p className={cx("side-suggestion-eyebrow")}>Next step guide</p>
            <strong>{sideSuggestion.title}</strong>
          </div>
          <button
            type="button"
            className={cx("side-suggestion-dismiss")}
            onClick={() => setSideSuggestion(prev => ({
              ...prev,
              open: false
            }))}
            aria-label="Dismiss step suggestion"
          >
            <CloseRoundedIcon fontSize="small" />
          </button>
        </div>
        {sideSuggestion.body && <p className={cx("side-suggestion-copy")}>{sideSuggestion.body}</p>}
        {sideSuggestion.items.length > 0 && (
          <div className={cx("side-suggestion-items")}>
            {sideSuggestion.items.map(item => (
              <span key={item} className={cx("side-suggestion-chip")}>{item}</span>
            ))}
          </div>
        )}
      </aside>
    );
  };

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
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                syncFilters({ searchTerm: value });
              }}
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
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  syncFilters({ searchTerm: value });
                }}
              />
            </div>

            {/* Category Filter */}
            <div className={cx("advanced-field")}>
              <label className={cx("field-label")}>Category</label>
              <select
                className={cx("search-select")}
                value={selectedCategory}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCategory(value);
                  syncFilters({ category: value }, { refreshDelay: 0 });
                }}
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
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedLocation(value);
                  syncFilters({ location: value }, { refreshDelay: 0 });
                }}
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
                onChange={(e) => {
                  const value = e.target.value;
                  setPaymentStatus(value);
                  syncFilters({ paymentStatus: value }, { refreshDelay: 0 });
                }}
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
          {renderSectionIntro(0, "clientBusiness", "Client & Business Information", "Basic details about your business")}

          <div className={cx("form-input-group")} style={{
            position: "relative"
          }}>
            <label htmlFor="clientId" className={cx("input-label")}>🔍 Client ID</label>

            <input type="text" id="clientId" name="clientId" className={getInputClassName("text-input", "clientId")} value={formData.clientId} placeholder="Type client ID or name..." onChange={e => {
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
            {renderFieldError("clientId")}

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
            <input type="text" id="businessName" name="businessName" className={getInputClassName("text-input", "businessName")} value={formData.businessName} onChange={handleChange} />
            {renderFieldError("businessName")}
          </div>

          {renderSectionAdvanceButton(0, "clientBusiness")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "address", "Address Details", "Business location information")}

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

          <div className={cx("form-input-group")} style={{
            position: "relative"
          }}>
            <label htmlFor="location" className={cx("input-label")}>Location</label>
            <input type="text" id="location" name="location" autoComplete="off" className={getInputClassName("text-input", "location")} value={formData.location} placeholder="Type to search location..." onChange={e => {
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
            {renderFieldError("location")}
          </div>

          <div className={cx("form-input-group")}>
            <label htmlFor="address2" className={cx("input-label")}>Global Address</label>
            <input type="text" id="globalAddress" name="globalAddress" className={getInputClassName("text-input", "globalAddress")} value={formData.globalAddress} onChange={handleChange} />
            {renderFieldError("globalAddress")}
          </div>

          {renderSectionAdvanceButton(0, "address")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "contact", "Contact Information", "How customers can reach you")}

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

          {renderSectionAdvanceButton(0, "contact")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "businessInfo", "Business Information", "Additional business details")}

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

          {renderSectionAdvanceButton(0, "businessInfo")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "locationWeb", "Location & Web Presence", "Map and website links")}

          <div className={cx("form-input-group")}>
            <label htmlFor="googleMap" className={cx("input-label")}>🗺️ Google Map Link</label>
            <input type="text" id="googleMap" name="googleMap" className={getInputClassName("text-input", "googleMap")} value={formData.googleMap} onChange={handleChange} placeholder="https://maps.google.com/..." />
            {renderFieldError("googleMap")}
          </div>

          <div className={cx("form-input-group")}>
            <label htmlFor="geoLatitude" className={cx("input-label")}>Latitude *</label>
            <input type="number" id="geoLatitude" className={getInputClassName("text-input", "geoLatitude")} value={formData.geoLocation?.coordinates?.[1] ?? ""} onChange={e => handleGeoCoordinateChange(1, e.target.value)} placeholder="Example: 13.0827" step="any" min="-90" max="90" required />
            {renderFieldError("geoLatitude")}
          </div>

          <div className={cx("form-input-group")}>
            <label htmlFor="geoLongitude" className={cx("input-label")}>Longitude *</label>
            <input type="number" id="geoLongitude" className={getInputClassName("text-input", "geoLongitude")} value={formData.geoLocation?.coordinates?.[0] ?? ""} onChange={e => handleGeoCoordinateChange(0, e.target.value)} placeholder="Example: 80.2707" step="any" min="-180" max="180" required />
            {renderFieldError("geoLongitude")}
          </div>

          <div className={cx("form-input-group")}>
            <label htmlFor="website" className={cx("input-label")}>🌐 Website</label>
            <input type="text" id="website" name="website" className={getInputClassName("text-input", "website")} value={formData.website} onChange={handleChange} placeholder="https://example.com" />
            {renderFieldError("website")}
          </div>

          {renderSectionAdvanceButton(0, "locationWeb")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "socialMedia", "Social Media", "Connect your social profiles")}

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
                <input type="text" id={field} name={field} className={getInputClassName("text-input", field)} value={formData[field]} onChange={handleChange} placeholder={`Your ${label} profile URL`} />
                {renderFieldError(field)}
              </div>)}
          </div>

          {renderSectionAdvanceButton(0, "socialMedia")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "bannerDetails", "Business Banner & Details", "Upload banner image and describe your business")}

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
            {renderFieldError("bannerImage")}
          </div>

          <div className={cx("form-input-group col-span-all")}>
            <label className={cx("input-label")}>📝 Business Details</label>
            <QuillEditor value={businessvalue} onChange={handleBusinessChange} modules={QUILL_MODULES} formats={QUILL_FORMATS} placeholder="Type business details here..." style={{
              height: "200px"
            }} />
            {renderFieldError("businessDetails")}
          </div>
          {renderSectionAdvanceButton(0, "bannerDetails")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "openingHours", "Opening Hours", "Set business hours for each day")}

          <div className={cx("form-input-group col-span-all")}>
            <div className={cx("opening-hours-container")}>
              {formData.openingHours.map((hour, index) => <div key={hour.day} className={cx("opening-hours-row")} data-closed={hour.isClosed} data-247={hour.is24Hours}>
                <div className={cx("day-label")}>{hour.day}</div>

                <div className={cx("time-group")}>
                  <input type="time" value={hour.is24Hours ? "00:00" : hour.open} onChange={e => handleOpeningHourChange(index, "open", e.target.value)} disabled={hour.isClosed || hour.is24Hours} className={getInputClassName("text-input", `openingHours.${hour.day}`)} placeholder="Open Time" />

                  <input type="time" value={hour.is24Hours ? "23:59" : hour.close} onChange={e => handleOpeningHourChange(index, "close", e.target.value)} disabled={hour.isClosed || hour.is24Hours} className={getInputClassName("text-input", `openingHours.${hour.day}`)} placeholder="Close Time" />
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
            {formData.openingHours.map(hour => getFieldError(`openingHours.${hour.day}`) ? (
              <span key={hour.day} className={cx("error-text")}>{getFieldError(`openingHours.${hour.day}`)}</span>
            ) : null)}
          </div>

          {renderSectionAdvanceButton(0, "openingHours")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(0, "badgesVisibility", "Badges & Visibility", "Control how this listing is highlighted")}

          <div className={cx("form-input-group col-span-all")}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              {[
                { key: "isFeatured", label: "⭐ Featured", color: "#d97706", bg: "#fef3c7" },
                { key: "isSponsored", label: "💎 Sponsored", color: "#7c3aed", bg: "#ede9fe" },
                { key: "isTrending", label: "🔥 Trending", color: "#dc2626", bg: "#fee2e2" },
                { key: "isTrust", label: "🛡️ Trusted", color: "#059669", bg: "#d1fae5" },
              ].map(({ key, label, color, bg }) => {
                const on = !!formData.badges?.[key];
                return (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${on ? color : "#e0e0e0"}`, background: on ? bg : "#fafafa", cursor: "pointer", userSelect: "none", fontWeight: 600, fontSize: "13px", color: on ? color : "#555" }}>
                    <input type="checkbox" checked={on} onChange={e => setFormData(prev => ({ ...prev, badges: { ...prev.badges, [key]: e.target.checked } }))} style={{ accentColor: color }} />
                    {label}
                  </label>
                );
              })}

              <label style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "8px", border: `1.5px solid ${formData.verification?.isVerified ? "#2563eb" : "#e0e0e0"}`, background: formData.verification?.isVerified ? "#dbeafe" : "#fafafa", cursor: "pointer", userSelect: "none", fontWeight: 600, fontSize: "13px", color: formData.verification?.isVerified ? "#2563eb" : "#555" }}>
                <input type="checkbox" checked={!!formData.verification?.isVerified} onChange={e => setFormData(prev => ({ ...prev, verification: { ...prev.verification, isVerified: e.target.checked } }))} style={{ accentColor: "#2563eb" }} />
                ✅ Verified
              </label>
            </div>
          </div>

          <div className={cx("form-input-group")}>
            <label className={cx("input-label")}>Priority Score</label>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
              <input type="number" min="0" max="100" className={cx("text-input")} value={formData.badges?.priorityScore ?? 0} onChange={e => setFormData(prev => ({ ...prev, badges: { ...prev.badges, priorityScore: Number(e.target.value) } }))} placeholder="0–100, higher = boosted in results" style={{ flex: 1 }} />
              {editMode && editId && (
                <Button
                  variant="contained"
                  onClick={updateBadgesOnly}
                  disabled={badgeUpdateLoading}
                  sx={{
                    bgcolor: '#ff8c42',
                    color: '#fff',
                    textTransform: 'none',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#e67a2e' },
                    '&:disabled': { bgcolor: '#cccccc' }
                  }}
                >
                  {badgeUpdateLoading ? <CircularProgress size={20} color="inherit" /> : "Update Badges"}
                </Button>
              )}
            </div>
          </div>
          {renderSectionAdvanceButton(0, "badgesVisibility")}
        </>;
      case 1:
        return <>
          {renderSectionIntro(1, "kycDocuments", "KYC Documents", "Upload identity proof and business documents")}
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
            {renderFieldError("kycDocuments")}
          </div>
          {renderSectionAdvanceButton(1, "kycDocuments")}
        </>;
      case 2:
        return <>
          {renderSectionIntro(2, "categorySeo", "Category & SEO", "Categorize your business and optimize for search")}

          <div className={cx("form-input-group")} style={{
            position: "relative"
          }}>
            <label className={cx("input-label")}>🏷️ Category</label>

            <input type="text" className={getInputClassName("text-input", "category")} placeholder="Search category..." value={formData.category} onChange={e => {
              const value = e.target.value;
              const nextData = {
                ...formData,
                category: value,
                keywords: []
              };
              setFormData(nextData);
              setCategoryKeywordSuggestions([]);
              updateLiveValidation(nextData, ["category", "keywords"]);
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
                  keywords: [],
                  slug: cat.slug || "",
                  seoTitle: cat.seoTitle || "",
                  seoDescription: cat.seoDescription || "",
                  title: cat.title || "",
                  description: cat.description || ""
                };
                setCategoryKeywordSuggestions(Array.isArray(cat.keywords) ? cat.keywords : []);
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
            {renderFieldError("category")}
          </div>

          {renderSectionAdvanceButton(2, "categorySeo")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(2, "keywordsTags", "Keywords & Tags", "Help customers find you with relevant keywords")}

          <div className={cx("category-form-input-group")} style={{
            marginTop: "0px"
          }}>
            <label className={cx("category-input-label")}>🔑 Keywords</label>

            <div className={cx("keyword-bulk-box")}>
              {categoryKeywordSuggestions.length > 0 && (
                <div className={cx("keyword-suggestion-panel")}>
                  <div className={cx("keyword-panel-header")}>
                    <span>Category keyword suggestions</span>
                    <button
                      type="button"
                      onClick={() => addKeywordsToForm(availableKeywordSuggestions)}
                      disabled={availableKeywordSuggestions.length === 0}
                    >
                      Add all
                    </button>
                  </div>
                  <div className={cx("keyword-chip-grid")}>
                    {availableKeywordSuggestions.length > 0 ? availableKeywordSuggestions.map(keyword => (
                      <button
                        type="button"
                        className={cx("keyword-suggestion-chip")}
                        key={keyword}
                        onClick={() => addKeywordToForm(keyword)}
                      >
                        + {keyword}
                      </button>
                    )) : (
                      <span className={cx("keyword-empty-note")}>All suggestions are selected.</span>
                    )}
                  </div>
                </div>
              )}

              <div className={cx("selected-keywords-panel")}>
                <div className={cx("keyword-panel-header")}>
                  <span>Selected keywords</span>
                  <small>{selectedKeywordValues.length} selected</small>
                </div>
                <div className={cx("keyword-chip-grid")}>
                  {selectedKeywordValues.length > 0 ? selectedKeywordValues.map(keyword => (
                    <button
                      type="button"
                      className={cx("selected-keyword-chip")}
                      key={keyword}
                      onClick={() => removeKeywordFromForm(keyword)}
                      title={`Remove ${keyword}`}
                    >
                      <span>{keyword}</span>
                      <span aria-hidden="true">x</span>
                    </button>
                  )) : (
                    <span className={cx("keyword-empty-note")}>No keywords selected yet.</span>
                  )}
                </div>
              </div>

              <div className={cx("keyword-entry-row")}>
                <input
                  type="text"
                  value={inputKeyword}
                  onChange={e => setInputKeyword(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeywordToForm(inputKeyword);
                    }
                  }}
                  placeholder="Type a custom keyword"
                />
                <button type="button" onClick={() => addKeywordToForm(inputKeyword)} aria-label="Add keyword">
                  <AddCircleOutlineIcon />
                  Add
                </button>
              </div>
            </div>
            {renderFieldError("keywords")}
          </div>

          {renderSectionAdvanceButton(2, "keywordsTags")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(2, "displaySeo", "Display & SEO", "How your business appears online")}

          <div className={cx("form-input-group")}>
            <label className={cx("input-label")}>👁️ Display Title</label>
            <input type="text" name="title" className={getInputClassName("text-input", "title")} value={formData.title} onChange={handleChange} placeholder="How your business appears to customers" />
            {renderFieldError("title")}
          </div>

          <div className={cx("form-input-group col-span-all")}>
            <label className={cx("input-label")}>📖 Display Description</label>
            <textarea name="description" className={getInputClassName("textarea-input", "description")} value={formData.description} rows={3} onChange={handleChange} placeholder="A brief description of your business" />
            {renderFieldError("description")}
          </div>

          {renderSectionAdvanceButton(2, "displaySeo")}
          <div className={cx("form-divider")}></div>
          {renderSectionIntro(2, "searchSeo", "Search Engine Optimization", "Improve your search visibility")}

          <div className={cx("form-input-group col-span-all")}>
            <label className={cx("input-label")}>🔍 SEO Title</label>
            <input type="text" name="seoTitle" className={getInputClassName("text-input", "seoTitle")} value={formData.seoTitle} onChange={handleChange} placeholder="Meta title for search engines (50-60 characters)" />
            {renderFieldError("seoTitle")}
          </div>

          <div className={cx("form-input-group col-span-all")}>
            <label className={cx("input-label")}>📝 SEO Description</label>
            <textarea name="seoDescription" className={getInputClassName("textarea-input", "seoDescription")} value={formData.seoDescription} rows={2} onChange={handleChange} placeholder="Meta description for search engines (150-160 characters)" />
            {renderFieldError("seoDescription")}
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
                      value={getFilterValue(fc)}
                      onChange={(_, val) => handleFilterChange(fc.key, val)}
                      renderTags={(value, getTagProps) => value.map((opt, i) =>
                        <Chip key={i} label={opt} size="small" {...getTagProps({ index: i })}
                          sx={{ bgcolor: "#ff8c00", color: "#fff", "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.7)" } }} />)}
                      renderInput={params => <TextField {...params} variant="outlined" size="small" placeholder={`Select ${fc.label}`} />}
                    />
                  )}

                  {fc.type === "radio" && (
                    <select className={getInputClassName("select-input", `filters.${fc.key}`)} value={getFilterValue(fc)}
                      onChange={e => handleFilterChange(fc.key, e.target.value || null)}>
                      <option value="">-- Select {fc.label} --</option>
                      {(fc.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}

                  {fc.type === "toggle" && (
                    <FormControlLabel
                      control={
                        <Checkbox checked={Boolean(getFilterValue(fc))}
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
                      <Slider
                        value={getFilterValue(fc)}
                        min={fc.min ?? 0}
                        max={fc.max ?? 100}
                        step={Math.ceil(((fc.max ?? 100) - (fc.min ?? 0)) / 20)}
                        valueLabelDisplay="auto"
                        valueLabelFormat={v => `${v}${fc.unit || ""}`}
                        onChange={(_, val) => handleFilterChange(fc.key, val)}
                        sx={{ color: "#ff8c00" }}
                      />
                    </Box>
                  )}
                  {renderFieldError(`filters.${fc.key}`)}
                </div>
              ))}
            </>
          )}
          <div className={cx("form-input-group col-span-all")}>
            <label className={cx("input-label")}>📍 Slug (URL-friendly name)</label>
            <input type="text" name="slug" className={getInputClassName("text-input", "slug")} value={formData.slug} onChange={handleChange} placeholder="business-name-here" />
            {renderFieldError("slug")}
          </div>
          {renderSectionAdvanceButton(2, "searchSeo")}
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
                {editMode
                  ? `${postCreateBusinessName || formData.businessName || "This business"} was updated successfully`
                  : listingMode === LISTING_MODE.PAID
                  ? postCreatePaidStatus === "paid"
                    ? `${postCreateBusinessName || "This business"} is now live as a paid listing`
                    : postCreatePaidStatus === "failed"
                      ? `${postCreateBusinessName || "This business"} was created, but paid activation still needs attention`
                      : "List Your Business on MassClick"
                  : `${postCreateBusinessName || "Your business"} was created successfully`}
              </Typography>

              <Typography sx={{
                fontWeight: 700,
                fontSize: {
                  xs: "1.2rem",
                  sm: "1.4rem"
                },
                mb: 3
              }}>
                {editMode
                  ? "Changes saved"
                  : listingMode === LISTING_MODE.PAID
                  ? postCreatePaidStatus === "paid"
                    ? "Paid activation completed"
                    : postCreatePaidStatus === "failed"
                      ? "Created successfully, but not marked as paid"
                      : "Just Rs. 99/- + GST"
                  : "Free listing draft saved"}
              </Typography>

              {!editMode && listingMode === LISTING_MODE.PAID && postCreatePaidStatus === "failed" ? (
                <Button variant="contained" onClick={handleRetryPaidActivation} sx={{
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
                  Mark as Paid Now
                </Button>
              ) : !editMode && listingMode === LISTING_MODE.PAID && postCreatePaidStatus !== "paid" ? (
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
              ) : (
                <Button variant="contained" onClick={() => navigate("/dashboard/business")} sx={{
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
                  View Directory
                </Button>
              )}

            </Box>
          </Box>
        </>;
      default:
        return null;
    }
  };
  const bypassableFieldErrorCount = Object.keys(fieldErrors).filter(isForceBypassableField).length;
  const currentDuplicateSignature = getDuplicateCheckSignature(getCleanBusinessFormData(formData));
  return <div className={cx("business-page")}>
    {renderSideSuggestion()}
    <AdminViewTabs activeView={activeView} onChange={handleAdminViewChange} isEditing={editMode} createLabel="Business" listLabel="Directory" listCount={filteredRows.length} />

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 className={cx("card-title")} style={{ margin: 0 }}>
            {editMode ? `Edit Business (${steps[activeStep]})` : `Add New Business (${steps[activeStep]})`}
          </h2>
          {!editMode && (
            <div className={cx("draft-actions-bar")}>
              <button type="button" className={cx("draft-action-button")} onClick={saveDraftToLocal}>
                Save Draft
              </button>
              <button type="button" className={cx("draft-action-button secondary")} onClick={restoreDraftFromLocal}>
                Restore Draft
              </button>
              {localDraftMeta && (
                <button type="button" className={cx("draft-action-button ghost")} onClick={() => clearLocalDraft(true)}>
                  Clear Draft
                </button>
              )}
              {/* {!editMode && ( */}
                {/* // <button */}
                {/* //   type="button" */}
                {/* //   className={cx("draft-action-button secondary")} */}
                {/* //   onClick={handleCreateDemoBusiness} */}
                {/* //   disabled={loading || demoSubmitting} */}
                {/* // > */}
                {/* //   {demoSubmitting ? "Creating Demo..." : "Create Demo"} */}
                {/* // </button> */}
              {/* // )} */}
              {activeStep === 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<TravelExploreIcon />}
                  onClick={openGmapsPicker}
                  sx={{
                    borderColor: '#ff8c42',
                    color: '#ff8c42',
                    fontSize: '0.8rem',
                    textTransform: 'none',
                    '&:hover': { borderColor: '#e67a2e', bgcolor: '#fff5ee' }
                  }}
                >
                  Fill from GMaps
                </Button>
              )}
            </div>
          )}
        </div>
        {!editMode && renderListingModeSelector()}
        {renderPaidAssistant()}
        {!editMode && (
          <div className={cx("draft-meta-row")}>
            <span>
              Draft is stored only in this browser on this machine.
            </span>
            <span>
              {localDraftMeta?.savedAt
                ? `Last saved: ${new Date(localDraftMeta.savedAt).toLocaleString()}`
                : "No local draft saved yet."}
            </span>
            <span>KYC file uploads are not included in local draft restore.</span>
          </div>
        )}

        <form ref={businessFormRef} onSubmit={handleSubmit}>
          {activeStep === 0 && possibleDuplicateMatches.length > 0 && (
            <div className={cx("duplicate-warning-panel", listingMode === LISTING_MODE.PAID && "paid-mode-duplicate-panel")}>
              <div className={cx("duplicate-warning-header")}>
                <strong>This business probably already exists.</strong>
                <span className={cx("duplicate-lock-note")}>
                  Restriction: Step 2 is locked until this is reviewed.
                </span>
              </div>
              <p className={cx("duplicate-warning-copy")}>
                We found {possibleDuplicateMatches.length} active business{possibleDuplicateMatches.length === 1 ? "" : "es"} with matching name, location, address, phone, or map details. Do not continue to the next step until you confirm this is not a duplicate.
              </p>
              <div className={cx("duplicate-match-list")}>
                {possibleDuplicateMatches.slice(0, 3).map(match => (
                  <div key={match.id} className={cx("duplicate-match-card")}>
                    <div className={cx("duplicate-match-name-row")}>
                      <span className={cx("duplicate-match-name")}>{match.businessName}</span>
                      <span className={cx("duplicate-match-score")}>{Math.round(match.score * 10) / 10} pts</span>
                    </div>
                    <p className={cx("duplicate-match-meta")}>
                      {match.location} • {match.category} • {match.contact}
                    </p>
                    <p className={cx("duplicate-match-meta")}>{match.globalAddress}</p>
                    <div className={cx("duplicate-reason-list")}>
                      {match.reasons.map(reason => (
                        <span key={`${match.id}-${reason}`} className={cx("duplicate-reason-chip")}>{reason}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className={cx("duplicate-warning-actions")}>
                <button
                  type="button"
                  className={cx("duplicate-review-button")}
                  onClick={() => setDuplicateReview({
                    open: true,
                    matches: possibleDuplicateMatches,
                    signature: currentDuplicateSignature,
                    action: "step-lock"
                  })}
                >
                  Review Restriction
                </button>
              </div>
            </div>
          )}
          {listingMode === LISTING_MODE.FREE && Object.keys(fieldErrors).length > 0 && (
            <div className={cx("validation-panel", "free-mode-validation-panel")}>
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
              justifyContent: "flex-start"
            }}>
              <button type="button" className={cx("step-nav-button", "secondary")} onClick={handleBack}>
                <SkipPreviousIcon />
                Back
              </button>
            </div>}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" className={cx("table-count")}>
              {filteredRows.length} shown of {total || rows.length} businesses
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={exportLoading ? <CircularProgress size={16} color="inherit" /> : <FileDownloadOutlinedIcon />}
              onClick={handleExportBusinessData}
              disabled={exportLoading}
              sx={{
                borderColor: '#16a34a',
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'none',
                bgcolor: '#f0fdf4',
                '&:hover': { borderColor: '#15803d', bgcolor: '#dcfce7' },
                '&.Mui-disabled': { borderColor: '#bbf7d0', color: '#86efac' }
              }}
            >
              {exportLoading ? "Exporting..." : "Export XLSX"}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<TravelExploreIcon />}
              onClick={() => navigate('/dashboard/gmaps-leads')}
              sx={{
                bgcolor: '#ff8c42',
                color: '#fff',
                fontSize: '0.8rem',
                textTransform: 'none',
                boxShadow: 'none',
                '&:hover': { bgcolor: '#e67a2e', boxShadow: 'none' }
              }}
            >
              GMaps Leads
            </Button>
          </Box>
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

    <Dialog
      open={duplicateReview.open}
      onClose={() => setDuplicateReview({
        open: false,
        matches: [],
        signature: "",
        action: "save"
      })}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ color: "#B42318", fontWeight: 800 }}>
        {duplicateReview.action === "step-lock" ? "Restriction: Similar Business Found in Step 1" : "Restriction: Similar Business Already Exists"}
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2, color: "#7A271A" }}>
          {duplicateReview.action === "step-lock"
            ? "MassClick found businesses that are too similar to this Step 1 entry. The form will stay on Step 1 until you change the details or keep a local draft for later."
            : "MassClick found existing businesses that look too similar to this entry. Please verify them before creating a new business, otherwise you may create a duplicate listing."}
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {duplicateReview.matches.map(match => (
            <Box
              key={match.id}
              sx={{
                border: "1px solid #FECACA",
                borderRadius: 2,
                background: "#FFF7F7",
                p: 2
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 800, color: "#111827" }}>{match.businessName}</Typography>
                <Typography sx={{ fontWeight: 700, color: "#B42318" }}>Match score: {Math.round(match.score * 10) / 10}</Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.75, color: "#475467" }}>
                {match.location} • {match.category} • {match.contact}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "#475467" }}>
                {match.globalAddress}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
                {match.reasons.map(reason => (
                  <Chip
                    key={`${match.id}-${reason}`}
                    label={reason}
                    size="small"
                    sx={{
                      backgroundColor: "#FEE4E2",
                      color: "#B42318",
                      fontWeight: 700
                    }}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDuplicateReview({
          open: false,
          matches: [],
          signature: "",
          action: "save"
        })} color="secondary">
          {duplicateReview.action === "step-lock" ? "Stay on Step 1" : "Go Back"}
        </Button>
        {duplicateReview.action === "step-lock" ? (
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              saveDraftToLocal();
              setDuplicateReview({
                open: false,
                matches: [],
                signature: "",
                action: "save"
              });
            }}
          >
            Save Draft Locally
          </Button>
        ) : (
          <Button color="error" variant="contained" onClick={handleDuplicateOverride} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : "Create Anyway"}
          </Button>
        )}
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

    {/* ════════════════════════════════════════
          GMaps Leads Picker Dialog
      ════════════════════════════════════════ */}
    <Dialog
      open={gmapsPickerOpen}
      onClose={() => setGmapsPickerOpen(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '85vh', display: 'flex', flexDirection: 'column' } }}
    >
      <DialogTitle sx={{ pb: 1.5, borderBottom: '1px solid #f0f0f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#fff5ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TravelExploreIcon sx={{ color: '#ff8c42', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Pick from GMaps Leads</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#aaa', lineHeight: 1.2 }}>Select a lead to auto-fill the business form</Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      {/* Filter bar */}
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #efefef', bgcolor: '#fafafa' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>

          {/* Search input */}
          <input
            type="text"
            placeholder="🔍  Search by name…"
            value={pickerFilters.search}
            onChange={e => setPickerFilters(prev => ({ ...prev, search: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { setPickerPage(1); fetchPickerLeads(1, pickerFilters); } }}
            style={{ height: 36, border: '1.5px solid #e2e2e2', borderRadius: 8, padding: '0 12px', fontSize: '0.87rem', color: '#333', background: '#fff', outline: 'none', minWidth: 200, flex: 1 }}
            onFocus={e => e.target.style.borderColor = '#ff8c42'}
            onBlur={e => e.target.style.borderColor = '#e2e2e2'}
          />

          {/* Location */}
          <select
            value={pickerFilters.massclick_location}
            onChange={e => setPickerFilters(prev => ({ ...prev, massclick_location: e.target.value }))}
            style={{ height: 36, border: '1.5px solid #e2e2e2', borderRadius: 8, padding: '0 10px', fontSize: '0.87rem', color: '#333', background: '#fff', outline: 'none', minWidth: 148, cursor: 'pointer' }}
          >
            <option value="">All Locations</option>
            {pickerLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>

          {/* Rating */}
          <select
            value={pickerFilters.min_rating}
            onChange={e => setPickerFilters(prev => ({ ...prev, min_rating: e.target.value }))}
            style={{ height: 36, border: '1.5px solid #e2e2e2', borderRadius: 8, padding: '0 10px', fontSize: '0.87rem', color: '#333', background: '#fff', outline: 'none', minWidth: 110, cursor: 'pointer' }}
          >
            <option value="">Any Rating</option>
            <option value="3">3★ and up</option>
            <option value="4">4★ and up</option>
            <option value="4.5">4.5★ and up</option>
          </select>

          {/* Status */}
          <select
            value={pickerFilters.status}
            onChange={e => setPickerFilters(prev => ({ ...prev, status: e.target.value }))}
            style={{ height: 36, border: '1.5px solid #e2e2e2', borderRadius: 8, padding: '0 10px', fontSize: '0.87rem', color: '#333', background: '#fff', outline: 'none', minWidth: 120, cursor: 'pointer' }}
          >
            <option value="all">All Status</option>
            <option value="available">🟢 Available</option>
            <option value="imported">🔵 Imported</option>
            <option value="skipped">⚫ Skipped</option>
          </select>

          {/* Has Phone toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 12px', border: `1.5px solid ${pickerFilters.has_phone ? '#ff8c42' : '#e2e2e2'}`, borderRadius: 8, background: pickerFilters.has_phone ? '#fff5ee' : '#fff', cursor: 'pointer', userSelect: 'none', fontSize: '0.86rem', color: pickerFilters.has_phone ? '#e67a2e' : '#555', transition: 'all 0.18s', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={pickerFilters.has_phone}
              onChange={e => setPickerFilters(prev => ({ ...prev, has_phone: e.target.checked }))}
              style={{ accentColor: '#ff8c42', width: 15, height: 15, cursor: 'pointer' }}
            />
            📞 Has Phone
          </label>

          {/* Search button */}
          <button
            onClick={() => { setPickerPage(1); fetchPickerLeads(1, pickerFilters); }}
            disabled={pickerLoading}
            style={{ height: 36, background: pickerLoading ? '#f0b07a' : '#ff8c42', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', fontSize: '0.87rem', fontWeight: 600, cursor: pickerLoading ? 'not-allowed' : 'pointer', transition: 'background 0.18s', whiteSpace: 'nowrap' }}
          >
            {pickerLoading ? 'Loading…' : 'Search'}
          </button>

        </Box>
      </Box>

      {/* Results table */}
      <DialogContent sx={{ p: 0, overflow: 'auto', flex: 1 }}>
        {pickerLoading ? (
          <Box sx={{ p: 4, textAlign: 'center', color: '#aaa' }}>
            <CircularProgress size={28} sx={{ color: '#ff8c42' }} />
            <Typography sx={{ mt: 1.5, fontSize: '0.9rem' }}>Loading leads…</Typography>
          </Box>
        ) : pickerLeads.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: '#ccc', fontSize: '0.95rem' }}>
            No results. Try adjusting filters.
          </Box>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                {['Name', 'Location', 'Query', 'Rating', 'Phone', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #f0f0f0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pickerLeads.map(lead => {
                const isImported = lead.imported_to_main;
                const isSkipped = lead.skip_import;
                const hasMatch = lead.hasMatch;
                const statusLabel = isImported ? '🔵 Imported' : isSkipped ? '⚫ Skipped' : hasMatch ? '🟡 Has Match' : '🟢 Available';
                return (
                  <tr key={lead._id} style={{ borderBottom: '1px solid #f7f7f7', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fdf5ef'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.87rem', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                      {lead.formatted_address && <div style={{ fontSize: '0.75rem', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.formatted_address}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{lead.massclick_location || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.83rem', color: '#555' }}>{lead.search_query || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.83rem', whiteSpace: 'nowrap' }}>
                      {lead.rating != null ? <><span style={{ color: '#f5a623' }}>★</span> {lead.rating}</> : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.83rem', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {lead.phone || <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.78rem' }}>{statusLabel}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => applyGmapsLead(lead)}
                        sx={{ bgcolor: '#ff8c42', '&:hover': { bgcolor: '#e67a2e' }, textTransform: 'none', boxShadow: 'none', fontSize: '0.78rem', py: 0.5 }}
                      >
                        Use
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DialogContent>

      {/* Pagination + footer */}
      <DialogActions sx={{ px: 3, py: 1.5, borderTop: '1px solid #f0f0f0', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: '#888' }}>
          {pickerTotal.toLocaleString()} results
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button size="small" disabled={pickerPage <= 1} onClick={() => { const p = pickerPage - 1; setPickerPage(p); fetchPickerLeads(p, pickerFilters); }} sx={{ textTransform: 'none', color: '#555' }}>← Prev</Button>
          <Typography variant="body2" sx={{ px: 1 }}>Page {pickerPage} of {Math.ceil(pickerTotal / 15) || 1}</Typography>
          <Button size="small" disabled={pickerPage >= Math.ceil(pickerTotal / 15)} onClick={() => { const p = pickerPage + 1; setPickerPage(p); fetchPickerLeads(p, pickerFilters); }} sx={{ textTransform: 'none', color: '#555' }}>Next →</Button>
          <Button size="small" onClick={() => { navigate('/dashboard/gmaps-leads'); setGmapsPickerOpen(false); }} startIcon={<TravelExploreIcon />} sx={{ ml: 2, textTransform: 'none', color: '#ff8c42' }}>
            Full Page
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  </div>;
});
export default BusinessList;
