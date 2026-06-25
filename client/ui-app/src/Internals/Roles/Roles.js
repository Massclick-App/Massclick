import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllRoles, createRoles, editRoles, deleteRoles } from "../../redux/actions/rolesAction";
import { Box, Button, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, Chip } from "@mui/material";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from "./roles.module.css";
import CustomizedTable from "../../components/Table/CustomizedTable";
import { PAGE_REGISTRY } from "../../config/pageRegistry";
import AdminViewTabs from "../../components/AdminViewTabs.js";
const cx = createScopedClassNames(styles);
const toArray = val => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};
export default function Roles() {
  const dispatch = useDispatch();
  const {
    roles = [],
    total = 0,
    loading,
    error
  } = useSelector(state => state.rolesReducer || {});
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    roleName: "",
    permissions: [],
    description: "",
    createdBy: ""
  });
  const [activeView, setActiveView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  useEffect(() => {
    dispatch(getAllRoles());
  }, [dispatch]);
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  const handlePageToggle = path => {
    setFormData(prev => {
      const current = prev.permissions;
      return {
        ...prev,
        permissions: current.includes(path) ? current.filter(p => p !== path) : [...current, path]
      };
    });
  };
  const handleSelectAll = () => {
    const allPaths = PAGE_REGISTRY.map(p => p.path);
    const allSelected = allPaths.every(p => formData.permissions.includes(p));
    setFormData(prev => ({
      ...prev,
      permissions: allSelected ? [] : allPaths
    }));
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.roleName.trim()) newErrors.roleName = "Role Name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.createdBy.trim()) newErrors.createdBy = "Created By is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const resetForm = () => {
    setFormData({
      roleName: "",
      permissions: [],
      description: "",
      createdBy: ""
    });
    setEditingId(null);
    setErrors({});
  };
  const handleSubmit = e => {
    e.preventDefault();
    if (!validateForm()) return;
    const action = editingId ? editRoles(editingId, formData) : createRoles(formData);
    dispatch(action).then(() => {
      resetForm();
      dispatch(getAllRoles());
    }).catch(err => console.error("Role save failed:", err));
  };
  const handleEdit = row => {
    setEditingId(row.id);
    setFormData({
      roleName: row.roleName || "",
      permissions: toArray(row.permissions),
      description: row.description || "",
      createdBy: row.createdBy || ""
    });
    setActiveView("form");
  };
  const handleDeleteClick = row => {
    setSelectedRow(row);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = () => {
    if (selectedRow?.id) {
      dispatch(deleteRoles(selectedRow.id)).then(() => {
        dispatch(getAllRoles());
        setDeleteDialogOpen(false);
        setSelectedRow(null);
      }).catch(err => console.error("Delete roles failed:", err));
    }
  };
  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedRow(null);
  };
  const rows = roles.filter(rol => rol.isActive).map((rol, index) => ({
    id: rol._id || index,
    roleName: rol.roleName,
    permissions: toArray(rol.permissions),
    description: rol.description,
    createdBy: rol.createdBy,
    isActive: rol.isActive
  }));
  const rolesList = [{
    id: "roleName",
    label: "Role Name"
  }, {
    id: "permissions",
    label: "Pages",
    renderCell: (_, row) => {
      const perms = toArray(row.permissions);
      const visible = perms.slice(0, 4);
      const extra = perms.length - 4;
      return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 300 }}>
        {visible.map(path => {
          const page = PAGE_REGISTRY.find(p => p.path === path);
          return <Chip key={path} label={page?.label || path} size="small" sx={{ fontSize: '0.68rem' }} />;
        })}
        {extra > 0 && <Chip label={`+${extra}`} size="small" sx={{ fontSize: '0.68rem', bgcolor: '#f3f4f6', color: '#6b7280' }} />}
      </Box>;
    }
  }, {
    id: "description",
    label: "Description"
  }, {
    id: "createdBy",
    label: "Created By"
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
  const textFields = [{
    label: "Role Name",
    name: "roleName",
    required: true
  }, {
    label: "Description",
    name: "description",
    required: true
  }, {
    label: "Created By",
    name: "createdBy",
    required: true
  }];
  const allPaths = PAGE_REGISTRY.map(p => p.path);
  const allSelected = allPaths.every(p => formData.permissions.includes(p));
  return <div className={cx("role-page")}>
            <AdminViewTabs activeView={activeView} onChange={setActiveView} isEditing={Boolean(editingId)} createLabel="Role" listLabel="Roles" listCount={rows.length} />

            {activeView === "form" && <div className={cx("role-card form-section")}>
                <h2 className={cx("role-card-title")}>{editingId ? "Edit Role" : "Add New Role"}</h2>
                <form onSubmit={handleSubmit} className={cx("role-form-grid")}>
                    {textFields.map(field => <div key={field.name} className={cx("role-form-input-group")}>
                            <label htmlFor={field.name} className={cx("role-input-label")}>{field.label}</label>
                            <input type="text" id={field.name} name={field.name} value={formData[field.name]} onChange={handleChange} className={cx(`role-text-input ${errors[field.name] ? "error" : ""}`)} />
                            {errors[field.name] && <p className={cx("role-error-text")}>{errors[field.name]}</p>}
                        </div>)}

                    {/* Page Permissions Picker */}
                    <div className={cx("role-form-input-group col-span-all")}>
                        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1
          }}>
                            <label className={cx("role-input-label")} style={{
              marginBottom: 0
            }}>
                                Page Access
                            </label>
                            <Button size="small" variant="text" onClick={handleSelectAll} sx={{
              fontSize: '0.75rem'
            }}>
                                {allSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                        </Box>
                        <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 0.5,
            border: '1px solid #e0e0e0',
            borderRadius: 2,
            p: 1.5,
            bgcolor: '#fafafa'
          }}>
                            {PAGE_REGISTRY.map(({
              path,
              label
            }) => <FormControlLabel key={path} control={<Checkbox size="small" checked={formData.permissions.includes(path)} onChange={() => handlePageToggle(path)} sx={{
              color: '#e1580f',
              '&.Mui-checked': {
                color: '#e1580f'
              }
            }} />} label={<Typography sx={{
              fontSize: '0.85rem'
            }}>{label}</Typography>} />)}
                        </Box>
                        <Typography sx={{
            fontSize: '0.75rem',
            color: '#888',
            mt: 0.5
          }}>
                            {formData.permissions.length} of {PAGE_REGISTRY.length} pages selected
                        </Typography>
                    </div>

                    <div className={cx("role-button-group col-span-all")}>
                        <button type="submit" className={cx("role-submit-button")} disabled={loading}>
                            {loading ? "Loading..." : editingId ? "Update Role" : "Create Role"}
                        </button>
                        {editingId && <button type="button" className={cx("role-cancel-button")} onClick={resetForm}>
                                Cancel
                            </button>}
                    </div>
                </form>

                {error && <p className={cx("role-error-text")} style={{
        marginTop: "16px"
      }}>
                        {typeof error === "string" ? error : JSON.stringify(error, null, 2)}
                    </p>}
            </div>}

            {activeView === "list" && <>
            <Typography variant="h6" gutterBottom sx={{
      textAlign: "center"
    }}>
                Roles Table
            </Typography>
            <Box sx={{
      width: "100%"
    }}>
                <CustomizedTable data={rows} columns={rolesList} total={total} fetchData={(pageNo, pageSize, options) => dispatch(getAllRoles({
        pageNo,
        pageSize,
        options
      }))} />
            </Box>
            </>}

            <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete <strong>{selectedRow?.roleName || "this role"}</strong>?
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelDelete} color="secondary">Cancel</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </div>;
}
