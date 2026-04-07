import React, { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllUsers, createUser, editUser, deleteUser } from "../../redux/actions/userAction.js";
import { getAllRoles } from "../../redux/actions/rolesAction.js";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar
} from "@mui/material";
import './user.css'
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CustomizedTable from "../../components/Table/CustomizedTable.js";

export default function User() {
  const dispatch = useDispatch();
  const fileInputRef = useRef();
  const [preview, setPreview] = useState(null);

  const { users = [], total = 0, loading, error } = useSelector((state) => state.userReducer || {});
  const { roles = [] } = useSelector((state) => state.rolesReducer || {});
  const [isEditMode, setIsEditMode] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [formData, setFormData] = useState({
    userName: "",
    userProfile: "",
    password: "",
    contact: "",
    businessLocation: "",
    businessCategory: "",
    emailId: "",
    role: "",
    managedBy: "",
  });

  const salesManagers = users.filter(user => user.role === "SalesManager");

  useEffect(() => {
    dispatch(getAllUsers());
    dispatch(getAllRoles());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, userProfile: reader.result }));
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    let dataToSubmit = { ...formData };

    if (dataToSubmit.role !== "SalesOfficer") {
      delete dataToSubmit.managedBy;
    } else if (dataToSubmit.role === "SalesOfficer" && dataToSubmit.managedBy === "") {
      dataToSubmit.managedBy = null;
    }

    if (isEditMode && !dataToSubmit.password) {
      delete dataToSubmit.password;
    }


    if (isEditMode && editUserId) {
      dispatch(editUser(editUserId, dataToSubmit))
        .then(() => {
          resetForm();
          dispatch(getAllUsers());
        })
        .catch((err) => console.error("Update user failed:", err));
    } else {
      dispatch(createUser(dataToSubmit))
        .then(() => {
          resetForm();
          dispatch(getAllUsers());
        })
        .catch((err) => console.error("Create user failed:", err));
    }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!formData.userName) newErrors.userName = "User Name is required";
    if (!formData.contact) newErrors.contact = "Contact is required";
    if (!isEditMode && !formData.password) newErrors.password = "Password is required";
    if (!formData.emailId) newErrors.emailId = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.emailId)) newErrors.emailId = "Invalid email format";
    if (!formData.role) newErrors.role = "Role is required";
    if (!formData.businessLocation) newErrors.businessLocation = "Business Location is required";
    if (!formData.businessCategory) newErrors.businessCategory = "Business Category is required";
    if (formData.role === "SalesOfficer" && !formData.managedBy)
      newErrors.managedBy = "Assigned Manager is required for Sales Officer";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (row) => {
    setFormData({
      userName: row.userName,
      userProfile: row.userProfile,
      password: "",
      contact: row.contact,
      role: row.role,
      emailId: row.emailId,
      businessLocation: row.businessLocation,
      businessCategory: row.businessCategory,
      managedBy: row.managerIdForEdit || "",
    });
    setEditUserId(row.id);
    setIsEditMode(true);
  };

  const resetForm = () => {
    setFormData({
      userName: "",
      userProfile: "",
      password: "",
      contact: "",
      businessLocation: "",
      businessCategory: "",
      emailId: "",
      role: "",
      managedBy: "",
    });
    setErrors({});
    setEditUserId(null);
    setIsEditMode(false);
    setShowPassword(false);
    setPreview(null);
  };

  const handleDeleteClick = (row) => {
    setSelectedUser(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUser) {
      dispatch(deleteUser(selectedUser.id))
        .then(() => {
          dispatch(getAllUsers());
          setDeleteDialogOpen(false);
          setSelectedUser(null);
        })
        .catch((err) => console.error("Delete failed:", err));
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  };


  const rows = users
    .filter((user) => user.isActive)
    .map((user, index) => {
      const managedOfficers = user.role === 'SalesManager'
        ? (user.salesBy || [])
          .map(officerId => users.find(u => u._id === officerId)?.userName)
          .filter(name => name)
          .join(', ') || 'None'
        : '-';

      return {
        id: user._id || index,
        userName: user.userName,
        userProfile: user.userProfile,
        contact: user.contact,
        emailId: user.emailId,
        role: user.role,
        businessLocation: user.businessLocation || "-",
        businessCategory: user.businessCategory || "-",
        managedBy: salesManagers.find(m => m._id === user.managedBy)?.userName || "-",
        managerIdForEdit: user.managedBy || "",
        salesOfficers: managedOfficers,
      };
    });

  const userList = [
    {
      id: "userProfile",
      label: "User Profile",
      renderCell: (value) =>
        value ? <Avatar src={value} alt="User" /> : "-",
    },
    { id: "userName", label: "User Name" },
    { id: "emailId", label: "Email" },
    { id: "role", label: "Role" },
    {
      id: "managedInfo",
      label: "Assigned Manager / Managed Officers",
      renderCell: (_, row) => {
        if (row.role === "SalesManager") {
          return (
            <Box component="span" sx={{ whiteSpace: "normal", lineHeight: "1.2" }}>
              {row.salesOfficers || "-"}
            </Box>
          );
        } else if (row.role === "SalesOfficer") {
          return row.managedBy || "-";
        }
        return "-";
      },
    },
    { id: "businessLocation", label: "Business Location" },
    { id: "businessCategory", label: "Business Category" },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div style={{ display: "flex", gap: "8px" }}>
          <IconButton color="primary" size="small" onClick={() => handleEdit(row)}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton color="error" size="small" onClick={() => handleDeleteClick(row)}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </div>
      ),
    },
  ];


  // Modified fields array: Role is removed to be manually placed in the form
  const fields = [
    { label: "UserName", name: "userName", required: true, type: "text" },
    { label: "Password", name: "password", required: true, type: "password" },
    { label: "Contact", name: "contact", required: true, type: "text" },
    { label: "EmailId", name: "emailId", required: true, type: "email" },
    { label: "BusinessLocation", name: "businessLocation", required: true, type: "text" },
    { label: "BusinessCategory", name: "businessCategory", required: true, type: "text" },
  ];

  return (
    <div className="user-page">
      <div className="user-card form-section">
        <h2 className="user-card-title">{isEditMode ? "Edit User" : "Add New User"}</h2>

        <form onSubmit={handleSubmit} className="user-form-grid">
          {fields.map((field, i) => {
            const isPassword = field.type === "password";

            return (
              <div key={i} className="user-form-input-group">
                <label htmlFor={field.name} className="user-input-label">
                  {field.label}
                </label>

                {isPassword ? (
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      id={field.name}
                      name={field.name}
                      placeholder={isEditMode ? "Enter new password (optional)" : ""}
                      value={formData.password || ""}
                      onChange={handleChange}
                      className={`user-text-input ${errors.password ? "error" : ""}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    id={field.name}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className={`user-text-input ${errors[field.name] ? "error" : ""}`}
                  />
                )}
                {errors[field.name] && <p className="user-error-text">{errors[field.name]}</p>}
              </div>
            );
          })}

          {/* 1. Manually rendered Role field */}
          <div className="user-form-input-group">
            <label htmlFor="role" className="user-input-label">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`user-select-input ${errors.role ? "error" : ""}`}
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role._id} value={role.roleName}>
                  {role.roleName}
                </option>
              ))}
            </select>
            {errors.role && <p className="user-error-text">{errors.role}</p>}
          </div>

          {formData.role === "SalesOfficer" && (
            <div className="user-form-input-group">
              <label htmlFor="managedBy" className="user-input-label">
                Assigned Manager
              </label>
              <select
                id="managedBy"
                name="managedBy"
                value={formData.managedBy}
                onChange={handleChange}
                className={`user-select-input ${errors.managedBy ? "error" : ""}`}
              >
                <option value="">Select Sales Manager</option>
                {salesManagers.map((manager) => (
                  <option key={manager._id} value={manager._id}>
                    {manager.userName}
                  </option>
                ))}
              </select>
              {errors.managedBy && <p className="user-error-text">{errors.managedBy}</p>}
            </div>
          )}

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
              {preview && <Avatar src={preview} sx={{ width: 56, height: 56 }} />}
              <div style={{ marginBottom: "10px" }}>
                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : isEditMode ? (
                    "Update User"
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>

        {error && (
          <p className="user-error-text" style={{ marginTop: "16px" }}>
            {(() => {
              if (typeof error === "string") return error;
              if (error instanceof Error) return error.message;
              if (typeof error === "object") return JSON.stringify(error, null, 2);
              return String(error);
            })()}
          </p>
        )}

      </div>

      <Typography variant="h6" gutterBottom sx={{ textAlign: "center" }}>
        User Table
      </Typography>
      <Box sx={{ width: "100%" }}>
        <CustomizedTable
          data={rows}
          columns={userList}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(getAllUsers({ pageNo, pageSize, options }))
          }
        />
      </Box>

      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete{" "}
          <strong>{selectedUser?.userName || "this user"}</strong>?
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
    </div>
  );
}