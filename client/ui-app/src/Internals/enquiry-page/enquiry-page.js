import React, { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { getAllStartProjects, editStartProject } from "../../redux/actions/startProjectAction.js";
import CustomizedTable from "../../components/Table/CustomizedTable.js";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid, Chip, Avatar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
export default function EnquiryPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const {
    projects = []
  } = useSelector(state => state.startProjectReducer || {});
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  useEffect(() => {
    dispatch(getAllStartProjects());
  }, [dispatch]);
  const handleFetchData = useCallback((pageNo, pageSize, options) => {
    dispatch(getAllStartProjects());
  }, [dispatch]);
  const handleRowClick = row => {
    setSelectedEnquiry(row);
    setOpenDetails(true);
  };
  const handleCloseDetails = () => {
    setOpenDetails(false);
    setTimeout(() => setSelectedEnquiry(null), 300);
  };
  const handleMarkClosed = item => {
    const confirmClose = window.confirm("Mark this enquiry as closed? You can still view it later from the filters.");
    if (!confirmClose) return;
    dispatch(editStartProject(item._id, {
      isActive: false
    })).then(() => {
      dispatch(getAllStartProjects());
      handleCloseDetails();
    }).catch(() => {});
  };
  const getInitials = (name = "") => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  };
  const filteredProjects = projects.filter((project) => {
    if (statusFilter === "open") return project.isActive !== false;
    if (statusFilter === "closed") return project.isActive === false;
    return true;
  });
  const totalEnquiries = projects.length;
  const openEnquiries = projects.filter(p => p.isActive !== false).length;
  const closedEnquiries = projects.filter(p => p.isActive === false).length;
  const columns = [{
    id: "fullName",
    label: "Name / Business",
    renderCell: (value, row) => <Box onClick={() => handleRowClick(row)} sx={{
      cursor: "pointer"
    }}>
          <Box sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75
      }}>
            <Avatar sx={{
          width: 28,
          height: 28,
          backgroundColor: "#ff7a00"
        }}>
              {getInitials(row.fullName || row.businessName)}
            </Avatar>
            <Box>
              <Typography sx={{
            fontWeight: 600,
            fontSize: "14px"
          }}>
                {row.fullName}
              </Typography>
              {row.businessName && <Typography sx={{
            fontSize: "12px",
            color: "#6b7280"
          }}>
                  {row.businessName}
                </Typography>}
            </Box>
          </Box>
        </Box>
  }, {
    id: "email",
    label: "Email",
    renderCell: value => <Typography sx={{
      fontSize: "13px",
      color: "#1f2937"
    }}>
          {value || "—"}
        </Typography>
  }, {
    id: "contactNumber",
    label: "Phone",
    renderCell: value => <Typography sx={{
      fontSize: "13px",
      color: "#1f2937"
    }}>
          {value || "—"}
        </Typography>
  }, {
    id: "city",
    label: "Location",
    renderCell: (value, row) => <Typography sx={{
      fontSize: "13px",
      color: "#1f2937"
    }}>
          {value || row.state || "—"}
        </Typography>
  }, {
    id: "submittedAt",
    label: "Date",
    renderCell: value => value ? new Date(value).toLocaleDateString() : "—"
  }, {
    id: "isActive",
    label: "Status",
    renderCell: value => <Box sx={{
      display: "inline-flex",
      alignItems: "center",
      gap: 0.5,
      px: 1.5,
      py: 0.5,
      borderRadius: "16px",
      backgroundColor: value !== false ? "#d1fae5" : "#fee2e2",
      color: value !== false ? "#065f46" : "#991b1b",
      fontSize: "12px",
      fontWeight: 600
    }}>
          {value !== false ? <>
              <CheckCircleIcon sx={{
          fontSize: "14px"
        }} />
              Open
            </> : <>
              <ErrorIcon sx={{
          fontSize: "14px"
        }} />
              Closed
            </>}
        </Box>
  }, {
    id: "action",
    label: "Action",
    renderCell: (_, row) => <Button variant="contained" size="small" onClick={() => handleRowClick(row)} sx={{
      backgroundColor: "#ff7a00",
      textTransform: "none",
      "&:hover": {
        backgroundColor: "#e56a00"
      }
    }}>
          View
        </Button>
  }];
  return <>
      {/* Metrics Header */}
      <Box sx={{
      px: 3,
      pt: 3,
      pb: 2
    }}>
        <Typography variant="h4" sx={{
        fontWeight: 800,
        mb: 1
      }}>
          Business Enquiries
        </Typography>
        <Typography sx={{
        color: "#6b7280",
        mb: 3
      }}>
          Central inbox for all enquiries coming from your website & lead forms.
          Reach out, update status, and never miss a potential client.
        </Typography>

        <Grid container spacing={2} sx={{
        mb: 3
      }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
            border: "1px solid rgba(234, 88, 12, 0.3)",
            borderRadius: "12px",
            p: 2
          }}>
              <Typography sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase"
            }}>
                Total
              </Typography>
              <Typography sx={{
              fontSize: "28px",
              fontWeight: 700,
              my: 1
            }}>
                {totalEnquiries}
              </Typography>
              <Typography sx={{
              fontSize: "12px",
              color: "#6b7280"
            }}>
                All enquiries
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            p: 2
          }}>
              <Typography sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase"
            }}>
                Open
              </Typography>
              <Typography sx={{
              fontSize: "28px",
              fontWeight: 700,
              my: 1,
              color: "#065f46"
            }}>
                {openEnquiries}
              </Typography>
              <Typography sx={{
              fontSize: "12px",
              color: "#6b7280"
            }}>
                Awaiting action
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            p: 2
          }}>
              <Typography sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase"
            }}>
                Closed
              </Typography>
              <Typography sx={{
              fontSize: "28px",
              fontWeight: 700,
              my: 1,
              color: "#991b1b"
            }}>
                {closedEnquiries}
              </Typography>
              <Typography sx={{
              fontSize: "12px",
              color: "#6b7280"
            }}>
                Handled
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            p: 2
          }}>
              <Typography sx={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#9ca3af",
              textTransform: "uppercase"
            }}>
                Response Rate
              </Typography>
              <Typography sx={{
              fontSize: "28px",
              fontWeight: 700,
              my: 1
            }}>
                {totalEnquiries > 0 ? Math.round(closedEnquiries / totalEnquiries * 100) : 0}%
              </Typography>
              <Typography sx={{
              fontSize: "12px",
              color: "#6b7280"
            }}>
                Closure rate
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Table */}
      <CustomizedTable
        title={statusFilter === "open" ? "Open Enquiries" : statusFilter === "closed" ? "Closed Enquiries" : "All Enquiries"}
        columns={columns}
        data={filteredProjects}
        total={filteredProjects.length}
        fetchData={handleFetchData}
        enableSearch={true}
        enableStatusFilter={false}
      />

      {/* Details Modal */}
      <Dialog open={openDetails} onClose={handleCloseDetails} maxWidth="sm" fullWidth PaperProps={{
      sx: {
        borderRadius: "12px",
        boxShadow: "0 20px 50px rgba(0,0,0,0.15)"
      }
    }}>
        <DialogTitle sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "18px",
        fontWeight: 700,
        borderBottom: "1px solid #e5e7eb",
        pb: 2
      }}>
          Enquiry Details
          <CloseIcon onClick={handleCloseDetails} sx={{
          cursor: "pointer",
          fontSize: "20px"
        }} />
        </DialogTitle>

        <DialogContent sx={{
        paddingTop: "24px"
      }}>
          {selectedEnquiry && <Grid container spacing={3}>
              {/* Contact Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{
              color: "#6b7280",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "11px",
              mb: 2
            }}>
                  Contact Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Full Name
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.fullName || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Email
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.email || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Phone
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.contactNumber || "—"}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Business Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{
              color: "#6b7280",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "11px",
              mb: 2
            }}>
                  Business Information
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Business Name
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.businessName || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Category
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.category || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Business Type
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.businessType || "—"}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Location Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{
              color: "#6b7280",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "11px",
              mb: 2
            }}>
                  Location
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      City
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.city || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      State
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.state || "—"}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Address
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.address || "—"}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Message Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{
              color: "#6b7280",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "11px",
              mb: 2
            }}>
                  Message
                </Typography>
                <Box sx={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              p: 2,
              minHeight: "80px"
            }}>
                  <Typography sx={{
                color: "#1f2937",
                fontSize: "13px",
                lineHeight: 1.6
              }}>
                    {selectedEnquiry.message || "No message provided."}
                  </Typography>
                </Box>
              </Grid>

              {/* Meta Section */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{
              color: "#6b7280",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "11px",
              mb: 2
            }}>
                  Additional Info
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Status
                    </Typography>
                    <Chip label={selectedEnquiry.isActive !== false ? "Open" : "Closed"} size="small" color={selectedEnquiry.isActive !== false ? "success" : "error"} variant="filled" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography sx={{
                  color: "#6b7280",
                  fontSize: "12px",
                  fontWeight: 600,
                  mb: 0.5
                }}>
                      Submitted
                    </Typography>
                    <Typography sx={{
                  color: "#1f2937",
                  fontWeight: 500
                }}>
                      {selectedEnquiry.submittedAt ? new Date(selectedEnquiry.submittedAt).toLocaleDateString() : "—"}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>}
        </DialogContent>

        <DialogActions sx={{
        padding: "16px",
        borderTop: "1px solid #e5e7eb",
        gap: 1
      }}>
          <Button onClick={handleCloseDetails} variant="outlined">
            Close
          </Button>
          {selectedEnquiry?.isActive !== false && <Button onClick={() => handleMarkClosed(selectedEnquiry)} variant="contained" color="error">
              Mark as Closed
            </Button>}
        </DialogActions>
      </Dialog>
    </>;
}
