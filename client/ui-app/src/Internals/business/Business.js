import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../services/axiosInstance.js";
import { useDispatch, useSelector } from "react-redux";
import InputValidator from "../validators/inputValidator.js";
import { getAllBusinessList, createBusinessList, editBusinessList, editBusinessSection, deleteBusinessList, trackQrDownload, updateBusinessBadges, regenerateBusinessCertificates, exportBusinessList, revertPaidStatus } from "../../redux/actions/businessListAction";
import { getAllLocation, createLocation } from "../../redux/actions/locationAction";
import { getAllCategory, businessCategorySearch } from "../../redux/actions/categoryAction";
import { getAllUsersClient, getUserClientSuggestion } from "../../redux/actions/userClientAction.js";
import { getAllUsers } from "../../redux/actions/userAction.js";
import SkipNextIcon from '@mui/icons-material/SkipNext';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import {
  Box, Button, Typography, CircularProgress, IconButton, Avatar, Dialog, DialogTitle, DialogContent, DialogActions,
  Drawer, Divider, Chip
} from "@mui/material";
import { useSnackbar } from 'notistack';
import PropTypes from 'prop-types';
import { styled } from '@mui/material/styles';
import StepConnector, { stepConnectorClasses } from '@mui/material/StepConnector';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import { checkPhonePeStatus, createPhonePePayment } from "../../redux/actions/phonePayAction.js";
import { updateGmapsLeadStatus, clearGmapsLeadImport, setGmapsLeadToImport } from "../../redux/actions/gmapsLeadsAction";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import Tooltip from "@mui/material/Tooltip";
import styles from "./business.module.css";
import GooglePlacesInput from "../../components/GooglePlacesInput/GooglePlacesInput";
import AdminViewTabs from "../../components/AdminViewTabs.js";
import BusinessFormStep0 from "./components/BusinessFormStep0";
import BusinessFormStep1 from "./components/BusinessFormStep1";
import BusinessFormStep2 from "./components/BusinessFormStep2";
import BusinessSidebar from "./components/BusinessSidebar";
import LogoCropperModal from "./components/LogoCropperModal";
import { downloadBusinessDetailsTemplate } from "./businessDetailsTemplate";
import "quill/dist/quill.snow.css";
const cx = createScopedClassNames(styles);
const LISTING_MODE = {
  FREE: "free",
  PAID: "paid"
};
const PREMIUM_MEMBERSHIP_BASE_AMOUNT = 24000;
const SECTION_TO_STEP = {
  clientBusiness: 0, address: 0, contact: 0, businessInfo: 0, locationWeb: 0,
  socialMedia: 0, bannerDetails: 0, openingHours: 0, badgesVisibility: 0,
  paymentDetails: 0,
  kycDocuments: 1,
  categorySeo: 2, keywordsTags: 2, displaySeo: 2, searchSeo: 2, preview: 2
};
const SECTION_ALL_FIELDS = {
  clientBusiness: ["clientId", "businessName"],
  address: ["plotNumber", "street", "pincode", "location", "globalAddress"],
  contact: ["email", "contact", "contactList", "whatsappNumber"],
  businessInfo: ["gstin", "experience"],
  locationWeb: ["googleMap", "geoLatitude", "geoLongitude", "website"],
  socialMedia: ["facebook", "instagram", "youtube", "pinterest", "twitter", "linkedin"],
  bannerDetails: ["bannerImage", "businessDetails"],
  paymentDetails: [
    "paymentConcept.baseAmount",
    "paymentConcept.gstAmount",
    "paymentConcept.totalAmount",
    "paymentConcept.advancePaid",
    "paymentConcept.pendingAmount"
  ],
  categorySeo: ["category", "keywords"],
  displaySeo: ["title", "description"],
  searchSeo: ["seoTitle", "seoDescription", "slug"],
};
const FORCE_BYPASS_BLOCKED_FIELDS = new Set(["businessName", "category", "location", "contact"]);
const FREE_REQUIRED_FIELDS = new Set(["businessName", "category", "location", "contact"]);
const BUSINESS_LOCAL_DRAFT_KEY = "massclick.business.createDraft";
const DEMO_PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s0qDbgAAAAASUVORK5CYII=";
const ORANGE_PRIMARY = '#FF8C00';
const ORANGE_HOVER = '#D97800';
const BUSINESS_PAYMENT_GST_RATE = 18;
const PAYMENT_METHOD_OPTIONS = [
  { value: "not_selected", label: "Not selected" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "phonepe", label: "PhonePe" },
  { value: "other", label: "Other" },
];
const DEFAULT_PAYMENT_CONCEPT = {
  baseAmount: PREMIUM_MEMBERSHIP_BASE_AMOUNT,
  gstRate: BUSINESS_PAYMENT_GST_RATE,
  gstAmount: 4320,
  totalAmount: 28320,
  advancePaid: 0,
  pendingAmount: 28320,
  paymentStatus: "unpaid",
  paymentMethod: "not_selected",
  paymentReference: "",
  paymentDueDate: "",
  notes: "",
};
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

const toNumberAmount = value => Math.max(Number(value || 0), 0);

const derivePaymentStatus = (advancePaid, totalAmount) => {
  if (advancePaid <= 0) return "unpaid";
  if (totalAmount > 0 && advancePaid >= totalAmount) return "paid";
  return "part_paid";
};

const normalizePaymentConcept = (source = {}) => {
  const baseAmount = toNumberAmount(source.baseAmount ?? source.totalAmount ?? DEFAULT_PAYMENT_CONCEPT.baseAmount);
  const gstRate = BUSINESS_PAYMENT_GST_RATE;
  const gstAmount = Number(((baseAmount * gstRate) / 100).toFixed(2));
  const totalAmount = Number((baseAmount + gstAmount).toFixed(2));
  const advancePaid = Math.min(toNumberAmount(source.advancePaid), totalAmount);
  const pendingAmount = Math.max(totalAmount - advancePaid, 0);
  return {
    ...DEFAULT_PAYMENT_CONCEPT,
    ...source,
    baseAmount,
    gstRate,
    gstAmount,
    totalAmount,
    advancePaid,
    pendingAmount,
    paymentStatus: derivePaymentStatus(advancePaid, totalAmount),
    paymentMethod: source.paymentMethod || DEFAULT_PAYMENT_CONCEPT.paymentMethod,
    paymentReference: String(source.paymentReference || ""),
    paymentDueDate: source.paymentDueDate ? String(source.paymentDueDate).slice(0, 10) : "",
    notes: String(source.notes || ""),
  };
};

const normalizeQuillHtml = value =>
  value === "<p><br></p>" ? "" : value || "";

const getBusinessDocumentUrl = (document) => {
  if (!document) return "";
  if (typeof document === "string") return document;
  return document.url || document.preview || document.href || document.documentUrl || document.fileUrl || "";
};

const getBusinessDocumentName = (document, index) => {
  if (document && typeof document === "object") {
    const explicitName = document.name || document.fileName || document.originalName || document.title;
    if (explicitName) return explicitName;
  }

  const url = getBusinessDocumentUrl(document);
  const urlName = url.split("?")[0].split("/").filter(Boolean).pop();
  if (urlName) {
    try {
      return decodeURIComponent(urlName);
    } catch {
      return urlName;
    }
  }

  return `Document ${index + 1}`;
};

const isPreviewableBusinessDocumentImage = (url = "") =>
  /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif|bmp|avif|svg)(?:\?|$)/i.test(url);

const isBusinessPdfDocument = (url = "") =>
  /^data:application\/pdf/i.test(url) || /\.pdf(?:\?|$)/i.test(url);

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
const steps = ["Business Details", "Category", "Privacy Settings"];
const SEARCH_REFRESH_DELAY = 350;
const PAID_STEP_FIELD_MAP = {
  0: [
    "businessName",
    "plotNumber",
    "street",
    "pincode",
    "location",
    "email",
    "contact",
    "contactList",
    "gstin",
    "experience",
    "googleMap",
    "geoLatitude",
    "geoLongitude",
    "bannerImage",
    "businessDetails"
  ],
  1: ["kycDocuments"],
  2: ["category", "keywords", "title", "description", "seoTitle", "seoDescription", "slug", "filters"]
};
const FREE_STEP_FIELD_MAP = {
  0: ["businessName", "plotNumber", "street", "pincode", "location", "contact", "contactList", "geoLongitude", "geoLatitude", "bannerImage"],
  1: ["kycDocuments"],
  2: ["category", "keywords"]
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
      title: "Badges & Visibility",
      body: "Finally, record the business payment amount, advance paid, and pending balance."
    },
    {
      key: "paymentDetails",
      title: "Payment Details"
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
    },
    {
      key: "preview",
      title: "Preview & Submit",
      body: "Review all details before creating your business listing."
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
    searchSuggestion = [],
    userClient = []
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
  const [successData, setSuccessData] = useState(null);
  const [editId, setEditId] = useState(null);

  // DEBUG: Log on mount and view changes
  useEffect(() => {
    }, [activeView, editMode, businessList, successData]);
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [createdBusinessId, setCreatedBusinessId] = useState(null);
  const [createUserId, setCreateUserId] = useState(null);
  const [galleryDialog, setGalleryDialog] = useState({
    open: false,
    data: null
  });
  const [documentsDialog, setDocumentsDialog] = useState({
    open: false,
    data: null
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputKeyword, setInputKeyword] = useState("");
  const [categoryKeywordSuggestions, setCategoryKeywordSuggestions] = useState([]);
  const [detailRow, setDetailRow] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [certificateRegeneratingId, setCertificateRegeneratingId] = useState(null);
  const [certificateTraceDialog, setCertificateTraceDialog] = useState({
    open: false,
    businessName: "",
    items: []
  });

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("all"); // "all", "paid", "pending"
  const [liveStatus, setLiveStatus] = useState(""); // "", "live", "pending"
  const [activeFilters, setActiveFilters] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState({
    searchTerm: "",
    category: "",
    location: "",
    paymentStatus: "all",
    liveStatus: ""
  });
  const appliedFiltersRef = useRef({ searchTerm: "", category: "", location: "", paymentStatus: "all", liveStatus: "" });
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
    const amount = PREMIUM_MEMBERSHIP_BASE_AMOUNT;
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
  const [activeSection, setActiveSection] = useState("clientBusiness");
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
  const handleRemoveStoredKycDocument = index => {
    clearForceBypassForFields("kycDocuments");
    setFormData(prev => ({
      ...prev,
      kycDocuments: (prev.kycDocuments || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };
  const handleSectionChange = (sectionKey) => {
    setActiveSection(sectionKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const getSectionFlowForStep = step => FORM_SECTION_FLOW[step] || [];
  const getSectionNavigation = (step, sectionKey) => {
    // Preview section always shows Submit button
    if (sectionKey === "preview") {
      return {
        type: "submit",
        label: editMode ? "Save Business" : "Submit"
      };
    }

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
        type: "step",
        label: `Next: ${steps[step + 1]}`,
        title: `Next step: ${steps[step + 1]}`,
        body: "Move ahead when you're ready."
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

  const SECTION_FIELDS_MAP = {
    0: {
      clientBusiness: ["businessName"],
      address: ["plotNumber", "street", "pincode", "location"],
      contact: ["contact", "contactList"],
      businessInfo: [],
      locationWeb: ["geoLongitude", "geoLatitude"],
      socialMedia: [],
      bannerDetails: [],
      openingHours: [],
      badgesVisibility: [],
      paymentDetails: []
    },
    1: {
      kycDocuments: []
    },
    2: {
      categorySeo: ["category", "keywords"],
      keywordsTags: [],
      displaySeo: [],
      searchSeo: [],
      preview: []
    }
  };

  const PAID_SECTION_FIELDS_MAP = {
    0: {
      clientBusiness: ["businessName"],
      address: ["plotNumber", "street", "pincode", "location"],
      contact: ["email", "contact", "contactList"],
      businessInfo: ["gstin", "experience"],
      locationWeb: ["googleMap", "geoLongitude", "geoLatitude"],
      socialMedia: [],
      bannerDetails: ["bannerImage", "businessDetails"],
      openingHours: [],
      badgesVisibility: [],
      paymentDetails: []
    },
    1: {
      kycDocuments: []
    },
    2: {
      categorySeo: ["category", "keywords"],
      keywordsTags: [],
      displaySeo: ["title", "description", "seoTitle", "seoDescription", "slug", "filters"],
      searchSeo: [],
      preview: []
    }
  };

  const getSectionFields = (step, sectionKey) => {
    const fieldsMap = listingMode === LISTING_MODE.PAID ? PAID_SECTION_FIELDS_MAP : SECTION_FIELDS_MAP;
    return fieldsMap[step]?.[sectionKey] || [];
  };

  const getSectionIsComplete = (step, sectionKey) => {
    const fields = getSectionFields(step, sectionKey);
    if (fields.length === 0) return true;

    return fields.every(field => {
      const value = formData[field];
      if (Array.isArray(value)) return value.length > 0;
      return value && String(value).trim().length > 0;
    });
  };

  const getSectionIsDisabled = (step, sectionKey) => {
    // All sections are fully accessible - no locking
    return false;
  };

  const handleNext = () => {
    const cleanedFormData = getCleanBusinessFormData(formData);
    const currentStep = SECTION_TO_STEP[activeSection];

    if (currentStep === 0) {
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
        enqueueSnackbar("Duplicate restriction triggered. Review matches or save as draft.", {
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
      currentStep,
      listingMode
    );

    if (stepErrors.length > 0) {
      setStepValidationTriggered(prev => ({
        ...prev,
        [currentStep]: true
      }));
      setFieldErrors(buildFieldErrorMap(stepErrors));

      showSideSuggestion({
        title: listingMode === LISTING_MODE.PAID
          ? "Complete this section before continuing"
          : "A few core details still need attention",
        body: listingMode === LISTING_MODE.PAID
          ? "Paid listings need these details before the next step unlocks."
          : "Free listings stay flexible, but these core details still block the next step.",
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

    setStepValidationTriggered(prev => ({
      ...prev,
      [currentStep]: true
    }));

    const nextStep = currentStep + 1;
    const nextStepSections = FORM_SECTION_FLOW[nextStep] || [];
    const firstSectionOfNextStep = nextStepSections[0]?.key;

    if (firstSectionOfNextStep) {
      handleSectionChange(firstSectionOfNextStep);

      const nextStepNotification = STEP_NOTIFICATION_CONTENT[nextStep]?.[listingMode];
      if (nextStepNotification) {
        showSideSuggestion({
          title: nextStepNotification.title,
          body: nextStepNotification.body,
          tone: "info"
        });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
      if (nextSection) {
        handleSectionChange(nextSection.key);
      }
      if (navigation.title) {
        showSideSuggestion({ title: navigation.title, body: navigation.body, tone: "info" });
      }
      return;
    }

    if (navigation.type === "step") {
      handleNext();
      return;
    }

    if (navigation.type === "submit") {
      businessFormRef.current?.requestSubmit?.();
      return;
    }
  };
  
  const renderSectionAdvanceButton = (step, sectionKey) => {
    const navigation = getSectionNavigation(step, sectionKey);
    const currentStep = SECTION_TO_STEP[activeSection];

    if (!navigation || currentStep >= steps.length - 1) {
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
  const handleOpenDocuments = row => {
    const rowId = row?._id || row?.id || row;
    const business = (row && typeof row === "object")
      ? row
      : businessList.find(b => b._id === rowId);

    if (business) {
      setDocumentsDialog({
        open: true,
        data: business
      });
    }
  };
  const handleCloseDocuments = () => {
    setDocumentsDialog({
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
    masterLocation: null,
    category: "",
    keywords: [],
    slug: "",
    seoTitle: "",
    seoDescription: "",
    title: "",
    description: "",
    bannerImage: "",
    logoImage: null,
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
    paymentConcept: normalizePaymentConcept(),
    badges: {
      isFeatured: false,
      isSponsored: false,
      isTrending: false,
      isTrust: false,
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
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoCropperOpen, setLogoCropperOpen] = useState(false);
  const [logoCropData, setLogoCropData] = useState({
    image: null,
    crop: { x: 0, y: 0 },
    zoom: 1,
    aspect: 1,
    croppedAreaPixels: null,
  });
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [hoveredPaidButtonId, setHoveredPaidButtonId] = useState(null); // Track which paid button is being hovered
  const [markingPaidId, setMarkingPaidId] = useState(null); // Business id currently being marked as paid
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
  const [sectionSavingState, setSectionSavingState] = useState({});
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const isSavingBusinessRef = useRef(false);
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
      amount: source?.subscription?.price || PREMIUM_MEMBERSHIP_BASE_AMOUNT
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
      paymentConcept: normalizePaymentConcept(source.paymentConcept),
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
    setLogoPreview(nextFormData.logoImage || null);
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
    const sectionForStep = nextStep === 0 ? "clientBusiness" : nextStep === 1 ? "kycDocuments" : nextStep === 2 ? "categorySeo" : "payment";
    setActiveSection(sectionForStep);

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

  const handleSuccessReset = () => {
    setSuccessData(null);
    resetToCreateBusinessState({
      nextView: "list",
      scroll: true
    });
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

  // ===== AUTO-DRAFT FUNCTIONS =====
  // Images and file uploads are excluded to stay within the localStorage quota;
  // restoreDraftFromLocal expects the rest of the form under `formData`.
  const buildBusinessDraftPayload = useCallback((data, activeStep = 0) => {
    const { bannerImage, logoImage, kycDocuments, ...serializableFormData } = data || {};
    return {
      savedAt: new Date().toISOString(),
      activeStep,
      listingMode,
      formData: serializableFormData
    };
  }, [listingMode]);

  const saveDraftToLocalStorage = useCallback((data, activeStep = 0) => {
    try {
      const draftPayload = buildBusinessDraftPayload(data, activeStep);
      localStorage.setItem(BUSINESS_LOCAL_DRAFT_KEY, JSON.stringify(draftPayload));
      setLocalDraftMeta({ savedAt: draftPayload.savedAt });
    } catch (error) {
      }
  }, [buildBusinessDraftPayload]);

  const clearDraftFromLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(BUSINESS_LOCAL_DRAFT_KEY);
      setLocalDraftMeta(null);
    } catch (error) {
      }
  }, []);

  // ===== AUTO-SAVE DRAFT ON FORM CHANGE =====
  useEffect(() => {
    // editMode guard: editing an existing business must not overwrite the create draft
    if (!editMode && activeView === "form" && formData.businessName) {
      const timer = setTimeout(() => {
        saveDraftToLocalStorage(formData, SECTION_TO_STEP[activeSection] ?? 0);
      }, 1000); // Save after 1 second of inactivity
      return () => clearTimeout(timer);
    }
  }, [formData, activeView, editMode, activeSection, saveDraftToLocalStorage]);

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
      return status === "paid" || status === "success" || amount > 0;
    });
  };

  const hasCertificateDocument = row =>
    !!(
      row?.certificates?.verifiedCertificateKey ||
      row?.certificates?.verifiedCertificateUrl ||
      row?.certificates?.trustCertificateKey ||
      row?.certificates?.trustCertificateUrl
    );

  const canRegenerateCertificates = row =>
    isBusinessPaid(row) && (
      !!row.verification?.isVerified ||
      !!row.badges?.isTrust ||
      hasCertificateDocument(row)
    );

  const formatTraceValue = value => {
    if (Array.isArray(value)) return value.length ? value.join(", ") : "none";
    if (value === true) return "yes";
    if (value === false) return "no";
    return value || "none";
  };

  const buildCertificateTraceItems = (row, updatedBusiness) => {
    const trace = updatedBusiness?.certificateRegenerationTrace || {};
    const oldCertificates = row?.certificates || {};
    const nextCertificates = updatedBusiness?.certificates || {};

    return [
      { label: "Business", value: trace.businessName || row?.businessName || row?.name || row?._id },
      { label: "Regenerated types", value: formatTraceValue(trace.requestedTypes) },
      { label: "Output saved as", value: trace.outputContentType || "image/svg+xml" },
      { label: "Old verified key", value: trace.oldVerifiedCertificateKey || oldCertificates.verifiedCertificateKey },
      { label: "New verified key", value: trace.newVerifiedCertificateKey || nextCertificates.verifiedCertificateKey },
      { label: "Old trust key", value: trace.oldTrustCertificateKey || oldCertificates.trustCertificateKey },
      { label: "New trust key", value: trace.newTrustCertificateKey || nextCertificates.trustCertificateKey },
      { label: "Deleted cert keys", value: formatTraceValue(trace.deletedCertificateKeys) },
      { label: "Skipped non-cert keys", value: formatTraceValue(trace.skippedDeleteKeys) },
      { label: "Failed deletes", value: formatTraceValue((trace.failedDeleteKeys || []).map(item => `${item.key}: ${item.message}`)) },
      { label: "KYC document keys", value: `${trace.kycDocumentsKeyCount ?? row?.kycDocumentsKey?.length ?? 0} untouched` },
      { label: "KYC touched", value: formatTraceValue(trace.kycTouched) },
      { label: "Template version", value: trace.templateVersion },
      { label: "Font stack", value: trace.fontFamily },
      { label: "Verified URL", value: trace.newVerifiedCertificateUrl || nextCertificates.verifiedCertificateUrl },
      { label: "Trust URL", value: trace.newTrustCertificateUrl || nextCertificates.trustCertificateUrl }
    ];
  };

  const handleRegenerateCertificates = async row => {
    if (!row?._id || !canRegenerateCertificates(row)) return;

    setCertificateRegeneratingId(row._id);
    try {
      const updatedBusiness = await dispatch(regenerateBusinessCertificates(row._id));
      enqueueSnackbar("Verified/trust certificates regenerated. KYC documents were not changed.", { variant: "success" });
      const traceItems = buildCertificateTraceItems(row, updatedBusiness);
      setCertificateTraceDialog({
        open: true,
        businessName: updatedBusiness?.businessName || row.businessName || row.name || "Business",
        items: traceItems
      });
      console.groupCollapsed("[CertificateRegenerate] Frontend trace");
      console.table(traceItems);
      console.groupEnd();
      if (detailRow?._id === row._id) {
        setDetailRow(prev => ({
          ...prev,
          ...updatedBusiness
        }));
      }
    } catch (error) {
      enqueueSnackbar(
        error.response?.data?.message || error.message || "Certificate regeneration failed.",
        { variant: "error" }
      );
    } finally {
      setCertificateRegeneratingId(null);
    }
  };

  const buildFilterState = (overrides = {}) => ({
    searchTerm: String(overrides.searchTerm ?? searchTerm).trim(),
    category: overrides.category ?? selectedCategory,
    location: overrides.location ?? selectedLocation,
    paymentStatus: overrides.paymentStatus ?? paymentStatus,
    liveStatus: overrides.liveStatus ?? liveStatus,
  });

  const updateActiveFilters = (f) => {
    const chips = [];
    if (f.searchTerm) chips.push({ type: "search", label: `Search: ${f.searchTerm}` });
    if (f.category) chips.push({ type: "category", label: `Category: ${f.category}` });
    if (f.location) chips.push({ type: "location", label: `Location: ${f.location}` });
    if (f.paymentStatus !== "all") chips.push({ type: "payment", label: `Payment: ${f.paymentStatus === "paid" ? "Paid" : "Pending"}` });
    if (f.liveStatus) chips.push({ type: "live", label: `Status: ${f.liveStatus === "live" ? "Live" : "Pending Approval"}` });
    setActiveFilters(chips);
  };

  const dispatchFetch = (f, pageNo = 1, pageSize = 10, sortBy = null, sortOrder = "desc") => {
    dispatch(getAllBusinessList({
      pageNo,
      pageSize,
      search: f.searchTerm || "",
      category: f.category || "",
      location: f.location || "",
      paymentStatus: f.paymentStatus !== "all" ? f.paymentStatus : "",
      liveStatus: f.liveStatus || "",
      sortBy,
      sortOrder,
    }));
  };

  const syncFilters = (overrides = {}) => {
    const next = buildFilterState(overrides);
    setAppliedFilters(next);
    appliedFiltersRef.current = next;
    updateActiveFilters(next);
    dispatchFetch(next);
    setTableRefreshKey(prev => prev + 1);
  };

  const handleClearFilters = () => {
    const empty = { searchTerm: "", category: "", location: "", paymentStatus: "all", liveStatus: "" };
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedLocation("");
    setPaymentStatus("all");
    setLiveStatus("");
    setAppliedFilters(empty);
    appliedFiltersRef.current = empty;
    setActiveFilters([]);
    dispatchFetch(empty);
    setTableRefreshKey(prev => prev + 1);
  };

  const handleRemoveFilter = (filterType) => {
    const patch = { search: { searchTerm: "" }, category: { category: "" }, location: { location: "" }, payment: { paymentStatus: "all" }, live: { liveStatus: "" } };
    const next = { ...appliedFilters, ...(patch[filterType] || {}) };
    if (filterType === "search") setSearchTerm("");
    if (filterType === "category") setSelectedCategory("");
    if (filterType === "location") setSelectedLocation("");
    if (filterType === "payment") setPaymentStatus("all");
    if (filterType === "live") setLiveStatus("");
    setAppliedFilters(next);
    appliedFiltersRef.current = next;
    updateActiveFilters(next);
    dispatchFetch(next);
    setTableRefreshKey(prev => prev + 1);
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
    bannerImage: data.bannerImage,
    logoImage: data.logoImage,
    openingHours: Array.isArray(data.openingHours) ? data.openingHours : [],
    filters: data.filters && typeof data.filters === 'object' ? data.filters : {},
    paymentConcept: normalizePaymentConcept(data.paymentConcept),
    badges: data.badges && typeof data.badges === 'object' ? data.badges : {
      isFeatured: false,
      isSponsored: false,
      isTrending: false,
      priorityScore: 0
    },
    verification: data.verification && typeof data.verification === 'object' ? data.verification : {
      isVerified: false,
      verificationType: "ADMIN"
    },
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
      { field: "clientId", label: "Client ID", required: true, example: "MC260109132723", suggestion: "Pick an existing client suggestion.", validate: value => {
        const idPart = value.split(' — ')[0].trim();
        return /^MC\d{12}$/.test(idPart) || "must be a valid client ID (format: MCYYMMDDHHMMSS). Select from the dropdown list.";
      }},
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

    const draftPayload = buildBusinessDraftPayload(formData, SECTION_TO_STEP[activeSection] ?? 0);

    try {
      localStorage.setItem(BUSINESS_LOCAL_DRAFT_KEY, JSON.stringify(draftPayload));
      setLocalDraftMeta({ savedAt: draftPayload.savedAt });
      enqueueSnackbar("Draft saved locally on this browser.", {
        variant: "success"
      });
    } catch (error) {
      enqueueSnackbar("Failed to save draft - storage full. Clear browser storage.", {
        variant: "error"
      });
    }
  };
  const clearLocalDraft = (showMessage = true) => {
    clearDraftFromLocalStorage();
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
    if (draft.listingMode === LISTING_MODE.PAID || draft.listingMode === LISTING_MODE.FREE) {
      setListingMode(draft.listingMode);
    }
    setActiveView("form");
    const draftStep = Number.isInteger(draft.activeStep) ? Math.max(0, Math.min(draft.activeStep, steps.length - 2)) : 0;
    const defaultSection = draftStep === 0 ? "clientBusiness" : draftStep === 1 ? "kycDocuments" : "categorySeo";
    setActiveSection(defaultSection);
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
  const currentStepFromSection = SECTION_TO_STEP[activeSection];
  const paidCurrentStepErrors = getStepValidationErrors(currentValidationErrors, cleanedLiveFormData, currentStepFromSection, LISTING_MODE.PAID);
  const hasTriggeredCurrentPaidStep = Boolean(stepValidationTriggered[currentStepFromSection] || stepValidationTriggered.final);
  const paidCompletedCount = Math.max(0, paidAllRequiredFields.length - getUniqueFields(
    currentValidationErrors
      .filter(error => paidAllRequiredFields.includes(error.field))
      .map(error => error.field)
  ).length);
  const paidCompletionPercent = paidAllRequiredFields.length > 0
    ? Math.round((paidCompletedCount / paidAllRequiredFields.length) * 100)
    : 100;
  useEffect(() => {
  }, [activeSection, listingMode]);
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
      masterLocation: row.masterLocation || null,
      category: row.category || "",
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      slug: row.slug || "",
      seoTitle: row.seoTitle || "",
      seoDescription: row.seoDescription || "",
      title: row.title || "",
      description: row.description || "",
      restaurantOptions: row.restaurantOptions || "",
      bannerImage: row.bannerImage || "",
      logoImage: row.logoImage || null,
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
      paymentConcept: normalizePaymentConcept(row.paymentConcept),
      badges: {
        isFeatured: row.badges?.isFeatured || false,
        isSponsored: row.badges?.isSponsored || false,
        isTrending: row.badges?.isTrending || false,
        isTrust: row.badges?.isTrust || row.badges?.isTrusted || false,
        priorityScore: row.badges?.priorityScore || 0,
      },
      verification: {
        isVerified: row.verification?.isVerified || false,
        verificationType: row.verification?.verificationType || "ADMIN",
      },
    });
    setBusinessValue(row.businessDetails || "");
    setPreview(row.bannerImage || null);
    setLogoPreview(row.logoImage || null);
    setActiveSection("clientBusiness");
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
  const handleLogoSelect = e => {
    clearForceBypassForFields("logoImage");
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoCropData(prev => ({
          ...prev,
          image: reader.result
        }));
        setLogoCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleLogoCropSave = async (croppedBase64) => {
    setFormData(prev => ({
      ...prev,
      logoImage: croppedBase64
    }));
    setLogoPreview(croppedBase64);
    setLogoCropperOpen(false);
    updateLiveValidation({
      ...formData,
      logoImage: croppedBase64
    }, "logoImage");
  };
  const handleLogoClear = () => {
    setFormData(prev => ({
      ...prev,
      logoImage: null
    }));
    setLogoPreview(null);
    updateLiveValidation({
      ...formData,
      logoImage: null
    }, "logoImage");
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
    const errorStep = getFirstErrorStep(validationErrors);
    const sectionForErrorStep = errorStep === 0 ? "clientBusiness" : errorStep === 1 ? "kycDocuments" : errorStep === 2 ? "categorySeo" : "payment";
    setActiveSection(sectionForErrorStep);
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
  const SECTION_TO_ENDPOINT = {
    clientBusiness: 'address',
    address: 'address',
    contact: 'contact',
    businessInfo: 'business-info',
    locationWeb: 'location-web',
    socialMedia: 'social-media',
    bannerDetails: 'banner-details',
    openingHours: 'opening-hours',
    kycDocuments: 'kyc-documents',
    categorySeo: 'category-seo',
    keywordsTags: 'category-seo',
    displaySeo: 'display-seo',
    searchSeo: 'display-seo',
  };

  const SECTION_ENDPOINT_FIELDS = {
    address: ['plotNumber', 'street', 'pincode', 'location', 'masterLocation', 'globalAddress', 'businessName'],
    contact: ['email', 'contact', 'contactList', 'whatsappNumber'],
    'business-info': ['gstin', 'experience'],
    'location-web': ['googleMap', 'geoLatitude', 'geoLongitude', 'website', 'geoLocation'],
    'social-media': ['facebook', 'instagram', 'youtube', 'pinterest', 'twitter', 'linkedin'],
    'banner-details': ['bannerImage', 'logoImage', 'businessDetails'],
    'opening-hours': ['openingHours'],
    'category-seo': ['category', 'keywords'],
    'display-seo': ['title', 'description', 'seoTitle', 'seoDescription', 'slug', 'filters'],
    'kyc-documents': ['kycDocuments'],
  };

  const saveSectionData = async (sectionKey = activeSection) => {
    if (!editMode || !editId) return;

    setSectionSavingState(prev => ({ ...prev, [sectionKey]: true }));

    try {
      if (sectionKey === 'badgesVisibility') {
        const payload = {
          badges: {
            ...formData.badges,
            isTrust: !!(formData.badges?.isTrust || formData.badges?.isTrusted),
          },
          verification: formData.verification,
        };

        const updatedBusiness = await dispatch(updateBusinessBadges(editId, payload));
        setFormData(prev => ({
          ...prev,
          badges: {
            ...prev.badges,
            ...(updatedBusiness?.badges || payload.badges),
          },
          verification: {
            ...prev.verification,
            ...(updatedBusiness?.verification || payload.verification),
          },
        }));
        enqueueSnackbar("Badges & visibility saved successfully!", {
          variant: "success"
        });
        dispatch(getAllBusinessList());
        setSectionSavingState(prev => ({ ...prev, [sectionKey]: false }));
        return;
      }

      if (sectionKey === 'paymentDetails') {
        const payload = {
          name: formData.businessName,
          businessName: formData.businessName,
          category: formData.category,
          location: formData.location,
          paymentConcept: normalizePaymentConcept(formData.paymentConcept),
        };
        const updatedBusiness = await dispatch(editBusinessList(editId, payload));
        setFormData(prev => ({
          ...prev,
          paymentConcept: normalizePaymentConcept(updatedBusiness?.paymentConcept || payload.paymentConcept),
        }));
        enqueueSnackbar("Payment details saved successfully!", {
          variant: "success"
        });
        dispatch(getAllBusinessList());
        setSectionSavingState(prev => ({ ...prev, [sectionKey]: false }));
        return;
      }

      const endpointName = SECTION_TO_ENDPOINT[sectionKey];
      if (!endpointName) {
        setSectionSavingState(prev => ({ ...prev, [sectionKey]: false }));
        return;
      }

      const allowedFields = SECTION_ENDPOINT_FIELDS[endpointName];
      const sectionData = {};

      allowedFields.forEach(field => {
        if (field === 'geoLocation') {
          sectionData.geoLocation = formData.geoLocation;
        } else if (field === 'geoLatitude') {
          sectionData.geoLocation = formData.geoLocation;
        } else if (field === 'geoLongitude') {
          sectionData.geoLocation = formData.geoLocation;
        } else if (formData[field] !== undefined) {
          sectionData[field] = formData[field];
        }
      });

      if (sectionKey === 'kycDocuments') {
        const newKycFiles = kycFiles.filter(file => file instanceof File);
        const newKycDocuments = await Promise.all(newKycFiles.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })));
        sectionData.kycDocuments = [
          ...newKycDocuments
        ];
        sectionData.retainedKycDocuments = Array.isArray(formData.kycDocuments) ? formData.kycDocuments : [];
      }

      if (Object.keys(sectionData).length === 0) {
        setSectionSavingState(prev => ({ ...prev, [sectionKey]: false }));
        return;
      }

      const updatedBusiness = await dispatch(editBusinessSection(editId, endpointName, sectionData));
      if (sectionKey === 'kycDocuments') {
        revokePreviewUrls(kycFiles);
        setKycFiles([]);
        setFormData(prev => ({
          ...prev,
          kycDocuments: Array.isArray(updatedBusiness?.kycDocuments) ? updatedBusiness.kycDocuments : prev.kycDocuments,
        }));
      }
      enqueueSnackbar(`${sectionKey} saved successfully!`, {
        variant: "success"
      });
      dispatch(getAllBusinessList());
      setSectionSavingState(prev => ({ ...prev, [sectionKey]: false }));
    } catch (err) {
      enqueueSnackbar(`Error saving ${sectionKey}. Please try again.`, {
        variant: "error"
      });
      setSectionSavingState(prev => ({ ...prev, [sectionKey]: false }));
    }
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
    if (isSavingBusinessRef.current) {
      return;
    }
    isSavingBusinessRef.current = true;
    setIsSavingBusiness(true);
    try {
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
      setActiveSection("clientBusiness");
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
    const newKycFiles = sourceKycFiles.filter(file => file instanceof File);
    const kycBase64 = await Promise.all(newKycFiles.map(file => new Promise((resolve, reject) => {
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
      retainedKycDocuments: editMode && Array.isArray(cleanedFormData.kycDocuments)
        ? cleanedFormData.kycDocuments
        : undefined,
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
        clearDraftFromLocalStorage();
        dispatch(getAllBusinessList());
      } else {
        response = await dispatch(createBusinessList(payload));
        const businessId = response?.data?._id || response?._id || response?.payload?._id || response?.payload?.data?._id;
        const userId = response?.data?.createdBy || response?.createdBy || response?.payload?.createdBy || response?.payload?.data?.createdBy;
        if (businessId) {
          setCreatedBusinessId(businessId);
          clearDraftFromLocalStorage();
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

        // Show success screen instead of payment section
        setSuccessData({
          businessName: cleanedFormData.businessName,
          businessId,
          isPaid: listingMode === LISTING_MODE.PAID,
          listingMode
        });
        setActiveView("success");
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
    } finally {
      isSavingBusinessRef.current = false;
      setIsSavingBusiness(false);
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
        badges: {
          ...formData.badges,
          isTrust: !!(formData.badges?.isTrust || formData.badges?.isTrusted),
        },
        verification: formData.verification
      };

      const updatedBusiness = await dispatch(updateBusinessBadges(editId, payload));
      setFormData(prev => ({
        ...prev,
        badges: {
          ...prev.badges,
          ...(updatedBusiness?.badges || payload.badges),
        },
        verification: {
          ...prev.verification,
          ...(updatedBusiness?.verification || payload.verification),
        },
      }));
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
        isTrust: false,
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
    setActiveSection("categorySeo");

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
    masterLocation: bl.masterLocation || null,
    category: bl.category || "-",
    seoTitle: bl.seoTitle || "",
    seoDescription: bl.seoDescription || "",
    title: bl.title || "",
    description: bl.description || "",
    slug: bl.slug || "",
    keywords: bl.keywords || [],
    restaurantOptions: bl.restaurantOptions || "",
    bannerImage: bl.bannerImage || null,
    logoImage: bl.logoImage || null,
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
    kycDocuments: bl.kycDocuments || [],
    badges: bl.badges || { isFeatured: false, isSponsored: false, isTrending: false, isTrust: false, priorityScore: 0 },
    verification: bl.verification || { isVerified: false, verificationType: "ADMIN" },
    certificates: bl.certificates || {},
  }));

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
    masterLocation: bl.masterLocation || null,
    category: bl.category || "-",
    seoTitle: bl.seoTitle || "",
    seoDescription: bl.seoDescription || "",
    title: bl.title || "",
    description: bl.description || "",
    slug: bl.slug || "",
    keywords: bl.keywords || [],
    restaurantOptions: bl.restaurantOptions || "",
    bannerImage: bl.bannerImage || null,
    logoImage: bl.logoImage || null,
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
    kycDocuments: bl.kycDocuments || [],
    badges: bl.badges || { isFeatured: false, isSponsored: false, isTrending: false, isTrust: false, priorityScore: 0 },
    verification: bl.verification || { isVerified: false, verificationType: "ADMIN" },
    certificates: bl.certificates || {},
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

  const filteredRows = getRowsMatchingAppliedFilters(rows);
  const categoryOptions = toSortedUniqueTextOptions(
    [...category, ...searchCategory].map(c => c?.category)
  );
  const locationOptions = toSortedUniqueTextOptions(
    location.map(l => l?.city || l?.district || l?.location || l?.name)
  );

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

  const replaceFileExtension = (filename, extension) => {
    const cleanName = filename || `Business Document.${extension}`;
    return `${cleanName.replace(/\.[^/.\\]+$/, "")}.${extension}`;
  };

  const convertSvgBlobToPngBlob = async (svgBlob) => {
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }

    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = svgUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width || 720;
      canvas.height = image.naturalHeight || image.height || 960;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      return await new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error("Unable to prepare PNG download."));
        }, "image/png", 0.96);
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const getDownloadFilename = (contentDisposition, fallback) => {
    const match = String(contentDisposition || "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match ? decodeURIComponent(match[1].replace(/"/g, "")) : fallback;
  };

  const downloadBusinessDocument = async ({
    businessId,
    type,
    index,
    name,
    fallbackUrl = ""
  }) => {
    const params = new URLSearchParams({ type });
    if (Number.isInteger(index)) params.append("index", String(index));

    try {
      const response = await axiosInstance.get(
        `${process.env.REACT_APP_API_URL}/businesslist/documents/${businessId}/download?${params.toString()}`,
        { responseType: "blob" }
      );
      const extension = (fallbackUrl.split("?")[0].match(/\.(\w+)$/) || [])[1] || "bin";
      const fallbackName = `${name || "Business Document"}.${extension}`;
      let filename = getDownloadFilename(response.headers?.["content-disposition"], fallbackName);
      let downloadData = response.data;
      const isCertificateDownload = type === "verified" || type === "trust";
      const isSvgDownload = downloadData?.type === "image/svg+xml" || filename.toLowerCase().endsWith(".svg");

      if (isCertificateDownload && isSvgDownload) {
        downloadData = await convertSvgBlobToPngBlob(downloadData);
        filename = replaceFileExtension(filename, "png");
      }

      downloadBlob(downloadData, filename);
      enqueueSnackbar(`${name || "Document"} downloaded${isCertificateDownload ? " as PNG" : ""}`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || error.message || "Download failed.", { variant: "error" });
    }
  };

  const handleExportBusinessData = async () => {
    if (exportLoading) return;
    try {
      const f = appliedFiltersRef.current;
      const { exportedCount = 0 } = await dispatch(exportBusinessList({
        search: f.searchTerm,
        category: f.category,
        location: f.location,
        paymentStatus: f.paymentStatus !== "all" ? f.paymentStatus : "",
        liveStatus: f.liveStatus || "",
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
    id: "bannerImage",
    label: "",
    renderCell: (value, row) => (
      <Avatar
        src={value}
        alt={row.businessName}
        sx={{ width: 36, height: 36, borderRadius: 1, cursor: "pointer" }}
        variant="square"
        onClick={() => {
          setSelectedImageUrl(value);
          setImageModalOpen(true);
        }}
      />
    )
  }, {
    id: "logoImage",
    label: "Logo",
    width: 60,
    renderCell: (value, row) => (
      value ? (
        <Avatar
          src={value}
          alt={row.businessName}
          sx={{ width: 40, height: 40, borderRadius: 1, cursor: "pointer" }}
          onClick={() => {
            setSelectedImageUrl(value);
            setImageModalOpen(true);
          }}
        />
      ) : (
        <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#9ca3af" }}>
          —
        </Box>
      )
    )
  }, {
    id: "businessName",
    label: "Business",
    renderCell: (value, row) => (
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#1f2937", lineHeight: 1.3 }}>
          {value || "—"}
        </Typography>
        <Typography sx={{ fontSize: "0.7rem", color: "#9ca3af", fontWeight: 400 }}>
          {row.clientId}
        </Typography>
      </Box>
    )
  }, {
    id: "location",
    label: "Location"
  }, {
    id: "category",
    label: "Category"
  }, {
    id: "categoryGroup",
    label: "Category Group",
    renderCell: (_, row) => {
      const categoryGroups = Array.isArray(row.mniDetails)
        ? row.mniDetails.map(i => i?.categoryGroup).filter(Boolean).join(", ") || "—"
        : "—";
      return <Typography sx={{ fontSize: "0.82rem", color: "#6b7280" }}>{categoryGroups}</Typography>;
    }
  }, {
    id: "payment",
    label: "Status",
    renderCell: (_, row) => {
      const isPaid = Boolean(row.amountPaid);
      const isHovering = hoveredPaidButtonId === row._id;
      const isMarkingPaid = markingPaidId === row._id;
      const handleMarkPaid = async () => {
        if (isPaid || !row?._id || markingPaidId) return;
        setMarkingPaidId(row._id);
        try {
          await dispatch(editBusinessList(row._id, {
            name: row.businessName, businessName: row.businessName,
            category: row.category, location: row.location,
            payment: [{ amount: row?.subscription?.price || PREMIUM_MEMBERSHIP_BASE_AMOUNT }]
          }));
          enqueueSnackbar(`${row.businessName} marked as paid`, { variant: "success" });

          // Send invoice email
          try {
            const token = localStorage.getItem('accessToken');
            const emailResponse = await axiosInstance.post(
              `${process.env.REACT_APP_API_URL}/phonepe/send-invoice`,
              { businessId: row._id },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (emailResponse.data?.alreadySent) {
              enqueueSnackbar(`Invoice email already sent to ${row.email}`, { variant: "info" });
            } else if (emailResponse.data?.success) {
              enqueueSnackbar(`Invoice email sent to ${row.email}`, { variant: "info" });
            } else {
              enqueueSnackbar(`Invoice email could not be sent`, { variant: "warning" });
            }
          } catch (emailError) {
            enqueueSnackbar(`Invoice email error: ${emailError.message}`, { variant: "warning" });
          }

          dispatch(getAllBusinessList());
        } catch {
          enqueueSnackbar("Payment failed. Please try again!", { variant: "error" });
        } finally {
          setMarkingPaidId(null);
        }
      };
      const handleRevertPaid = async () => {
        if (!isPaid || !row?._id) return;
        try {
          await dispatch(revertPaidStatus(row._id));
          enqueueSnackbar(`${row.businessName} reverted to unpaid`, { variant: "success" });
          dispatch(getAllBusinessList());
        } catch {
          enqueueSnackbar("Failed to revert payment status. Please try again!", { variant: "error" });
        }
      };
      const paidDateValue = row.paidDate?.$date ? row.paidDate.$date : row.paidDate;
      const formattedDate = paidDateValue ? new Date(paidDateValue).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true
      }) : null;
      return (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Tooltip title={isMarkingPaid ? "Marking as paid..." : isPaid ? (isHovering ? "Click to revert to unpaid" : `Paid on ${formattedDate}`) : "Click to mark as paid"} arrow>
            <button
              onClick={isPaid ? handleRevertPaid : handleMarkPaid}
              className={cx("payment-status-btn", isPaid ? "payment-status-btn-paid" : "payment-status-btn-pending")}
              disabled={isMarkingPaid}
              style={isMarkingPaid ? { opacity: 0.7, cursor: "wait" } : undefined}
              onMouseEnter={() => setHoveredPaidButtonId(row._id)}
              onMouseLeave={() => setHoveredPaidButtonId(null)}
            >
              {isMarkingPaid ? (
                <>
                  <CircularProgress size={13} sx={{ color: "inherit" }} />
                  <span>Processing</span>
                </>
              ) : isPaid ? (
                <>
                  {isHovering ? (
                    <>
                      <CloseRoundedIcon sx={{ fontSize: "1rem" }} />
                      <span>Revert</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleRoundedIcon sx={{ fontSize: "1rem" }} />
                      <span>Paid</span>
                    </>
                  )}
                </>
              ) : (
                <span>Pay Now</span>
              )}
            </button>
          </Tooltip>
        </Box>
      );
    }
  }, {
    id: "_actions",
    label: "Action",
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <Tooltip title="View details" arrow>
          <EyeOutlined onClick={() => setDetailRow(row)} style={{ fontSize: 18, color: "#ff7a00", cursor: "pointer" }} />
        </Tooltip>
        <Tooltip title="View docs" arrow>
          <DescriptionOutlinedIcon
            onClick={() => handleOpenDocuments(row)}
            sx={{ fontSize: 18, color: "#0f766e", cursor: "pointer" }}
          />
        </Tooltip>
        {canRegenerateCertificates(row) && (
          <Tooltip title="Regenerate verified/trust certificates" arrow>
            <AutorenewRoundedIcon
              onClick={() => {
                if (certificateRegeneratingId !== row._id) {
                  handleRegenerateCertificates(row);
                }
              }}
              sx={{
                fontSize: 18,
                color: certificateRegeneratingId === row._id ? "#94a3b8" : "#8b5cf6",
                cursor: certificateRegeneratingId === row._id ? "not-allowed" : "pointer"
              }}
            />
          </Tooltip>
        )}
        <Tooltip title="Edit" arrow>
          <EditOutlined onClick={() => handleEdit(row)} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        </Tooltip>
        <Tooltip title="Delete" arrow>
          <DeleteOutlined onClick={() => handleDelete(row)} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
        </Tooltip>
      </Box>
    )
  }];
  const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
    isCollapsed = false,
    isDisabled = false,
    onToggleCollapse = null
  }) => <div className={cx("section-header", isDisabled && "disabled", isCollapsed && "collapsed")}>
      <button
        type="button"
        className={cx("section-header-button")}
        onClick={onToggleCollapse}
        disabled={isDisabled}
        aria-expanded={!isCollapsed}
      >
        {Icon && <Icon className={cx("section-icon")} />}
        <div className={cx("section-title-group")}>
          <h3 className={cx("section-title")}>{title}</h3>
          {subtitle && <p className={cx("section-subtitle")}>{subtitle}</p>}
        </div>
        <span className={cx("section-collapse-icon")}>
          {isCollapsed ? '▼' : '▲'}
        </span>
      </button>
      {isDisabled && <div className={cx("section-disabled-overlay")}>Complete previous section to unlock</div>}
    </div>;
  const handleListingModeChange = (nextMode) => {
    if (listingMode === nextMode) {
      return;
    }

    setListingMode(nextMode);
    setFieldErrors({});
    setForceBypassedFields([]);
    setWarnDialog(false);
    setWarnLevel(0);
    setPostCreatePaidStatus("idle");
  };
  const renderListingModeToggle = () => (
    <div className={cx("listing-mode-switch")}>
      <span className={cx("listing-mode-switch-label")}>Listing Type</span>
      <div className={cx("listing-mode-switch-track")} role="tablist" aria-label="Listing mode">
        <button
          type="button"
          role="tab"
          aria-selected={listingMode === LISTING_MODE.FREE}
          className={cx("listing-mode-switch-option", listingMode === LISTING_MODE.FREE && "active")}
          onClick={() => handleListingModeChange(LISTING_MODE.FREE)}
        >
          Free
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listingMode === LISTING_MODE.PAID}
          className={cx("listing-mode-switch-option", listingMode === LISTING_MODE.PAID && "active")}
          onClick={() => handleListingModeChange(LISTING_MODE.PAID)}
        >
          Paid
        </button>
      </div>
    </div>
  );
  const renderPaidAssistant = () => {
    if (listingMode !== LISTING_MODE.PAID || SECTION_TO_STEP[activeSection] >= steps.length - 1) {
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
              <div key={label} className={cx("paid-step-pill", SECTION_TO_STEP[activeSection] === index && "active", isComplete && "complete")}>
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

  // ===== FILTER BAR =====
  const renderSearchPanel = () => (
    <div className={cx("filter-bar")}>
      <div className={cx("filter-row")}>
        <input
          type="text"
          placeholder="Search name, contact, address..."
          className={cx("filter-search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && syncFilters({ searchTerm: e.target.value })}
        />
        <select
          className={cx("filter-select")}
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); syncFilters({ category: e.target.value }); }}
        >
          <option value="">All Categories</option>
          {categoryOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <select
          className={cx("filter-select")}
          value={selectedLocation}
          onChange={(e) => { setSelectedLocation(e.target.value); syncFilters({ location: e.target.value }); }}
        >
          <option value="">All Locations</option>
          {locationOptions.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
        <select
          className={cx("filter-select", "filter-select-sm")}
          value={paymentStatus}
          onChange={(e) => { setPaymentStatus(e.target.value); syncFilters({ paymentStatus: e.target.value }); }}
        >
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
        </select>
        <select
          className={cx("filter-select", "filter-select-sm")}
          value={liveStatus}
          onChange={(e) => { setLiveStatus(e.target.value); syncFilters({ liveStatus: e.target.value }); }}
        >
          <option value="">All Status</option>
          <option value="live">Live</option>
          <option value="pending">Pending Approval</option>
        </select>
        <button
          type="button"
          className={cx("filter-search-btn")}
          onClick={() => syncFilters({ searchTerm })}
        >
          Search
        </button>
        {activeFilters.length > 0 && (
          <button
            type="button"
            className={cx("filter-clear-btn")}
            onClick={handleClearFilters}
          >
            Clear
          </button>
        )}
      </div>
      {activeFilters.length > 0 && (
        <div className={cx("filter-chips-row")}>
          {activeFilters.map((f, i) => (
            <Chip
              key={i}
              label={f.label}
              onDelete={() => handleRemoveFilter(f.type)}
              size="small"
              sx={{
                backgroundColor: "#FFE8D6",
                color: "#D97800",
                fontWeight: 500,
                "& .MuiChip-deleteIcon": { color: "#D97800", "&:hover": { color: "#B35900" } }
              }}
            />
          ))}
          <span className={cx("filter-result-count")}>
            {total} result{total !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );

  const renderPreviewField = (label, value) => {
    if (!value) return null;
    return (
      <Box sx={{ mb: 2, pb: 2, borderBottom: "1px solid #f0f0f0" }}>
        <Typography variant="caption" sx={{ color: "#666", fontWeight: 600, display: "block", mb: 0.5 }}>
          {label}
        </Typography>
        {typeof value === "string" && value.includes("<") ? (
          <Box dangerouslySetInnerHTML={{ __html: value }} sx={{ fontSize: "0.9rem" }} />
        ) : Array.isArray(value) ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {value.filter(v => v).map((item, idx) => (
              <Chip key={idx} label={typeof item === "string" ? item : item?.label || JSON.stringify(item)} size="small" />
            ))}
          </Box>
        ) : (
          <Typography variant="body2">{String(value)}</Typography>
        )}
      </Box>
    );
  };

  const renderStepContent = (step, sectionKey) => {
    // Handle preview section
    if (sectionKey === "preview") {
      return (
        <Box sx={{ p: 3, maxWidth: 1000, mx: "auto" }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: "#333" }}>
            📋 Complete Form Preview
          </Typography>

          {/* STEP 0: Business Information */}
          <Box sx={{ mb: 4, p: 2.5, border: "1px solid #e0e0e0", borderRadius: 1.5, backgroundColor: "#fafafa" }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700, color: "#ff8c42" }}>
              Step 1: Business Information
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {renderPreviewField("Client", formData.clientId)}
              {renderPreviewField("Business Name", formData.businessName)}
              {renderPreviewField("Plot Number", formData.plotNumber)}
              {renderPreviewField("Street", formData.street)}
              {renderPreviewField("Pincode", formData.pincode)}
              {renderPreviewField("Global Address", formData.globalAddress)}
              {renderPreviewField("Location", formData.location)}
              {renderPreviewField("Email", formData.email)}
              {renderPreviewField("Phone", formData.contact)}
              {renderPreviewField("Contact List", formData.contactList)}
              {renderPreviewField("WhatsApp Number", formData.whatsappNumber)}
              {renderPreviewField("GSTIN", formData.gstin)}
              {renderPreviewField("Experience", formData.experience)}
              {renderPreviewField("Google Map Link", formData.googleMap)}
              {renderPreviewField("Latitude", formData.geoLatitude || formData.geoLocation?.coordinates?.[1])}
              {renderPreviewField("Longitude", formData.geoLongitude || formData.geoLocation?.coordinates?.[0])}
              {renderPreviewField("Website", formData.website)}
              {renderPreviewField("Facebook", formData.facebook)}
              {renderPreviewField("Instagram", formData.instagram)}
              {renderPreviewField("YouTube", formData.youtube)}
              {renderPreviewField("Pinterest", formData.pinterest)}
              {renderPreviewField("Twitter", formData.twitter)}
              {renderPreviewField("LinkedIn", formData.linkedin)}
            </Box>

            {renderPreviewField("Business Details", formData.businessDetails)}

            {formData.bannerImage && (
              <Box sx={{ mb: 2, pb: 2, borderBottom: "1px solid #f0f0f0" }}>
                <Typography variant="caption" sx={{ color: "#666", fontWeight: 600, display: "block", mb: 0.5 }}>
                  Banner Image
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    backgroundImage: `url(${preview || formData.bannerImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    borderRadius: 1,
                    border: "1px solid #e0e0e0"
                  }}
                />
              </Box>
            )}

            {/* Opening Hours */}
            {formData.openingHours && formData.openingHours.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: "#666", fontWeight: 600, display: "block", mb: 1 }}>
                  Opening Hours
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1 }}>
                  {formData.openingHours.map((hour, idx) => (
                    <Box key={idx} sx={{ p: 1, backgroundColor: "#f5f5f5", borderRadius: 0.5, fontSize: "0.85rem" }}>
                      <strong>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][idx]}</strong>
                      {hour.is24Hours ? " - 24/7" : hour.isClosed ? " - Closed" : ` - ${hour.open} to ${hour.close}`}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* STEP 1: KYC Documents */}
          <Box sx={{ mb: 4, p: 2.5, border: "1px solid #e0e0e0", borderRadius: 1.5, backgroundColor: "#fafafa" }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700, color: "#ff8c42" }}>
              Step 2: KYC Documents
            </Typography>
            {kycFiles.length > 0 ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 2 }}>
                {kycFiles.map((file, idx) => (
                  <Box key={idx} sx={{ border: "1px solid #e0e0e0", borderRadius: 1, overflow: "hidden", backgroundColor: "#fff" }}>
                    {file.preview && (
                      <Box
                        sx={{
                          width: "100%",
                          height: 180,
                          backgroundImage: `url(${file.preview})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center"
                        }}
                      />
                    )}
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 600, mb: 0.5 }}>
                        📄 {file.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#999" }}>
                        {(file.size / 1024).toFixed(2)} KB
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: "#999" }}>No KYC documents uploaded</Typography>
            )}
          </Box>

          {/* STEP 2: SEO & Category */}
          <Box sx={{ mb: 4, p: 2.5, border: "1px solid #e0e0e0", borderRadius: 1.5, backgroundColor: "#fafafa" }}>
            <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700, color: "#ff8c42" }}>
              Step 3: SEO & Keywords
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {renderPreviewField("Category", formData.category)}
              {renderPreviewField("Location Filter", formData.location)}
              {renderPreviewField("Display Title", formData.title)}
              {renderPreviewField("Display Description", formData.description)}
              {renderPreviewField("SEO Title", formData.seoTitle)}
              {renderPreviewField("SEO Description", formData.seoDescription)}
              {renderPreviewField("Slug", formData.slug)}
            </Box>

            {renderPreviewField("Keywords & Tags", formData.keywords)}
          </Box>

          <Box sx={{ mt: 4, display: "flex", gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => handleSectionChange("searchSeo")}
              sx={{ flex: 1 }}
            >
              ← Back to Edit
            </Button>
            <Button
              variant="contained"
              type="submit"
              onClick={handleSubmit}
              sx={{
                backgroundColor: "#ff8c42",
                "&:hover": { backgroundColor: "#e67a2e" },
                flex: 1
              }}
            >
              {editMode ? "Save All Changes" : "Create Listing"}
            </Button>
          </Box>
        </Box>
      );
    }

    switch (step) {
      case 0:
        return (
          <BusinessFormStep0
            formData={formData}
            fieldErrors={fieldErrors}
            loading={loading}
            preview={preview}
            logoPreview={logoPreview}
            listingMode={listingMode}
            paymentMethodOptions={PAYMENT_METHOD_OPTIONS}
            normalizePaymentConcept={normalizePaymentConcept}
            getSectionRefKey={getSectionRefKey}
            getSectionIsComplete={getSectionIsComplete}
            getSectionIsDisabled={getSectionIsDisabled}
            handleSectionAdvance={handleSectionAdvance}
            getSectionNavigation={getSectionNavigation}
            getInputClassName={getInputClassName}
            renderFieldError={renderFieldError}
            handleChange={handleChange}
            handlePlaceSelect={handlePlaceSelect}
            handleGeoCoordinateChange={handleGeoCoordinateChange}
            handleImageChange={handleImageChange}
            handleLogoSelect={handleLogoSelect}
            handleLogoClear={handleLogoClear}
            handleBusinessChange={handleBusinessChange}
            handleOpeningHourChange={handleOpeningHourChange}
            formDataBusinessDetails={businessvalue}
            QUILL_MODULES={QUILL_MODULES}
            QUILL_FORMATS={QUILL_FORMATS}
            QuillEditor={QuillEditor}
            location={location}
            locationSuggestions={locationSuggestions}
            showLocationSuggest={showLocationSuggest}
            setFormData={setFormData}
            setShowLocationSuggest={setShowLocationSuggest}
            setLocationSuggestions={setLocationSuggestions}
            searchSuggestion={searchSuggestion}
            userClient={userClient}
            showSuggestions={showSuggestions}
            setShowSuggestions={setShowSuggestions}
            dispatch={dispatch}
            getUserClientSuggestion={getUserClientSuggestion}
            activeSection={activeSection}
            editMode={editMode}
            saveSectionData={saveSectionData}
            sectionSavingState={sectionSavingState}
          />
        );
      case 1:
        return (
          <BusinessFormStep1
            kycFiles={kycFiles}
            existingKycDocuments={formData.kycDocuments}
            handleKycUpload={handleKycUpload}
            handleRemoveFile={handleRemoveFile}
            handleRemoveStoredDocument={handleRemoveStoredKycDocument}
            handleSectionAdvance={handleSectionAdvance}
            getSectionNavigation={getSectionNavigation}
            getSectionRefKey={getSectionRefKey}
            getSectionIsDisabled={getSectionIsDisabled}
            renderFieldError={renderFieldError}
            editMode={editMode}
            saveSectionData={saveSectionData}
            sectionSavingState={sectionSavingState}
          />
        );
      case 2:
        return (
          <BusinessFormStep2
            formData={formData}
            category={category}
            categoryFilterConfig={categoryFilterConfig}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            handleSectionAdvance={handleSectionAdvance}
            getSectionNavigation={getSectionNavigation}
            getSectionRefKey={getSectionRefKey}
            getSectionIsComplete={getSectionIsComplete}
            getSectionIsDisabled={getSectionIsDisabled}
            getInputClassName={getInputClassName}
            renderFieldError={renderFieldError}
            categoryKeywordSuggestions={categoryKeywordSuggestions}
            inputKeyword={inputKeyword}
            setFormData={setFormData}
            activeSection={activeSection}
            addKeywordToForm={addKeywordToForm}
            removeKeywordFromForm={removeKeywordFromForm}
            addKeywordsToForm={addKeywordsToForm}
            setInputKeyword={setInputKeyword}
            setCategoryKeywordSuggestions={setCategoryKeywordSuggestions}
            handleFilterChange={handleFilterChange}
            getFilterValue={getFilterValue}
            clearForceBypassForFields={clearForceBypassForFields}
            updateLiveValidation={updateLiveValidation}
            searchCategory={searchCategory}
            dispatch={dispatch}
            businessCategorySearch={businessCategorySearch}
            editMode={editMode}
            saveSectionData={saveSectionData}
            sectionSavingState={sectionSavingState}
            isSavingBusiness={isSavingBusiness}
          />
        );

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
                      : `Just Rs. ${PREMIUM_MEMBERSHIP_BASE_AMOUNT.toLocaleString("en-IN")}/- + GST`
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
  const isFieldFilled = (field, data) => {
    if (field === "geoLatitude") { const v = data.geoLocation?.coordinates?.[1]; return v != null && String(v).trim().length > 0; }
    if (field === "geoLongitude") { const v = data.geoLocation?.coordinates?.[0]; return v != null && String(v).trim().length > 0; }
    const value = String(field).split(".").reduce((source, key) => source?.[key], data);
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    return String(value).replace(/<[^>]*>/g, "").trim().length > 0;
  };
  const sectionStatus = {};
  Object.entries(SECTION_TO_STEP).forEach(([key, step]) => {
    if (step === 3) return;
    if (key === "kycDocuments") {
      const existingKycCount = Array.isArray(formData.kycDocuments) ? formData.kycDocuments.length : 0;
      sectionStatus[key] = { done: kycFiles.length + existingKycCount > 0 ? 1 : 0, total: 1 };
      return;
    }
    if (key === "openingHours") {
      const hours = formData.openingHours || [];
      const done = hours.filter(h => h.is24Hours || h.isClosed || (h.open && h.close)).length;
      sectionStatus[key] = { done, total: hours.length || 7 };
      return;
    }
    if (key === "badgesVisibility" || key === "keywordsTags") {
      sectionStatus[key] = null;
      return;
    }
    const fields = SECTION_ALL_FIELDS[key];
    if (!fields) { sectionStatus[key] = null; return; }
    const done = fields.filter(f => isFieldFilled(f, formData)).length;
    sectionStatus[key] = { done, total: fields.length };
  });
  return <div className={cx("business-page")}>
    {renderSideSuggestion()}
    <AdminViewTabs activeView={activeView} onChange={handleAdminViewChange} isEditing={editMode} createLabel="Business" listLabel="Directory" listCount={total} />

    {activeView === "form" && <>
      <div className={cx("form-top-bar")}>
        <div className={cx("form-top-bar-title-row")}>
          <h2 className={cx("card-title")}>
            {editMode ? `Edit Business` : `Add New Business`}
          </h2>
          {!editMode && (
            <div className={cx("draft-actions-bar")}>
              {!editMode && renderListingModeToggle()}
              <button type="button" className={cx("template-download-button")} onClick={downloadBusinessDetailsTemplate}>
                Download Template
              </button>
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
              {SECTION_TO_STEP[activeSection] === 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<TravelExploreIcon />}
                  onClick={openGmapsPicker}
                  sx={{
                    borderColor: '#ff8c42',
                    borderRadius: '999px',
                    color: '#ff8c42',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    height: '40px',
                    padding: '7px 14px',
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
        {renderPaidAssistant()}
        {!editMode && (
          <div className={cx("draft-meta-row")} style={{ marginBottom: 0 }}>
            <span>
              Draft is stored only in this browser on this machine.
            </span>
            <span>
              {localDraftMeta?.savedAt
                ? `Last saved: ${new Date(localDraftMeta.savedAt).toLocaleString()}`
                : "No local draft saved yet."}
            </span>
            <span>Images and KYC file uploads are not included in local draft restore.</span>
          </div>
        )}
      </div>

      <div className={cx("business-form-container")}>
        <BusinessSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          sectionStatus={sectionStatus}
          getSectionIsDisabled={getSectionIsDisabled}
        />

        <div className={cx("business-form-content")}>
          <div className={cx("business-card")}>
            <form ref={businessFormRef} onSubmit={handleSubmit}>
          {SECTION_TO_STEP[activeSection] === 0 && possibleDuplicateMatches.length > 0 && (
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
            {renderStepContent(SECTION_TO_STEP[activeSection], activeSection)}
          </div>
        </form>
          </div>
        </div>
      </div>

      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)'
          }}
        >
          <CircularProgress
            size={60}
            sx={{
              color: '#FF8C00',
              mb: 2
            }}
          />
          <Typography
            sx={{
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 600,
              textAlign: 'center'
            }}
          >
            {editMode ? 'Saving your business...' : 'Creating your listing...'}
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
              mt: 1,
              textAlign: 'center'
            }}
          >
            Please wait while we process your information
          </Typography>
        </Box>
      )}
    </>}

    {activeView === "success" && successData && (
      <div className={cx("success-screen-container")}>
        <div className={cx("success-screen-card")}>
          <div className={cx("success-icon")}>✅</div>
          <h1 className={cx("success-title")}>Business Created Successfully!</h1>

          <div className={cx("success-details")}>
            <p className={cx("success-business-name")}>{successData.businessName}</p>

            {successData.isPaid ? (
              <div className={cx("success-paid-badge")}>
                <span className={cx("paid-badge-icon")}>💳</span>
                <span>This is a PAID Business</span>
              </div>
            ) : (
              <div className={cx("success-free-badge")}>
                <span className={cx("free-badge-icon")}>🆓</span>
                <span>This is a FREE Business</span>
              </div>
            )}
          </div>

          <div className={cx("success-message")}>
            {successData.isPaid
              ? "Your paid business listing is now live and will be highlighted in search results."
              : "Your free business listing is now live in the directory."}
          </div>

          <div className={cx("success-business-id")}>
            <small>Business ID: {successData.businessId}</small>
          </div>

          <button
            type="button"
            onClick={handleSuccessReset}
            className={cx("success-reset-button")}
          >
            Go to Directory
          </button>
        </div>
      </div>
    )}

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
              {total || rows.length} businesses
            </Typography>
            <button
              className={cx("export-btn")}
              onClick={handleExportBusinessData}
              disabled={exportLoading}
            >
              <svg
                fill="#fff"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 50 50"
              >
                <path d="M28.8125 .03125L.8125 5.34375C.339844 5.433594 0 5.863281 0 6.34375L0 43.65625C0 44.136719 .339844 44.566406 .8125 44.65625L28.8125 49.96875C28.875 49.980469 28.9375 50 29 50C29.230469 50 29.445313 49.929688 29.625 49.78125C29.855469 49.589844 30 49.296875 30 49L30 1C30 .703125 29.855469 .410156 29.625 .21875C29.394531 .0273438 29.105469 -.0234375 28.8125 .03125ZM32 6L32 13L34 13L34 15L32 15L32 20L34 20L34 22L32 22L32 27L34 27L34 29L32 29L32 35L34 35L34 37L32 37L32 44L47 44C48.101563 44 49 43.101563 49 42L49 8C49 6.898438 48.101563 6 47 6ZM36 13L44 13L44 15L36 15ZM6.6875 15.6875L11.8125 15.6875L14.5 21.28125C14.710938 21.722656 14.898438 22.265625 15.0625 22.875L15.09375 22.875C15.199219 22.511719 15.402344 21.941406 15.6875 21.21875L18.65625 15.6875L23.34375 15.6875L17.75 24.9375L23.5 34.375L18.53125 34.375L15.28125 28.28125C15.160156 28.054688 15.035156 27.636719 14.90625 27.03125L14.875 27.03125C14.8125 27.316406 14.664063 27.761719 14.4375 28.34375L11.1875 34.375L6.1875 34.375L12.15625 25.03125ZM36 20L44 20L44 22L36 22ZM36 27L44 27L44 29L36 29ZM36 35L44 35L44 37L36 37Z"></path>
              </svg>
              <span>{exportLoading ? "Exporting..." : "Export"}</span>
            </button>
            <button
              className={cx("gmaps-btn")}
              onClick={() => navigate('/dashboard/gmaps-leads')}
            >
              <TravelExploreIcon sx={{ fontSize: "1rem" }} />
              <span>GMaps Leads</span>
            </button>
          </Box>
        </div>

        <Box sx={{ width: "100%" }}>
          <CustomizedTable
            key={tableRefreshKey}
            data={filteredRows}
            total={total || filteredRows.length}
            columns={businessListTable}
            fetchData={(pageNo, pageSize, options = {}) => {
              const f = { ...appliedFiltersRef.current };
              if (options.search !== undefined) {
                f.searchTerm = options.search;
              }
              dispatchFetch(f, pageNo, pageSize, options.sortBy || null, options.sortOrder || "desc");
            }}
          />
        </Box>
      </div>
    </>}

    {/* Business Detail Drawer */}
    <Dialog
      open={Boolean(detailRow)}
      onClose={() => setDetailRow(null)}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: "95vh", bgcolor: "#ffffff" } }}
    >
      {detailRow && (() => {
        const row = detailRow;
        const isPaid = Boolean(row.amountPaid);
        const paidDateValue = row.paidDate?.$date ? row.paidDate.$date : row.paidDate;
        const formattedDate = paidDateValue ? new Date(paidDateValue).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true
        }) : null;
        const lastDownload = row.qrDownloads?.length > 0
          ? new Date(row.qrDownloads[row.qrDownloads.length - 1].downloadedAt).toLocaleString()
          : "Never";
        const categoryGroups = Array.isArray(row.mniDetails)
          ? row.mniDetails.map(i => i?.categoryGroup).filter(Boolean).join(", ") || "—"
          : "—";
        const socialLinks = [
          { label: "Website", value: row.website },
          { label: "Google Map", value: row.googleMap },
          { label: "Facebook", value: row.facebook },
          { label: "Instagram", value: row.instagram },
          { label: "YouTube", value: row.youtube },
          { label: "Pinterest", value: row.pinterest },
          { label: "Twitter / X", value: row.twitter },
          { label: "LinkedIn", value: row.linkedin },
        ].filter(s => s.value && s.value !== "-");
        const keywords = Array.isArray(row.keywords)
          ? row.keywords.map(k => typeof k === "string" ? k.trim() : k?.keyword || k).filter(Boolean)
          : String(row.keywords || "").split(",").map(k => k.trim()).filter(Boolean);
        const certificateGeneratedAtValue = row.certificates?.generatedAt?.$date || row.certificates?.generatedAt;
        const formattedCertificateDate = certificateGeneratedAtValue ? new Date(certificateGeneratedAtValue).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true
        }) : null;
        const certificateLinks = [
          row.certificates?.verifiedCertificateUrl && {
            label: "Verified Certificate",
            url: row.certificates.verifiedCertificateUrl,
            type: "verified"
          },
          row.certificates?.trustCertificateUrl && {
            label: "Trust Certificate",
            url: row.certificates.trustCertificateUrl,
            type: "trust"
          }
        ].filter(Boolean);

        const handleDownloadQR = async () => {
          try {
            const link = document.createElement("a");
            link.href = row.qrImage;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await dispatch(trackQrDownload(row._id));
            enqueueSnackbar("QR downloaded", { variant: "success" });
          } catch {
            enqueueSnackbar("Download failed", { variant: "error" });
          }
        };
        const handleMarkPaid = async () => {
          if (markingPaidId) return;
          setMarkingPaidId(row._id);
          try {
            await dispatch(editBusinessList(row._id, {
              name: row.businessName, businessName: row.businessName,
              category: row.category, location: row.location,
              payment: [{ amount: row?.subscription?.price || PREMIUM_MEMBERSHIP_BASE_AMOUNT }]
            }));
            enqueueSnackbar(`${row.businessName} marked as paid`, { variant: "success" });
            dispatch(getAllBusinessList());
            setDetailRow(null);
          } catch {
            enqueueSnackbar("Payment failed", { variant: "error" });
          } finally {
            setMarkingPaidId(null);
          }
        };

        const SLabel = ({ children }) => (
          <Typography sx={{ fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.2px", color: "#64748b", mb: 1.6, display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: "3px", height: "3px", borderRadius: "50%", bgcolor: "#ff8c00" }} />
            {children}
          </Typography>
        );
        const DRow = ({ label, value }) => (
          !value || value === "-" ? null :
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", py: 1.1, paddingBottom: 1.1 }}>
            <Typography sx={{ fontSize: "0.92rem", color: "#64748b", fontWeight: 600, flexShrink: 0, mr: 3 }}>{label}</Typography>
            <Typography sx={{ fontSize: "0.92rem", color: "#0f172a", fontWeight: 600, textAlign: "right", wordBreak: "break-word", maxWidth: "50%" }}>{value}</Typography>
          </Box>
        );

        return (
          <>
            {/* Business Info Header - Polished */}
            <Box sx={{ p: 4.5, bgcolor: "#ffffff", borderBottom: "1px solid #e8ecf1" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.55rem", color: "#0f172a", mb: 0.6, letterSpacing: "-0.5px" }}>
                    {row.businessName || "—"}
                  </Typography>
                  <Typography sx={{ fontSize: "0.92rem", color: "#64748b", fontWeight: 500 }}>
                    ID: {row.clientId}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setDetailRow(null)} sx={{ mt: -1 }}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Badges Row */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2.5 }}>
                {row.verification?.isVerified && (
                  <Box sx={{
                    px: 2, py: 0.7, borderRadius: "12px",
                    bgcolor: "#ecf0ff", color: "#3b5bdb",
                    fontSize: "0.8rem", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 0.5
                  }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: "1rem" }} /> Verified
                  </Box>
                )}
                {row.badges?.isFeatured && (
                  <Box sx={{ px: 2, py: 0.7, borderRadius: "12px", bgcolor: "#fff8e1", color: "#b8860b", fontSize: "0.8rem", fontWeight: 700 }}>
                    ★ Featured
                  </Box>
                )}
                {row.badges?.isSponsored && (
                  <Box sx={{ px: 2, py: 0.7, borderRadius: "12px", bgcolor: "#f3e8ff", color: "#7c3aed", fontSize: "0.8rem", fontWeight: 700 }}>
                    Sponsored
                  </Box>
                )}
                {row.badges?.isTrending && (
                  <Box sx={{ px: 2, py: 0.7, borderRadius: "12px", bgcolor: "#fef2f2", color: "#c41e3a", fontSize: "0.8rem", fontWeight: 700 }}>
                    🔥 Trending
                  </Box>
                )}
              </Box>
            </Box>

            {/* Scrollable Details */}
            <Box sx={{ maxHeight: 500, overflowY: "auto", p: 0, display: "flex", flexDirection: "column", bgcolor: "#ffffff" }}>
              <Box sx={{ p: 4.5, display: "flex", flexDirection: "column", gap: 3.5 }}>

                {/* Contact Section */}
                <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                  <SLabel>Contact Information</SLabel>
                  <DRow label="Email" value={row.email} />
                  <DRow label="Phone" value={row.contact} />
                  <DRow label="WhatsApp" value={row.whatsappNumber} />
                  <DRow label="Created By" value={getCreatedByDisplayName(row.createdBy)} />
                </Box>

                {/* Address Section */}
                <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                  <SLabel>Address Details</SLabel>
                  <DRow label="Location" value={row.location} />
                  <DRow label="Plot / Street" value={[row.plotNumber, row.street].filter(v => v && v !== "-").join(", ") || null} />
                  <DRow label="Pincode" value={row.pincode} />
                  <DRow label="Full Address" value={row.globalAddress} />
                </Box>

                {/* Business Info Section */}
                <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                  <SLabel>Business Information</SLabel>
                  <DRow label="Category" value={row.category} />
                  <DRow label="Category Group" value={categoryGroups} />
                  <DRow label="GSTIN" value={row.gstin} />
                  <DRow label="Experience" value={row.experience} />
                  {row.description && row.description !== "-" && (
                    <Box sx={{ py: 1.2, borderTop: "1px solid #e8ecf1", mt: 1 }}>
                      <Typography sx={{ fontSize: "0.92rem", color: "#64748b", fontWeight: 600, mb: 0.8 }}>Description</Typography>
                      <Typography sx={{ fontSize: "0.92rem", color: "#0f172a", lineHeight: 1.8, fontWeight: 500 }}>{row.description}</Typography>
                    </Box>
                  )}
                </Box>

                {/* Web & Social Section */}
                {socialLinks.length > 0 && (
                  <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                    <SLabel>Web & Social</SLabel>
                    {socialLinks.map(({ label, value }) => <DRow key={label} label={label} value={value} />)}
                  </Box>
                )}

                {/* SEO Section */}
                {(row.seoTitle || row.title || row.slug || keywords.length > 0) && (
                  <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                    <SLabel>SEO Details</SLabel>
                    <DRow label="Display Title" value={row.title} />
                    <DRow label="SEO Title" value={row.seoTitle} />
                    <DRow label="Slug" value={row.slug} />
                    <DRow label="SEO Description" value={row.seoDescription} />
                    {keywords.length > 0 && (
                      <Box sx={{ py: 1.2, borderTop: "1px solid #e8ecf1", mt: 1 }}>
                        <Typography sx={{ fontSize: "0.92rem", color: "#64748b", fontWeight: 600, mb: 1 }}>Keywords</Typography>
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                          {keywords.slice(0, 12).map((kw, i) => (
                            <Box key={i} sx={{ px: 1.4, py: 0.5, borderRadius: "10px", bgcolor: "#f1f5f9", fontSize: "0.85rem", color: "#334155", fontWeight: 600, border: "1px solid #e2e8f0" }}>
                              {kw}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}

                {(row.verification?.isVerified || row.badges?.isTrust || certificateLinks.length > 0) && (
                  <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                    <SLabel>Certificates</SLabel>
                    <DRow label="Verified" value={row.verification?.isVerified ? "Active" : null} />
                    <DRow label="Trust" value={row.badges?.isTrust ? "Active" : null} />
                    <DRow label="Generated" value={formattedCertificateDate} />
                    {certificateLinks.length > 0 && (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.2 }}>
                        {certificateLinks.map(certificate => (
                          <Button
                            key={certificate.label}
                            size="small"
                            variant="outlined"
                            endIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                            onClick={() => downloadBusinessDocument({
                              businessId: row._id,
                              type: certificate.type,
                              name: certificate.label,
                              fallbackUrl: certificate.url
                            })}
                            sx={{ textTransform: "none", borderColor: "#ddd6fe", color: "#6d28d9", fontWeight: 700, "&:hover": { bgcolor: "#f5f3ff", borderColor: "#c4b5fd" } }}
                          >
                            {certificate.label}
                          </Button>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Payment Section */}
                <Box sx={{ pb: 2.5, borderBottom: "1px solid #e8ecf1" }}>
                  <SLabel>Payment Status</SLabel>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
                    <Box sx={{
                      display: "inline-flex", alignItems: "center", px: 2, py: 0.75,
                      borderRadius: "20px", fontSize: "0.9rem", fontWeight: 700,
                      bgcolor: isPaid ? "#d1fae5" : "#fef3c7",
                      color: isPaid ? "#065f46" : "#92400e"
                    }}>
                      {isPaid ? "✓ Paid" : "⏳ Pending"}
                    </Box>
                    {!isPaid && (
                      <Button size="small" variant="contained" onClick={handleMarkPaid}
                        disabled={markingPaidId === row._id}
                        startIcon={markingPaidId === row._id ? <CircularProgress size={15} sx={{ color: "#ffffff" }} /> : null}
                        sx={{ bgcolor: "#ff8c00", "&:hover": { bgcolor: "#d97800" }, "&.Mui-disabled": { bgcolor: "#ffb866", color: "#ffffff" }, fontSize: "0.9rem", textTransform: "none", py: 0.7, px: 2.5, fontWeight: 600 }}>
                        {markingPaidId === row._id ? "Processing..." : "Mark as Paid"}
                      </Button>
                    )}
                  </Box>
                  {formattedDate && <Typography sx={{ fontSize: "0.85rem", color: "#64748b", mt: 1.2, fontWeight: 500 }}>Paid on {formattedDate}</Typography>}
                </Box>

                {/* QR Section */}
                {row.qrImage && (
                  <Box>
                    <SLabel>QR Code</SLabel>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3, p: 2.5, bgcolor: "#f8f9fa", borderRadius: "12px" }}>
                      <Avatar src={row.qrImage} variant="square" sx={{ width: 90, height: 90, borderRadius: 1.2, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                      <Box>
                        <Typography sx={{ fontSize: "0.85rem", color: "#64748b", mb: 1.2, fontWeight: 500 }}>Last downloaded: {lastDownload}</Typography>
                        <Button size="medium" variant="outlined" onClick={handleDownloadQR}
                          sx={{ fontSize: "0.9rem", textTransform: "none", borderColor: "#ff8c00", color: "#ff8c00", fontWeight: 600, "&:hover": { borderColor: "#d97800", bgcolor: "#fff8f1" }, py: 0.7 }}>
                          Download QR
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Actions Footer - Polished */}
            <Box sx={{
              p: 4,
              bgcolor: "#ffffff",
              borderTop: "1px solid #e8ecf1",
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap"
            }}>
              <Button
                size="large"
                variant="outlined"
                startIcon={<EditOutlined />}
                onClick={() => { setDetailRow(null); handleEdit(row); }}
                sx={{
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  flex: 1,
                  minWidth: "120px",
                  py: 1.2,
                  borderColor: "#e8ecf1",
                  color: "#0f172a",
                  "&:hover": { bgcolor: "#f8f9fa", borderColor: "#cbd5e1" }
                }}
              >
                Edit
              </Button>
              <Button
                size="large"
                variant="outlined"
                startIcon={<CollectionsBookmarkOutlinedIcon fontSize="small" />}
                onClick={() => { setDetailRow(null); handleOpenGallery(row._id); }}
                sx={{
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  flex: 1,
                  minWidth: "120px",
                  py: 1.2,
                  borderColor: "#e8ecf1",
                  color: "#0f172a",
                  "&:hover": { bgcolor: "#f8f9fa", borderColor: "#cbd5e1" }
                }}
              >
                Gallery
              </Button>
              <Button
                size="large"
                variant="outlined"
                startIcon={<DescriptionOutlinedIcon fontSize="small" />}
                onClick={() => { setDetailRow(null); handleOpenDocuments(row); }}
                sx={{
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  flex: 1,
                  minWidth: "120px",
                  py: 1.2,
                  borderColor: "#e8ecf1",
                  color: "#0f172a",
                  "&:hover": { bgcolor: "#f8f9fa", borderColor: "#cbd5e1" }
                }}
              >
                Docs
              </Button>
              {canRegenerateCertificates(row) && (
                <Button
                  size="large"
                  variant="outlined"
                  startIcon={certificateRegeneratingId === row._id ? <CircularProgress size={17} /> : <AutorenewRoundedIcon fontSize="small" />}
                  onClick={() => handleRegenerateCertificates(row)}
                  disabled={certificateRegeneratingId === row._id}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    flex: 1,
                    minWidth: "150px",
                    py: 1.2,
                    borderColor: "#ddd6fe",
                    color: "#6d28d9",
                    "&:hover": { bgcolor: "#f5f3ff", borderColor: "#c4b5fd" }
                  }}
                >
                  {certificateRegeneratingId === row._id ? "Regenerating" : "Regenerate Verified/Trust"}
                </Button>
              )}
              <Button
                size="large"
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlined />}
                onClick={() => { setDetailRow(null); handleDelete(row); }}
                sx={{
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  flex: 1,
                  minWidth: "120px",
                  py: 1.2,
                  "&:hover": { bgcolor: "#fef2f2" }
                }}
              >
                Delete
              </Button>
            </Box>
          </>
        );
      })()}
    </Dialog>

    <Dialog
      open={certificateTraceDialog.open}
      onClose={() => setCertificateTraceDialog(prev => ({ ...prev, open: false }))}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ borderBottom: "1px solid #eef2f7" }}>
        Certificate regenerate trace
        <Typography variant="body2" sx={{ mt: 0.5, color: "#64748b" }}>
          {certificateTraceDialog.businessName || "Business"} - verified/trust only
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "190px 1fr", bgcolor: "#f8fafc" }}>
          {certificateTraceDialog.items.map(item => (
            <React.Fragment key={item.label}>
              <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid #e2e8f0", fontWeight: 800, color: "#334155" }}>
                {item.label}
              </Box>
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderBottom: "1px solid #e2e8f0",
                  bgcolor: "#fff",
                  color: "#0f172a",
                  overflowWrap: "anywhere",
                  fontFamily: item.label.includes("key") || item.label.includes("URL") ? "monospace" : "inherit"
                }}
              >
                {formatTraceValue(item.value)}
              </Box>
            </React.Fragment>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={() => setCertificateTraceDialog(prev => ({ ...prev, open: false }))}>
          Close
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={documentsDialog.open}
      onClose={handleCloseDocuments}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: "#ffffff" } }}
    >
      {(() => {
        const rawDocuments = documentsDialog.data?.kycDocuments;
        const kycDocuments = (Array.isArray(rawDocuments)
          ? rawDocuments
          : rawDocuments ? [rawDocuments] : [])
          .map((documentItem, index) => ({
            url: getBusinessDocumentUrl(documentItem),
            name: getBusinessDocumentName(documentItem, index),
            kind: "KYC",
            downloadType: "kyc",
            downloadIndex: index
          }))
          .filter(documentItem => documentItem.url);
        const certificateDocuments = [
          documentsDialog.data?.certificates?.verifiedCertificateUrl && {
            url: documentsDialog.data.certificates.verifiedCertificateUrl,
            name: "Verified Certificate",
            kind: "CERT",
            certificateType: "verified",
            downloadType: "verified"
          },
          documentsDialog.data?.certificates?.trustCertificateUrl && {
            url: documentsDialog.data.certificates.trustCertificateUrl,
            name: "Trust Certificate",
            kind: "CERT",
            certificateType: "trust",
            downloadType: "trust"
          }
        ].filter(Boolean);
        const documents = [...certificateDocuments, ...kycDocuments];

        const handleDownloadDocument = async documentItem => downloadBusinessDocument({
          businessId: documentsDialog.data?._id,
          type: documentItem.downloadType,
          index: documentItem.downloadIndex,
          name: documentItem.name,
          fallbackUrl: documentItem.url
        });

        return (
          <>
            <DialogTitle sx={{ borderBottom: "1px solid #eef2f7", pr: 6, position: "relative" }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem" }}>
                  Business Documents
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.4 }}>
                  {documentsDialog.data?.businessName || "Business"} • {documents.length} document{documents.length === 1 ? "" : "s"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={handleCloseDocuments}
                sx={{ position: "absolute", top: 14, right: 14 }}
                aria-label="Close documents"
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 3, bgcolor: "#f8fafc" }}>
              {documents.length === 0 ? (
                <Box sx={{
                  minHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: 1,
                  color: "#64748b",
                  bgcolor: "#ffffff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 2
                }}>
                  <DescriptionOutlinedIcon sx={{ fontSize: 42, color: "#94a3b8" }} />
                  <Typography sx={{ fontWeight: 800, color: "#334155" }}>No documents uploaded</Typography>
                  <Typography sx={{ fontSize: "0.9rem" }}>
                    Add KYC documents from the business edit form.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 2 }}>
                  {documents.map((documentItem, index) => {
                    const { url, name, kind } = documentItem;
                    const isImage = isPreviewableBusinessDocumentImage(url);
                    const isPdf = isBusinessPdfDocument(url);
                    const isCertificate = kind === "CERT";

                    return (
                      <Box
                        key={`${url}-${index}`}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.25,
                          p: 1.5,
                          bgcolor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 2,
                          minHeight: isCertificate ? 390 : 300,
                          boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)"
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                          <Box sx={{
                            width: isCertificate ? 42 : 32,
                            height: 24,
                            borderRadius: 1,
                            bgcolor: isCertificate ? "#f5f3ff" : isPdf ? "#fef2f2" : isImage ? "#ecfdf5" : "#eff6ff",
                            color: isCertificate ? "#6d28d9" : isPdf ? "#b91c1c" : isImage ? "#047857" : "#2563eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.66rem",
                            fontWeight: 900,
                            flex: "0 0 auto",
                            letterSpacing: 0
                          }}>
                            {isCertificate ? "CERT" : isPdf ? "PDF" : isImage ? "IMG" : "DOC"}
                          </Box>
                          <Typography title={name} sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.86rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {name}
                          </Typography>
                        </Box>

                        <Box sx={{
                          height: isCertificate ? 280 : 190,
                          border: "1px solid #e2e8f0",
                          borderRadius: 1.5,
                          overflow: "hidden",
                          bgcolor: "#f8fafc",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {isImage ? (
                            <img
                              src={url}
                              alt={name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : isPdf ? (
                            <iframe
                              src={url}
                              title={name}
                              style={{ width: "100%", height: "100%", border: 0, display: "block" }}
                            />
                          ) : (
                            <Box sx={{ textAlign: "center", color: "#64748b", px: 2 }}>
                              <DescriptionOutlinedIcon sx={{ fontSize: 34, color: "#94a3b8", mb: 1 }} />
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>
                                Preview not available
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        <Box sx={{ mt: "auto", display: "flex", gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            endIcon={<OpenInNewRoundedIcon fontSize="small" />}
                            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                            sx={{
                              textTransform: "none",
                              borderColor: "#0f766e",
                              color: "#0f766e",
                              fontWeight: 700,
                              "&:hover": { borderColor: "#0d5f59", bgcolor: "#ecfdf5" }
                            }}
                          >
                            Open
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            fullWidth
                            disableElevation
                            endIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                            onClick={() => handleDownloadDocument(documentItem)}
                            sx={{
                              textTransform: "none",
                              bgcolor: "#0f766e",
                              fontWeight: 700,
                              "&:hover": { bgcolor: "#0d5f59" }
                            }}
                          >
                            Download
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={handleCloseDocuments} color="secondary">
                Close
              </Button>
            </DialogActions>
          </>
        );
      })()}
    </Dialog>

    {/* Image Modal */}
    <Dialog
      open={imageModalOpen}
      onClose={() => {
        setImageModalOpen(false);
        setSelectedImageUrl(null);
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2, bgcolor: "#ffffff" } }}
    >
      <Box sx={{ position: "relative", bgcolor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 500 }}>
        {selectedImageUrl ? (
          <img
            src={selectedImageUrl}
            alt="Business Image"
            style={{
              maxWidth: "100%",
              maxHeight: "600px",
              objectFit: "contain",
              padding: "20px"
            }}
          />
        ) : (
          <Typography sx={{ fontSize: "1rem", color: "#9ca3af" }}>No image available</Typography>
        )}
        <IconButton
          size="medium"
          onClick={() => {
            setImageModalOpen(false);
            setSelectedImageUrl(null);
          }}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            bgcolor: "rgba(255, 255, 255, 0.95)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            "&:hover": { bgcolor: "#ffffff", boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)" }
          }}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Box>
    </Dialog>

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

    {/* Logo Cropper Modal */}
    <LogoCropperModal
      open={logoCropperOpen}
      image={logoCropData.image}
      onClose={() => setLogoCropperOpen(false)}
      onSave={handleLogoCropSave}
      isLoading={loading}
    />
  </div>;
});
export default BusinessList;
