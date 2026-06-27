import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import InputValidator from "../validators/inputValidator.js";
import { getAllUsersClient, createUserClient, editUserClient, deleteUserClient } from "../../redux/actions/userClientAction.js";
import { Box, Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Alert, AlertTitle } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import styles from "./clients.module.css";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import AdminViewTabs from "../../components/AdminViewTabs.js";
const cx = createScopedClassNames(styles);
export default function UserClients() {
  const dispatch = useDispatch();
  const {
    userClient = [],
    total = 0,
    pageNo: currentPageNo = 1,
    pageSize: currentPageSize = 10,
    loading,
    error
  } = useSelector(state => state.userClientReducer || {});
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeView, setActiveView] = useState("list");
  const [editUserId, setEditUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    contact: "",
    emailId: "",
    businessName: "",
    businessAddress: ""
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tableQuery, setTableQuery] = useState({
    pageNo: 1,
    pageSize: 10,
    options: {}
  });
  useEffect(() => {
    if (activeView !== "list") return;
    dispatch(getAllUsersClient(tableQuery));
  }, [activeView, dispatch, tableQuery]);
  const mapErrorToField = errorMessage => {
    const lowerError = errorMessage.toLowerCase();
    if (lowerError.includes('name') && !lowerError.includes('business')) return 'name';
    if (lowerError.includes('email')) return 'emailId';
    if (lowerError.includes('phone') || lowerError.includes('contact')) return 'contact';
    if (lowerError.includes('business name')) return 'businessName';
    if (lowerError.includes('business address') || lowerError.includes('address')) return 'businessAddress';
    return null;
  };
  const validateForm = () => {
    let newErrors = {};

    // Use InputValidator for comprehensive validation
    try {
      const clientData = {
        name: formData.name.trim(),
        email: formData.emailId.trim(),
        phone: formData.contact.trim(),
        location: ''
      };
      InputValidator.validateClient(clientData);
    } catch (error) {
      const errorLines = error.message.split('\n').filter(line => line.trim());
      errorLines.forEach(line => {
        let cleanedError = line.replace(/^Client validation failed:\s*/, '').trim();
        if (cleanedError) {
          const field = mapErrorToField(cleanedError);
          if (field) {
            newErrors[field] = cleanedError;
          }
        }
      });
    }

    // Additional MassClick-specific validations
    if (!formData.businessName.trim()) {
      newErrors.businessName = "Business Name is required";
    }
    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = "Business Address is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setErrors(prev => ({
      ...prev,
      [name]: ""
    }));
  };
  const resetForm = () => {
    setFormData({
      clientId: "",
      name: "",
      contact: "",
      emailId: "",
      businessName: "",
      businessAddress: ""
    });
    setIsEditMode(false);
    setEditUserId(null);
  };
  const parseBackendErrors = err => {
    const fieldNameMap = {
      'email': 'emailId',
      'phone': 'contact',
      'name': 'name',
      'businessName': 'businessName',
      'businessAddress': 'businessAddress'
    };
    const backendErrors = {};
    if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
      err.response.data.errors.forEach(e => {
        const mappedField = fieldNameMap[e.field] || e.field;
        backendErrors[mappedField] = e.message;
      });
    }
    return backendErrors;
  };
  const transformFormDataForBackend = data => {
    return {
      clientId: data.clientId,
      name: data.name,
      emailId: data.emailId,
      email: data.emailId,
      contact: data.contact,
      phone: data.contact,
      businessName: data.businessName,
      businessAddress: data.businessAddress
    };
  };
  const refreshCurrentPage = () => dispatch(getAllUsersClient({
    pageNo: currentPageNo,
    pageSize: currentPageSize,
    options: tableQuery.options
  }));
  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) return;
    const backendData = transformFormDataForBackend(formData);
    if (isEditMode && editUserId) {
      dispatch(editUserClient(editUserId, backendData)).then(() => {
        setSuccessMessage("✓ Client updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        resetForm();
        refreshCurrentPage();
      }).catch(err => {
        console.error("Update client failed:", err);
        const backendErrors = parseBackendErrors(err);
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
        }
      });
    } else {
      dispatch(createUserClient(backendData)).then(() => {
        setSuccessMessage("✓ Client created successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        resetForm();
        refreshCurrentPage();
      }).catch(err => {
        console.error("Create client failed:", err);
        const backendErrors = parseBackendErrors(err);
        if (Object.keys(backendErrors).length > 0) {
          setErrors(backendErrors);
        }
      });
    }
  };
  const handleEdit = row => {
    setFormData({
      clientId: row.clientId,
      name: row.name,
      contact: row.contact,
      emailId: row.emailId,
      businessName: row.businessName,
      businessAddress: row.businessAddress
    });
    setEditUserId(row.id);
    setIsEditMode(true);
    setActiveView("form");
  };
  const handleDeleteClick = row => {
    setSelectedUser(row);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = () => {
    if (selectedUser) {
      dispatch(deleteUserClient(selectedUser.id)).then(() => {
        refreshCurrentPage();
        setDeleteDialogOpen(false);
        setSelectedUser(null);
      }).catch(err => console.error("Delete failed:", err));
    }
  };
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };
  const rows = userClient.filter(user => user.isActive).map((user, index) => ({
    id: user._id || index,
    _id: user._id || index,
    clientId: user.clientId,
    name: user.name,
    emailId: user.emailId || user.email || "-",
    contact: user.contact || user.phone || "-",
    businessName: user.businessName || "-",
    businessAddress: user.businessAddress || "-",
    isActive: user.isActive
  }));
  const clientList = [{
    id: "clientId",
    label: "Client ID"
  }, {
    id: "name",
    label: "Name"
  }, {
    id: "emailId",
    label: "Email"
  }, {
    id: "contact",
    label: "Contact"
  }, {
    id: "businessName",
    label: "Business Name"
  }, {
    id: "businessAddress",
    label: "Business Address"
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => (
      <Box sx={{ display: "flex", gap: "14px", alignItems: "center" }}>
        <EditOutlined onClick={() => handleEdit(row)} style={{ fontSize: 17, color: "#3b82f6", cursor: "pointer" }} />
        <DeleteOutlined onClick={() => handleDeleteClick(row)} style={{ fontSize: 17, color: "#ef4444", cursor: "pointer" }} />
      </Box>
    )
  }];
  const fields = [{
    label: "Name",
    name: "name",
    required: true,
    type: "text",
    placeholder: "E.g., John Doe",
    helper: "Full name of the client contact person"
  }, {
    label: "Contact",
    name: "contact",
    required: true,
    type: "text",
    placeholder: "E.g., +91 98765 43210 or 9876543210",
    helper: "10-digit mobile number or international format"
  }, {
    label: "Email",
    name: "emailId",
    required: true,
    type: "email",
    placeholder: "E.g., john@company.com or john@gmail.com",
    helper: "Company email preferred, but personal email (Gmail, Yahoo, etc.) is also accepted"
  }, {
    label: "Business Name",
    name: "businessName",
    required: true,
    type: "text",
    placeholder: "E.g., ABC Corporation",
    helper: "Official name of the business"
  }, {
    label: "Business Address",
    name: "businessAddress",
    required: true,
    type: "text",
    placeholder: "E.g., 123 Business Street, City, State 12345",
    helper: "Complete business address including city and state"
  }];
  return <div className={cx("client-page")}>
      <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={isEditMode} createLabel="Client" listLabel="Clients" listCount={rows.length} />

      {activeView === "form" && <div className={cx("client-card form-section")}>
        <h2 className={cx("client-card-title")}>
          {isEditMode ? "Edit Client" : "Add New Client"}
        </h2>

        {successMessage && <Alert severity="success" sx={{
        marginBottom: "20px"
      }} icon={<CheckCircleOutlineRoundedIcon />}>
            {successMessage}
          </Alert>}

        {error && <Alert severity="error" sx={{
        marginBottom: "20px"
      }}>
            <AlertTitle>Error</AlertTitle>
            {(() => {
          if (typeof error === "string") {
            return error;
          }
          if (error instanceof Error) {
            return error.message;
          }
          if (typeof error === "object") {
            // Try to extract a user-friendly message from backend response
            if (error.message && typeof error.message === "string") {
              return error.message;
            }
            if (error.data?.message) {
              return error.data.message;
            }
            // Fallback for raw JSON - don't show it
            return "An error occurred while processing your request. Please check the fields above and try again.";
          }
          return String(error);
        })()}
          </Alert>}

        <form onSubmit={handleSubmit} className={cx("client-form-grid")}>
          {fields.map((field, i) => <div key={i} className={cx("client-form-input-group")}>
              <label htmlFor={field.name} className={cx("client-input-label")}>
                {field.label}
                {field.required && <span className={cx("client-required-indicator")}>*</span>}
              </label>
              <input
                type={field.type}
                id={field.name}
                name={field.name}
                placeholder={field.placeholder}
                className={`form-text-input ${errors[field.name] ? "error" : ""}`}
                value={formData[field.name]}
                onChange={handleChange}
              />
              {errors[field.name] && <p id={`${field.name}-error`} className="form-error-text">
                  ✗ {errors[field.name]}
                </p>}
              {!errors[field.name] && field.helper && <p id={`${field.name}-helper`} className="form-helper-text">
                  {field.helper}
                </p>}
            </div>)}

          <div className={cx("client-button-group col-span-all")}>
            <button type="submit" className={cx("client-submit-button")} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : isEditMode ? "Update Client" : "Create Client"}
            </button>

            {isEditMode && <button type="button" className={cx("client-cancel-button")} onClick={resetForm}>
                Cancel
              </button>}
          </div>
        </form>
      </div>}

      {activeView === "list" && <>
      <Typography variant="h6" gutterBottom sx={{
      textAlign: "center"
    }}>
        Client Table
      </Typography>
      <Box sx={{
      width: "100%"
    }}>
        <CustomizedTable data={rows} columns={clientList} total={total} loading={loading} fetchData={(pageNo, pageSize, options) => setTableQuery({
        pageNo,
        pageSize,
        options
      })} />
      </Box>
      </>}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle className={cx("client-dialog-title")}>
          Confirm Delete
        </DialogTitle>
        <DialogContent className={cx("client-dialog-content")}>
          Are you sure you want to delete{" "}
          <strong>{selectedUser?.name || "this client"}</strong>?
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} color="secondary">
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>;
}
