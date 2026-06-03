import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  getAllEventLocation,
  createEventLocation,
  updateEventLocation,
  deleteEventLocation,
} from "../../redux/actions/eventAction";

import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";

import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";

import CustomizedTable from "../../components/Table/CustomizedTable";

import "./eventLocation.css";

export default function EventLocation() {
  const dispatch = useDispatch();

  const {
    data = [],
    total = 0,
    loading,
    error,
  } = useSelector((state) => state.event.eventLocation);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    locationName: "",
    district: "",
    state: "",
    status: true,
  });

  const [errors, setErrors] = useState({});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    dispatch(getAllEventLocation());
  }, [dispatch]);

  const validateForm = () => {
    let newErrors = {};

    if (!formData.locationName.trim()) {
      newErrors.locationName = "Location Name is required";
    }

    if (!formData.district.trim()) {
      newErrors.district = "District is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const resetForm = () => {
    setFormData({
      locationName: "",
      district: "",
      state: "",
      status: true,
    });

    setEditId(null);
    setIsEditMode(false);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (isEditMode) {
      dispatch(updateEventLocation(editId, formData))
        .then(() => {
          setSuccessMessage("Location Updated Successfully");
          dispatch(getAllEventLocation());
          resetForm();
        })
        .catch(console.error);
    } else {
      dispatch(createEventLocation(formData))
        .then(() => {
          setSuccessMessage("Location Created Successfully");
          dispatch(getAllEventLocation());
          resetForm();
        })
        .catch(console.error);
    }

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  const handleEdit = (row) => {
    setFormData({
      locationName: row.locationName,
      district: row.district,
      state: row.state,
      status: row.status,
    });

    setEditId(row.id);
    setIsEditMode(true);
  };

  const handleDeleteClick = (row) => {
    setSelectedLocation(row);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    dispatch(deleteEventLocation(selectedLocation.id))
      .then(() => {
        dispatch(getAllEventLocation());
        setDeleteDialogOpen(false);
      })
      .catch(console.error);
  };

  const rows = data.map((item) => ({
    id: item._id,
    locationName: item.locationName,
    district: item.district,
    state: item.state,
    status: item.status ? "Active" : "Inactive",
  }));

  const columns = [
    {
      id: "locationName",
      label: "Location Name",
    },
    {
      id: "district",
      label: "District",
    },
    {
      id: "state",
      label: "State",
    },
    {
      id: "status",
      label: "Status",
    },
    {
      id: "action",
      label: "Action",
      renderCell: (_, row) => (
        <div className="event-location-actions">
          <IconButton
            color="primary"
            onClick={() => handleEdit(row)}
          >
            <EditRoundedIcon />
          </IconButton>

          <IconButton
            color="error"
            onClick={() => handleDeleteClick(row)}
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="event-location-page">

      <div className="event-location-card">

        <h2>
          {isEditMode
            ? "Edit Event Location"
            : "Create Event Location"}
        </h2>

        {successMessage && (
          <Alert severity="success">
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>

          <div className="event-location-grid">

            <div>
              <label>Location Name *</label>

              <input
                type="text"
                name="locationName"
                value={formData.locationName}
                onChange={handleChange}
              />

              {errors.locationName && (
                <p className="error-text">
                  {errors.locationName}
                </p>
              )}
            </div>

            <div>
              <label>District *</label>

              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
              />

              {errors.district && (
                <p className="error-text">
                  {errors.district}
                </p>
              )}
            </div>

            <div>
              <label>State *</label>

              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />

              {errors.state && (
                <p className="error-text">
                  {errors.state}
                </p>
              )}
            </div>

          </div>

          <div className="button-group">

            <button
              type="submit"
              className="save-btn"
            >
              {loading ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                />
              ) : isEditMode ? (
                "Update Location"
              ) : (
                "Create Location"
              )}
            </button>

            {isEditMode && (
              <button
                type="button"
                className="cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}

          </div>

        </form>

      </div>

      <Typography
        variant="h6"
        sx={{
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        Event Location Table
      </Typography>

      <Box>

        <CustomizedTable
          data={rows}
          columns={columns}
          total={total}
          fetchData={(pageNo, pageSize, options) =>
            dispatch(
              getAllEventLocation({
                pageNo,
                pageSize,
                options,
              })
            )
          }
        />

      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={() =>
          setDeleteDialogOpen(false)
        }
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>

        <DialogContent>
          Are you sure want to delete this
          location?
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setDeleteDialogOpen(false)
            }
          >
            Cancel
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}