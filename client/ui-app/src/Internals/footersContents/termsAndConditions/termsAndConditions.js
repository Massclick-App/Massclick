import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllTermsAndConditions, createTermsAndConditions, editTermsAndConditions, deleteTermsAndConditions } from "../../../redux/actions/footerContents/termsAndConditionsAction";
import { Box, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import CustomizedTable from "../../../components/Table/CustomizedTable";
import styles from "./termsAndConditions.module.css";
const cx = createScopedClassNames(styles);
const defaultForm = {
  data: [{
    header: "",
    content: ""
  }]
};
const modules = {
  toolbar: [[{
    header: [1, 2, 3, false]
  }], ["bold", "italic", "underline", "strike"], [{
    list: "ordered"
  }, {
    list: "bullet"
  }], [{
    color: []
  }, {
    background: []
  }], ["link"], ["clean"]]
};
const formats = ["header", "bold", "italic", "underline", "strike", "list", "bullet", "color", "background", "link"];
export default function TermsAndConditionsDatas() {
  const dispatch = useDispatch();
  const {
    termsList = [],
    total = 0,
    loading = false
  } = useSelector(state => state.termsAndConditions) || {};
  const [formData, setFormData] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    dispatch(getAllTermsAndConditions());
  }, [dispatch]);
  const resetForm = () => {
    setFormData({
      data: [{
        header: "",
        content: ""
      }]
    });
    setEditingId(null);
  };
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      data: [...prev.data, {
        header: "",
        content: ""
      }]
    }));
  };
  const updateField = (index, field, value) => {
    const updated = [...formData.data];
    updated[index][field] = value;
    setFormData(prev => ({
      ...prev,
      data: updated
    }));
  };
  const removeItem = index => {
    const updated = formData.data.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      data: updated.length ? updated : [{
        header: "",
        content: ""
      }]
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      data: formData.data.filter(item => item.header.trim() && item.content && item.content !== "<p><br></p>")
    };
    if (!payload.data.length) return;
    try {
      if (editingId) {
        await dispatch(editTermsAndConditions(editingId, payload));
      } else {
        await dispatch(createTermsAndConditions(payload));
      }
      setFormData({
        data: [{
          header: "",
          content: ""
        }]
      });
      setEditingId(null);
      dispatch(getAllTermsAndConditions());
    } catch (error) {
      console.error(error);
    }
  };
  const handleEdit = rowId => {
    const found = termsList.find(item => item._id === rowId);
    if (!found) return;
    setEditingId(rowId);
    setFormData({
      data: found.data?.length ? found.data : [{
        header: "",
        content: ""
      }]
    });
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const rows = termsList.map(item => ({
    id: item._id,
    total: item.data?.length || 0,
    preview: item.data?.[0]?.header || "-",
    createdAt: new Date(item.createdAt).toLocaleDateString()
  }));
  const columns = [{
    id: "total",
    label: "Items"
  }, {
    id: "preview",
    label: "Header"
  }, {
    id: "createdAt",
    label: "Created"
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => <div className={cx("terms-table-actions")}>
          <IconButton onClick={() => handleEdit(row.id)}>
            <EditRoundedIcon />
          </IconButton>
          <IconButton color="error" onClick={() => {
        setSelectedId(row.id);
        setDeleteOpen(true);
      }}>
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </div>
  }];
  return <div className={cx("terms-page")}>
      <div className={cx("terms-container")}>
        <div className={cx("terms-card")}>
          <header className={cx("terms-header")}>
            <div>
              <h1>
                {editingId ? "Edit Terms & Conditions" : "Create Terms & Conditions"}
              </h1>
              <p>Premium content management dashboard</p>
            </div>

            <Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={resetForm}>
              Reset
            </Button>
          </header>

          <form onSubmit={handleSubmit}>
            <div className={cx("terms-toolbar")}>
              <h2 className={cx("terms-section-title")}>
                Terms & Conditions
              </h2>

              <Button type="button" variant="contained" startIcon={<AddIcon />} onClick={addItem}>
                Add Item
              </Button>
            </div>

            <div className={cx("terms-list")}>
              {(formData.data || []).map((item, index) => <div className={cx("terms-item terms-item-full")} key={index}>
                  <input className={cx("terms-input")} placeholder={`Header ${index + 1}`} value={item.header || ""} onChange={e => updateField(index, "header", e.target.value)} />

                  <div className={cx("editor-wrapper")}>
                    <ReactQuill value={item.content || ""} onChange={val => updateField(index, "content", val)} modules={modules} formats={formats} />
                  </div>

                  <IconButton type="button" className={cx("terms-delete")} onClick={() => removeItem(index)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </div>)}
            </div>

            <div className={cx("terms-actionbar")}>
              <button type="submit" className={cx("terms-submit")} disabled={loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : editingId ? "Update Terms" : "Publish Terms"}
              </button>
            </div>
          </form>
        </div>

        <Box className={cx("terms-table")}>
          <CustomizedTable data={rows} columns={columns} total={total} fetchData={(pageNo, pageSize, options) => dispatch(getAllTermsAndConditions({
          pageNo,
          pageSize,
          options
        }))} />
        </Box>

        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
          <DialogTitle>Delete Terms</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this record?
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button color="error" variant="contained" onClick={async () => {
            await dispatch(deleteTermsAndConditions(selectedId));
            setDeleteOpen(false);
            dispatch(getAllTermsAndConditions());
          }}>
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>;
}
