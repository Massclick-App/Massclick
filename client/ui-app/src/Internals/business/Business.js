import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllBusinessList, createBusinessList, editBusinessList, deleteBusinessList, trackQrDownload } from "../../redux/actions/businessListAction";
import { getAllLocation } from "../../redux/actions/locationAction";
import { createCategory, editCategory, getAllCategory, businessCategorySearch } from "../../redux/actions/categoryAction";
import { getAllUsersClient, getUserClientSuggestion } from "../../redux/actions/userClientAction.js";
import { getAllUsers } from "../../redux/actions/userAction.js";
import CustomizedDataGrid from "../../components/CustomizedDataGrid";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import './business.css'
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import DetailsIcon from '@mui/icons-material/Details';
import PrivacyTipIcon from '@mui/icons-material/PrivacyTip';
import CategoryIcon from '@mui/icons-material/Category';
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import { Payment as PaymentIcon, CheckCircle, HourglassEmpty, Cancel } from "@mui/icons-material";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Avatar,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // Stepper Imports:
  Stack,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  Chip,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import {
  FormControl,
} from "@mui/material";
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


const ORANGE_PRIMARY = '#FF8C00';
const ORANGE_HOVER = '#D97800';

const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        `linear-gradient( 95deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage:
        `linear-gradient( 95deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: '#eaeaf0',
    borderRadius: 1,
  },
}));

const ColorlibStepIconRoot = styled('div')(({ theme, ownerState }) => ({
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
    backgroundImage:
      `linear-gradient( 136deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`,
    boxShadow: '0 4px 10px 0 rgba(255, 140, 0, 0.4)',
  }),
  ...(ownerState.completed && {
    backgroundImage:
      `linear-gradient( 136deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_HOVER} 50%, #FFB643 100%)`,
  }),
}));

function ColorlibStepIcon(props) {
  const { active, completed, className } = props;

  const icons = {
    1: <BusinessCenterIcon />,
    2: <CategoryIcon />,
    3: <PrivacyTipIcon />,
    4: <VerifiedUserIcon />,
  };
  return (
    <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
      {icons[String(props.icon)]}
    </ColorlibStepIconRoot>
  );
}

ColorlibStepIcon.propTypes = {
  active: PropTypes.bool,
  className: PropTypes.string,
  completed: PropTypes.bool,
  icon: PropTypes.node,
};

const steps = [
  "Business Details",
  "Category",
  "Privacy Settings",
  "Payment"
];


export default function BusinessList() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { businessList = [], total = 0, loading, error } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const { searchSuggestion = [] } = useSelector(
    (state) => state.userClientReducer || {}
  );
  const [showCategorySuggest, setShowCategorySuggest] = useState(false);
  const { searchCategory } = useSelector((state) => state.categoryReducer);
  const [categorySelected, setCategorySelected] = useState(false);

  const { users = [] } = useSelector((state) => state.userReducer || {});

  // const { location = [] } = useSelector((state) => state.locationReducer || {});
  const { category = [] } = useSelector((state) => state.categoryReducer || {});
  const fileInputRef = useRef();

  const [businessvalue, setBusinessValue] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [newGalleryImages, setNewGalleryImages] = useState([]);
  const [createdBusinessId, setCreatedBusinessId] = useState(null);
  const [createUserId, setCreateUserId] = useState(null)
  const [galleryDialog, setGalleryDialog] = useState({
    open: false,
    data: null,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputKeyword, setInputKeyword] = useState("");

  const handlePayNow = (row) => {
    const amount = 1;

    let businessId =
      row?._id?.$oid || row?._id || row?.businessId || row?.id || createdBusinessId;
    let userId =
      row?.createdBy?.$oid ||
      (typeof row?.createdBy === "string" ? row.createdBy : null) ||
      createUserId;

    if (!row) {
      businessId = createdBusinessId;
      userId = createUserId;
    }

    if (!businessId || !userId) {
      console.error("❌ Missing businessId or userId:", { businessId, userId });
      return;
    }

    dispatch(createPhonePePayment(amount, userId, businessId));
  };

  const [activeStep, setActiveStep] = useState(0);
  const [kycFiles, setKycFiles] = useState([]);

  const handleKycUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((f) => f instanceof File);

    const newFiles = validFiles.map((file) => {
      file.preview = URL.createObjectURL(file);
      return file;
    });

    setKycFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index) => {
    setKycFiles((prevFiles) => {
      const updatedFiles = [...prevFiles];
      URL.revokeObjectURL(updatedFiles[index].preview);
      updatedFiles.splice(index, 1);
      return updatedFiles;
    });
  };

  const FIELD_LABELS = {
    clientId: "Client ID",
    businessName: "Business Name",
    experience: "Experience",
    location: "Location",
    category: "Category",
  };

  const validateStep = (step) => {
    let newErrors = {};

    if (step === 0) {
      if (!formData.clientId) newErrors.clientId = "Client ID is required";
      if (!formData.businessName) newErrors.businessName = "Business Name is required";
      if (!formData.experience) newErrors.experience = "Experience is required";
      if (!formData.location) newErrors.location = "Location is required";
    }

    if (step === 2) {
      if (!formData.category) newErrors.category = "Category is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const missingFields = Object.keys(newErrors)
        .map((key) => FIELD_LABELS[key] || key)
        .join(", ");

      enqueueSnackbar(
        `Please fill required fields: ${missingFields}`,
        {
          variant: "error",
          autoHideDuration: 4000,
        }
      );

      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }

    return true;
  };



  const handleNext = () => {
    if (!validateStep(activeStep)) return;

    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGalleryImageChange = (e) => {
    const files = Array.from(e.target.files);
    const readers = files.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((images) => {
      setNewGalleryImages((prev) => [...prev, ...images]);
    });
  };
  const handleUploadGalleryImages = async () => {
    if (!galleryDialog.data?._id) return;

    try {
      const uploadPayload = {
        businessImages: newGalleryImages.length > 0 ? newGalleryImages : null,
      };

      const updatedBusiness = await dispatch(
        editBusinessList(galleryDialog.data._id, uploadPayload)
      );

      setGalleryDialog((prev) => ({
        ...prev,
        data: { ...prev.data, businessImages: updatedBusiness.businessImages },
      }));

      setNewGalleryImages([]);
      handleCloseGallery();
      await dispatch(getAllBusinessList());
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  const fieldsToCheck = [
    "keywords",
    "slug",
    "seoTitle",
    "seoDescription",
    "title",
    "description",
  ];

  const getUpdatedCategoryFields = (existing, current) => {
    const updates = {};

    fieldsToCheck.forEach((field) => {
      if (Array.isArray(current[field])) {
        const newValues = current[field]
          .map(k => k.trim().toLowerCase())
          .filter(k => !existing[field]?.map(e => e.trim().toLowerCase()).includes(k));


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

  const defaultOpeningHours = [
    { day: "Monday", open: "", close: "", isClosed: false, is24Hours: false },
    { day: "Tuesday", open: "", close: "", isClosed: false, is24Hours: false },
    { day: "Wednesday", open: "", close: "", isClosed: false, is24Hours: false },
    { day: "Thursday", open: "", close: "", isClosed: false, is24Hours: false },
    { day: "Friday", open: "", close: "", isClosed: false, is24Hours: false },
    { day: "Saturday", open: "", close: "", isClosed: false, is24Hours: false },
    { day: "Sunday", open: "", close: "", isClosed: false, is24Hours: false },
  ];

  const handleOpenGallery = (rowId) => {
    const business = businessList.find((b) => b._id === rowId);

    if (business) {
      setGalleryDialog({ open: true, data: business });
      setNewGalleryImages([]);
    } else {
      console.error("Business not found in Redux store");
    }
  };


  const handleCloseGallery = () => {
    setGalleryDialog({ open: false, data: null });
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

  });

  const [preview, setPreview] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
  });

  const modules = {
    toolbar: [
      [{ 'header': '1' }, { 'header': '2' }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ],
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "link",
    "image",
    "video",
  ];
  const validateForm = () => {
    let newErrors = {};

    if (!formData.clientId) newErrors.clientId = "Client ID is required";
    if (!formData.businessName) newErrors.businessName = "Business Name is required";
    if (!formData.experience) newErrors.experience = "Experience is required";
    if (!formData.location) newErrors.location = "Location is required";
    if (!formData.category) newErrors.category = "Category is required";

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (formData.contact && !/^\d{10}$/.test(formData.contact)) {
      newErrors.contact = "Contact should be 10 digits";
    }

    if (formData.whatsappNumber && !/^\d{10}$/.test(formData.whatsappNumber)) {
      newErrors.whatsappNumber = "Whatsapp number should be 10 digits";
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode should be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBusinessChange = (content) => {
    setBusinessValue(content);
    setFormData((prev) => ({ ...prev, businessDetails: content }));
  };

  const handleOpeningHourChange = (index, field, value) => {
    setFormData((prev) => {
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

      return { ...prev, openingHours: updatedHours };
    });
  };

  useEffect(() => {
    dispatch(getAllBusinessList());
    dispatch(getAllLocation());
    dispatch(businessCategorySearch())
    dispatch(getAllUsersClient())
    dispatch(getAllUsers())
    dispatch(checkPhonePeStatus());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      const selected = category.find((cat) => cat.category === value);
      setFormData((prev) => ({
        ...prev,
        category: value,
        keywords: selected?.keywords || [],
        slug: selected?.slug || "",
        seoTitle: selected?.seoTitle || "",
        seoDescription: selected?.seoDescription || "",
        title: selected?.title || "",
        description: selected?.description || "",
      }));

      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };


  const handleEdit = (row) => {
    setEditMode(true);
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
      openingHours: row.openingHours?.length
        ? row.openingHours
        : defaultOpeningHours,
      kycDocuments: row.kycDocuments || [],
    });
    setBusinessValue(row.businessDetails || "");
    setPreview(row.bannerImage || null);
    setActiveStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (row) => {
    setDeleteDialog({ open: true, id: row.id, name: row.businessName });
  };
  const confirmDelete = () => {
    if (deleteDialog.id) {
      dispatch(deleteBusinessList(deleteDialog.id)).then(() => {
        dispatch(getAllBusinessList());
      });
    }
    setDeleteDialog({ open: false, id: null, name: "" });
  };
  const resetForm = () => {
    setFormData({
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
      keywords: "",
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
      openingHours: defaultOpeningHours,
      kycDocuments: "",
    });
    setBusinessValue("");
    setPreview(null);
    setEditMode(false);
    setEditId(null);
    setActiveStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, bannerImage: reader.result }));
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validateForm()) return;

  //   const kycBase64 = await Promise.all(
  //     kycFiles.map(
  //       (file) =>
  //         new Promise((resolve, reject) => {
  //           const reader = new FileReader();
  //           reader.onload = () => resolve(reader.result);
  //           reader.onerror = reject;
  //           reader.readAsDataURL(file);
  //         })
  //     )
  //   );

  //   const payload = {
  //     ...formData,
  //     businessDetails: businessvalue,
  //     kycDocuments: kycBase64
  //   };

  //   if (editMode && editId) {
  //     dispatch(editBusinessList(editId, payload))
  //       .then(() => {
  //         enqueueSnackbar(`${formData.businessName} updated successfully!`, { variant: 'success' });
  //         resetForm();
  //         dispatch(getAllBusinessList());
  //         setActiveStep(3);
  //       })
  //       .catch((err) => console.error("Edit failed:", err));
  //   } else {
  //     dispatch(createBusinessList(payload))
  //       .then(() => {
  //         enqueueSnackbar(`${formData.businessName} created successfully!`, { variant: 'success' });
  //         resetForm();
  //         dispatch(getAllBusinessList());
  //         setActiveStep(3);
  //       })
  //       .catch((err) => console.error("Create failed:", err));
  //   }
  // };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      enqueueSnackbar("Please fill all required required fields before proceeding.", {
        variant: "error",
        autoHideDuration: 3000,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const kycBase64 = await Promise.all(
      kycFiles.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    const existingCategory = category.find(
      (cat) =>
        String(cat.category || "").toLowerCase() === String(formData.category || "").toLowerCase()
    );

    if (existingCategory) {
      const updates = getUpdatedCategoryFields(existingCategory, formData);

      if (Object.keys(updates).length > 0) {
        await dispatch(
          editCategory(existingCategory._id, updates)
        );
      }
    } else {
      await dispatch(
        createCategory({
          category: formData.category,
          keywords: formData.keywords || [],
          slug: formData.slug || "",
          seoTitle: formData.seoTitle || "",
          seoDescription: formData.seoDescription || "",
          title: formData.title || "",
          description: formData.description || "",
        })
      );
    }
    const payload = {
      ...formData,
      businessDetails: businessvalue,
      kycDocuments: kycBase64,
    };

    try {
      let response;

      if (editMode && editId) {
        response = await dispatch(editBusinessList(editId, payload));
        enqueueSnackbar(`${formData.businessName} updated successfully!`, {
          variant: "success",
        });
      } else {
        response = await dispatch(createBusinessList(payload));

        const businessId =
          response?.data?._id ||
          response?._id ||
          response?.payload?._id ||
          response?.payload?.data?._id;

        const userId =
          response?.data?.createdBy ||
          response?.createdBy ||
          response?.payload?.createdBy ||
          response?.payload?.data?.createdBy;

        if (businessId) {
          setCreatedBusinessId(businessId);
        }
        if (userId) {
          setCreateUserId(userId)
        }
        enqueueSnackbar(`${formData.businessName} created successfully!`, {
          variant: "success",
        });
      }

      dispatch(getAllBusinessList());
      setActiveStep(3);
    } catch (err) {
      console.error("Error saving business:", err);
    }
  };

  const rows = businessList
    .filter((c) => c.isActive)
    .map((bl, index) => ({
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
      website: bl.website || "-",
      facebook: bl.facebook || "-",
      instagram: bl.instagram || "-",
      youtube: bl.youtube || "-",
      pinterest: bl.pinterest || "-",
      twitter: bl.twitter || "-",
      linkedin: bl.linkedin || "-",
      businessDetails: bl.businessDetails || "-",
      openingHours: bl.openingHours || defaultOpeningHours,
      createdBy: bl.createdBy,
      payment: bl.payment || [],
      qrImage: bl.qrCode?.qrImage || null,
      qrImage: bl.qrCode?.qrImage || null,
      qrDownloads: bl.qrDownloads || [],

    }));

  const businessListTable = [
    { id: "clientId", label: "Client ID" },
    {
      id: "bannerImage",
      label: "Banner Image",
      renderCell: (value) =>
        value ? <Avatar src={value} alt="Banner" /> : "-",
    },
    { id: "businessName", label: "Business Name" },
    { id: "location", label: "Location Name" },
    { id: "category", label: "Category" },
    {
      id: "createdBy",
      label: "Created By",
      renderCell: (value) => {
        if (!value) return "—";

        const createdById =
          typeof value === "object" && value.$oid ? value.$oid : value;

        const user = users.find((u) => {
          const userId =
            typeof u._id === "object" && u._id.$oid ? u._id.$oid : u._id;
          return userId === createdById;
        });

        return user ? user.userName : "—";
      },
    },
    {
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
              variant: "success",
            });

          } catch (err) {
            enqueueSnackbar("Download failed", {
              variant: "error",
            });
          }
        };


        const lastDownload =
          row.qrDownloads?.length > 0
            ? new Date(
              row.qrDownloads[row.qrDownloads.length - 1].downloadedAt
            ).toLocaleString()
            : "Not Downloaded";

        return (
          <Box sx={{ textAlign: "center" }}>
            <Avatar
              src={row.qrImage}
              sx={{ width: 60, height: 60, margin: "0 auto" }}
            />
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              {row.qrText}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              Last: {lastDownload}
            </Typography>

            <Button
              size="small"
              variant="contained"
              sx={{ mt: 1 }}
              onClick={handleDownload}
            >
              Download
            </Button>
          </Box>
        );
      },
    },

    {
      id: "payment",
      label: "Payment",
      renderCell: (value, row) => {
        const paymentArray = Array.isArray(value) ? value : [];
        const lastPayment = paymentArray[paymentArray.length - 1];
        const status = lastPayment?.paymentStatus?.toLowerCase() || "pending";

        let icon = <PaymentIcon />;
        let color = "warning";
        let isDisabled = false;
        let tooltipText = "Click to make a payment";

        if (status === "paid") {
          icon = <CheckCircle />;
          color = "success";
          isDisabled = true;
          tooltipText = "✅ Payment received — thank you for your purchase!";
        } else if (status === "failed") {
          icon = <Cancel />;
          color = "error";
          tooltipText = "❌ Payment failed — please try again.";
        } else if (status === "pending") {
          icon = <HourglassEmpty />;
          color = "warning";
          tooltipText = "⏳ Payment is pending — complete the process.";
        }

        return (
          <Tooltip title={tooltipText} arrow>
            <span>
              <IconButton
                color={color}
                onClick={!isDisabled ? () => handlePayNow(row) : undefined}
                disabled={isDisabled}
                sx={{
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: !isDisabled ? "scale(1.1)" : "none" },
                }}
              >
                {icon}
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDelete(row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
    {
      id: "gallery",
      label: "Gallery",
      renderCell: (_, row) => (
        <IconButton color="primary" onClick={() => handleOpenGallery(row._id)}>
          <CollectionsBookmarkOutlinedIcon />
        </IconButton>
      ),
    },
  ];


  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <>
            <div className="form-input-group" style={{ position: "relative" }}>
              <label htmlFor="clientId" className="input-label">Client ID</label>

              <input
                type="text"
                id="clientId"
                name="clientId"
                className={`text-input ${errors.clientId ? "error" : ""}`}
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
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                onFocus={() => {
                  if (formData.clientId.length >= 2) {
                    setShowSuggestions(true);
                  }
                }}
              />

              {errors.clientId && <p className="error-text">{errors.clientId}</p>}

              {showSuggestions && searchSuggestion?.length > 0 && (
                <ul
                  style={{
                    position: "absolute",
                    top: "80px",
                    left: 0,
                    width: "100%",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    padding: 0,
                    margin: 0,
                    zIndex: 2000,
                    listStyle: "none",
                  }}
                >
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
                      style={{
                        padding: "12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      <strong>{client.clientId}</strong> — {client.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="form-input-group">
              <label htmlFor="businessName" className="input-label">Business Name</label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                className={`text-input ${errors.businessName ? "error" : ""}`}
                value={formData.businessName}
                onChange={handleChange}
              />
              {errors.businessName && <p className="error-text">{errors.businessName}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="plotNumber" className="input-label">Plot Number</label>
              <input
                type="text"
                id="plotNumber"
                name="plotNumber"
                className="text-input"
                value={formData.plotNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="street" className="input-label">Street</label>
              <input
                type="text"
                id="street"
                name="street"
                className="text-input"
                value={formData.street}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="pincode" className="input-label">Pincode</label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                className={`text-input ${errors.pincode ? "error" : ""}`}
                value={formData.pincode}
                onChange={handleChange}
              />
              {errors.pincode && <p className="error-text">{errors.pincode}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="location" className="input-label">Location</label>
              <input
                type="text"
                id="location"
                name="location"
                className={`text-input ${errors.location ? "error" : ""}`}
                value={formData.location}
                onChange={handleChange}
              />
              {errors.location && <p className="error-text">{errors.location}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="address2" className="input-label">Global Address</label>
              <input
                type="text"
                id="globalAddress"
                name="globalAddress"
                className={`text-input ${errors.globalAddress ? "error" : ""}`}
                value={formData.globalAddress}
                onChange={handleChange}
              />
              {errors.globalAddress && <p className="error-text">{errors.globalAddress}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="email" className="input-label">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className={`text-input ${errors.email ? "error" : ""}`}
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="contact" className="input-label">Contact</label>
              <input
                type="text"
                id="contact"
                name="contact"
                className={`text-input ${errors.contact ? "error" : ""}`}
                value={formData.contact}
                onChange={handleChange}
              />
              {errors.contact && <p className="error-text">{errors.contact}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="contactList" className="input-label">Enquiry Number</label>
              <input
                type="text"
                id="contactList"
                name="contactList"
                className="text-input"
                value={formData.contactList}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="gstin" className="input-label">GSTIN</label>
              <input
                type="text"
                id="gstin"
                name="gstin"
                className={`text-input ${errors.gstin ? "error" : ""}`}
                value={formData.gstin}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="whatsappNumber" className="input-label">Whatsapp Number</label>
              <input
                type="text"
                id="whatsappNumber"
                name="whatsappNumber"
                className={`text-input ${errors.whatsappNumber ? "error" : ""}`}
                value={formData.whatsappNumber}
                onChange={handleChange}
              />
              {errors.whatsappNumber && <p className="error-text">{errors.whatsappNumber}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="experience" className="input-label">Experience</label>
              <input
                type="text"
                id="experience"
                name="experience"
                className={`text-input ${errors.experience ? "error" : ""}`}
                value={formData.experience}
                onChange={handleChange}
              />
              {errors.experience && <p className="error-text">{errors.experience}</p>}
            </div>

            <div className="form-input-group">
              <label htmlFor="googleMap" className="input-label">Google Map</label>
              <input
                type="text"
                id="googleMap"
                name="googleMap"
                className="text-input"
                value={formData.googleMap}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label htmlFor="website" className="input-label">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                className="text-input"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            {["facebook", "instagram", "youtube", "pinterest", "twitter", "linkedin"].map((field) => (
              <div className="form-input-group" key={field}>
                <label htmlFor={field} className="input-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  type="text"
                  id={field}
                  name={field}
                  className="text-input"
                  value={formData[field]}
                  onChange={handleChange}
                />
              </div>
            ))}


            <div className="form-input-group col-span-all upload-section">
              <div className="upload-content">
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  component="label"
                  className="upload-button"
                >
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                </Button>
                {preview && <Avatar src={preview} sx={{ width: 56, height: 56 }} className="preview-avatar" />}
              </div>
            </div>

            <div className="form-input-group col-span-all">
              <label className="input-label">Business Details</label>
              <ReactQuill
                theme="snow"
                value={businessvalue}
                onChange={handleBusinessChange}
                modules={modules}
                formats={formats}
                placeholder="Type business details here..."
                style={{ height: "200px" }}
              />
            </div><br />

            <div className="form-input-group col-span-all"><br /><br />
              <h3 style={{ marginBottom: "15px" }}>Opening Hours</h3>
              <div className="opening-hours-container">
                {formData.openingHours.map((hour, index) => (
                  <div
                    key={hour.day}
                    className="opening-hours-row"
                    data-closed={hour.isClosed}
                    data-247={hour.is24Hours}
                  >
                    <div className="day-label">{hour.day}</div>

                    <div className="time-group">
                      <input
                        type="time"
                        value={hour.is24Hours ? "00:00" : hour.open}
                        onChange={(e) =>
                          handleOpeningHourChange(index, "open", e.target.value)
                        }
                        disabled={hour.isClosed || hour.is24Hours}
                        className="text-input"
                        placeholder="Open Time"
                      />
                      <input
                        type="time"
                        value={hour.is24Hours ? "23:59" : hour.close}
                        onChange={(e) =>
                          handleOpeningHourChange(index, "close", e.target.value)
                        }
                        disabled={hour.isClosed || hour.is24Hours}
                        className="text-input"
                        placeholder="Close Time"
                      />
                    </div>

                    <div style={{ justifySelf: "end" }}>
                      <select
                        value={
                          hour.isClosed ? "closed" : hour.is24Hours ? "24/7" : "open"
                        }
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
                        className="select-input"
                      >
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                        <option value="24/7">24/7</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        );

      case 1:
        return (
          <div className="form-input-group">
            <label className="input-label">Upload KYC Documents</label>

            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUploadIcon />}
              className="upload-button"
            >
              Upload Files
              <input
                type="file"
                multiple
                hidden
                onChange={handleKycUpload}
                accept=".pdf,.png,.jpg,.jpeg"
              />
            </Button>

            <div className="kyc-file-list">
              {kycFiles.map((file, index) => (
                <div key={index} className="kyc-file-item">
                  <Typography variant="body2">
                    {file.name || `Document ${index + 1}`}
                  </Typography>
                  <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>

                  <div style={{ marginTop: "5px" }}>
                    {file.type?.includes("image") ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        style={{
                          width: "100px",
                          height: "100px",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                      />
                    ) : file.type?.includes("pdf") ? (
                      <iframe
                        src={file.preview}
                        title={file.name}
                        width="100%"
                        height="150px"
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: "8px",
                        }}
                      />
                    ) : null}

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => window.open(file.preview, "_blank")}
                      >
                        View Full
                      </Button>
                      <IconButton color="error" onClick={() => handleRemoveFile(index)}>
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </div>
                  </div>


                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <>
            <div className="form-input-group" style={{ position: "relative" }}>
              <label className="input-label">Category</label>

              <input
                type="text"
                className={`text-input ${errors.category ? "error" : ""}`}
                placeholder="Search category..."
                value={formData.category}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, category: value });

                  setCategorySelected(false);

                  if (value.length >= 2) {
                    dispatch(businessCategorySearch(value));
                    setShowCategorySuggest(true);
                  } else {
                    setShowCategorySuggest(false);
                  }
                }}
                onFocus={() => {
                  if (formData.category.length >= 2) {
                    setShowCategorySuggest(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowCategorySuggest(false), 200)}
              />

              {showCategorySuggest && searchCategory?.length > 0 && (
                <ul
                  style={{
                    position: "absolute",
                    top: "70px",
                    width: "100%",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    maxHeight: "240px",
                    overflowY: "auto",
                    padding: 0,
                    margin: 0,
                    zIndex: 2000,
                    listStyle: "none",
                  }}
                >
                  {searchCategory.map((cat) => (
                    <li
                      key={cat._id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          category: cat.category,
                          keywords: prev.keywords?.length ? prev.keywords : cat.keywords || [],
                          slug: prev.slug || cat.slug || "",
                          seoTitle: prev.seoTitle || cat.seoTitle || "",
                          seoDescription: prev.seoDescription || cat.seoDescription || "",
                          title: prev.title || cat.title || "",
                          description: prev.description || cat.description || "",
                        }));

                        setCategorySelected(true);
                        setShowCategorySuggest(false);
                      }}
                      style={{
                        padding: "10px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {cat.category}
                    </li>
                  ))}
                </ul>
              )}
            </div>


            <div className="category-form-input-group" style={{ marginTop: "25px" }}>
              <label className="category-input-label">Keywords</label>

              <Autocomplete
                multiple
                freeSolo
                options={[]}   // empty because user enters freely
                value={Array.isArray(formData.keywords) ? formData.keywords : []}
                onChange={(event, newValue) => {
                  setFormData({
                    ...formData,
                    keywords: newValue,
                  });
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={index}
                      label={option}
                      {...getTagProps({ index })}
                      onDelete={() => {
                        // delete chip
                        setFormData((prev) => ({
                          ...prev,
                          keywords: prev.keywords.filter((k) => k !== option),
                        }));
                      }}
                      sx={{
                        backgroundColor: "#ff8c00",
                        color: "white",
                        fontWeight: 500,
                        "& .MuiChip-deleteIcon": { color: "white" },
                      }}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Add keywords"
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => {
                              if (!inputKeyword.trim()) return;

                              // Add keyword
                              setFormData((prev) => ({
                                ...prev,
                                keywords: [...prev.keywords, inputKeyword.trim()],
                              }));

                              setInputKeyword("");
                            }}
                            sx={{
                              color: "var(--color-primary-orange)",
                              "&:hover": { color: "var(--color-primary-hover)" },
                            }}
                          >
                            <AddCircleOutlineIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </div>

            {/* SEO TITLE */}
            <div className="form-input-group">
              <label className="input-label">SEO Title</label>
              <input
                type="text"
                name="seoTitle"
                className="text-input"
                value={formData.seoTitle}
                onChange={handleChange}
              />
            </div>

            {/* SEO DESCRIPTION */}
            <div className="form-input-group">
              <label className="input-label">SEO Description</label>
              <textarea
                name="seoDescription"
                className="textarea-input"
                value={formData.seoDescription}
                rows={3}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label className="input-label">Title</label>
              <input
                type="text"
                name="title"
                className="text-input"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="form-input-group">
              <label className="input-label">Description</label>
              <textarea
                name="description"
                className="textarea-input"
                value={formData.description}
                rows={4}
                onChange={handleChange}
              />
            </div>
            {["restaurants", "hotels"].includes(formData.category?.toLowerCase()) && (
              <div className="form-input-group">
                <label className="input-label">Restaurant Options</label>
                <select
                  className="select-input"
                  name="restaurantOptions"
                  value={formData.restaurantOptions || ""}
                  onChange={handleChange}
                >
                  <option value="">-- Select Option --</option>
                  <option value="Veg">Veg</option>
                  <option value="Non-Veg">Non-Veg</option>
                  <option value="Both">Both</option>
                </select>
              </div>
            )}
            <div className="form-input-group">
              <label className="input-label">Slug</label>
              <input
                type="text"
                name="slug"
                className="text-input"
                value={formData.slug}
                onChange={handleChange}
              />
            </div>
          </>
        );

      case 3:
        return (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100vh",
                backgroundColor: "#f8f9fa",
                px: 2,
              }}
            >
              <Box
                sx={{
                  borderRadius: 2,
                  p: { xs: 3, sm: 4 },
                  textAlign: "center",
                  maxWidth: 320,
                  width: "100%",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    fontSize: { xs: "1.1rem", sm: "1.25rem" },
                    color: "#333",
                    mb: 1,
                  }}
                >
                  List Your Business on{" "}
                  <Box component="span" sx={{ color: "#f57c00" }}>
                    MassClick
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: "1.2rem", sm: "1.4rem" },
                    mb: 3,
                  }}
                >
                  Just ₹ 99/- + GST
                </Typography>

                <Button
                  variant="contained"
                  onClick={handlePayNow}
                  sx={{
                    backgroundColor: "#f57c00",
                    color: "#fff",
                    fontWeight: 600,
                    textTransform: "none",
                    px: 4,
                    py: 1.2,
                    borderRadius: "6px",
                    "&:hover": { backgroundColor: "#e66b00" },
                  }}
                >
                  Pay Now
                </Button>

              </Box>
            </Box>
          </>
        );

      default:
        return null;
    }
  };


  return (
    <div className="business-page">
      <div className="business-card" style={{ marginBottom: '20px', padding: '15px 30px', boxShadow: 'none' }}>
        <Stack sx={{ width: '100%' }} spacing={4}>
          <Stepper alternativeLabel activeStep={activeStep} connector={<ColorlibConnector />}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel StepIconComponent={ColorlibStepIcon}>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Stack>
      </div>

      <div className="business-card form-section">
        <h2 className="card-title">
          {editMode ? `Edit Business (${steps[activeStep]})` : `Add New Business (${steps[activeStep]})`}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {renderStepContent(activeStep)}
          </div>

          <div
            className="col-span-all upload-section"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: activeStep !== 3 ? "28px" : "150px",
            }}
          >
            {activeStep > 0 && activeStep < steps.length - 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  marginBottom: "-88px",
                }}
              >
                <button
                  type="button"
                  className="submit-button"
                  onClick={handleBack}
                >
                  <SkipPreviousIcon />
                </button>
              </div>
            )}

            {activeStep < steps.length - 2 ? (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="submit-button"
                  onClick={handleNext}
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "28px",
                  }}
                >
                  <SkipNextIcon />
                </button>
              </div>
            ) : activeStep === steps.length - 2 ? (
              <button
                type="submit"
                className="submit-button"
                disabled={loading}
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "28px",
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : editMode ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
        BusinessList Table
      </Typography>
      <Box sx={{ width: "100%" }}>
        <CustomizedTable
          data={rows}
          total={total}
          columns={businessListTable}
          fetchData={(pageNo, pageSize, options = {}) => {
            dispatch(
              getAllBusinessList({
                pageNo,
                pageSize,
                search: options.search || "",
                status: options.status || "all",
                sortBy: options.sortBy || null,
                sortOrder: options.sortOrder || "asc",
              })
            );
          }}
        />

      </Box>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, name: "" })}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete <strong>{deleteDialog.name || "this business"}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, name: "" })} color="secondary">
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
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {galleryDialog.data?.businessImages?.map((img, idx) => <Avatar key={idx} src={img} sx={{ width: 100, height: 100 }} />)}
            {newGalleryImages.map((img, idx) => <Avatar key={idx} src={img} sx={{ width: 100, height: 100, border: "2px dashed green" }} />)}
          </div>
          <Button variant="contained" component="label" sx={{ mt: 2 }}>
            Upload Images
            <input type="file" hidden multiple accept="image/*" onChange={handleGalleryImageChange} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGallery} color="secondary">Close</Button>
          <Button onClick={handleUploadGalleryImages} color="primary" variant="contained" disabled={newGalleryImages.length === 0}>Upload</Button>
        </DialogActions>
      </Dialog>
    </div>

  );
}