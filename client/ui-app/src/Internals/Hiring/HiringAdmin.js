import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import {
  deleteAdminJob, fetchAdminJobs, fetchApplications, saveAdminJob,
  updateApplicationStatus,
} from "../../redux/actions/hiringActions.js";

const emptyJob = {
  title: "", department: "", location: "", employmentType: "Full time",
  workplaceType: "On-site", experience: "", qualification: "", summary: "",
  description: "", responsibilities: "", requirements: "", status: "draft",
  applicationDeadline: "",
};
const statusColors = { draft: "default", published: "success", closed: "warning" };
const applicationStatuses = ["new", "reviewing", "shortlisted", "interview", "rejected", "hired"];

export default function HiringAdmin() {
  const dispatch = useDispatch();
  const { jobs, applications, loading, error } = useSelector((state) => state.hiring);
  const [tab, setTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyJob);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchAdminJobs()).catch(() => {});
    dispatch(fetchApplications()).catch(() => {});
  }, [dispatch]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => [job.title, job.department, job.location].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [jobs, search]);

  const openCreate = () => { setEditingId(null); setForm(emptyJob); setDialogOpen(true); };
  const openEdit = (job) => {
    setEditingId(job._id);
    setForm({
      ...emptyJob, ...job,
      responsibilities: (job.responsibilities || []).join("\n"),
      requirements: (job.requirements || []).join("\n"),
      applicationDeadline: job.applicationDeadline ? String(job.applicationDeadline).slice(0, 10) : "",
    });
    setDialogOpen(true);
  };
  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const save = async () => {
    await dispatch(saveAdminJob(form, editingId));
    setDialogOpen(false);
  };
  const remove = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? Applications remain stored for review.`)) return;
    await dispatch(deleteAdminJob(job._id));
  };

  return <Box sx={{ width: "100%", maxWidth: 1500 }}>
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: "1px solid #e8ebf0", borderRadius: 3 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
        <Box><Typography variant="h4" fontWeight={800}>Hiring management</Typography><Typography color="text.secondary" sx={{ mt: .5 }}>Publish vacancies and review candidate applications.</Typography></Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ alignSelf: { xs: "stretch", sm: "center" }, bgcolor: "#ea6d11", "&:hover": { bgcolor: "#c95408" } }}>New vacancy</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mt: 3, borderBottom: "1px solid #edf0f4" }}>
        <Tab label={`Vacancies (${jobs.length})`} />
        <Tab label={`Applications (${applications.length})`} />
      </Tabs>

      {tab === 0 && <Box sx={{ pt: 2 }}>
        <TextField size="small" placeholder="Search title, department or location" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2, width: { xs: "100%", sm: 360 } }} />
        <TableContainer sx={{ border: "1px solid #edf0f4", borderRadius: 2 }}>
          <Table>
            <TableHead><TableRow><TableCell>Position</TableCell><TableCell>Department</TableCell><TableCell>Location</TableCell><TableCell>Status</TableCell><TableCell>Deadline</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
            <TableBody>
              {filteredJobs.map((job) => <TableRow key={job._id} hover>
                <TableCell><Typography fontWeight={750}>{job.title}</Typography><Typography variant="caption" color="text.secondary">{job.employmentType} · {job.workplaceType}</Typography></TableCell>
                <TableCell>{job.department}</TableCell><TableCell>{job.location}</TableCell>
                <TableCell><Chip size="small" label={job.status} color={statusColors[job.status]} /></TableCell>
                <TableCell>{job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : "Open"}</TableCell>
                <TableCell align="right"><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEdit(job)}>Edit</Button><Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => remove(job)}>Delete</Button></TableCell>
              </TableRow>)}
              {!filteredJobs.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>{loading ? "Loading…" : "No vacancies found."}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>}

      {tab === 1 && <Box sx={{ pt: 2 }}>
        <TableContainer sx={{ border: "1px solid #edf0f4", borderRadius: 2 }}>
          <Table>
            <TableHead><TableRow><TableCell>Candidate</TableCell><TableCell>Position</TableCell><TableCell>Contact</TableCell><TableCell>Experience</TableCell><TableCell>Status</TableCell><TableCell>Resume</TableCell></TableRow></TableHead>
            <TableBody>
              {applications.map((application) => <TableRow key={application._id} hover>
                <TableCell><Typography fontWeight={750}>{application.fullName}</Typography><Typography variant="caption" color="text.secondary">{application.currentLocation}</Typography></TableCell>
                <TableCell>{application.job?.title || "Deleted vacancy"}</TableCell>
                <TableCell><Typography variant="body2">{application.email}</Typography><Typography variant="caption">{application.phone}</Typography></TableCell>
                <TableCell>{application.experience}</TableCell>
                <TableCell><Select size="small" value={application.status} onChange={(event) => dispatch(updateApplicationStatus(application._id, { status: event.target.value }))} sx={{ minWidth: 130 }}>{applicationStatuses.map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</Select></TableCell>
                <TableCell>{application.resumeUrl ? <Button size="small" component="a" href={application.resumeUrl} target="_blank" rel="noreferrer" endIcon={<OpenInNewRoundedIcon />}>Resume</Button> : "Unavailable"}</TableCell>
              </TableRow>)}
              {!applications.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>{loading ? "Loading…" : "No applications received."}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>}
    </Paper>

    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
      <DialogTitle fontWeight={800}>{editingId ? "Edit vacancy" : "Create vacancy"}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
          <TextField required label="Job title" name="title" value={form.title} onChange={change} />
          <TextField required label="Department" name="department" value={form.department} onChange={change} />
          <TextField required label="Location" name="location" value={form.location} onChange={change} />
          <TextField label="Experience" name="experience" value={form.experience} onChange={change} placeholder="e.g. 2–4 years" />
          <FormControl><InputLabel>Employment type</InputLabel><Select label="Employment type" name="employmentType" value={form.employmentType} onChange={change}>{["Full time", "Part time", "Contract", "Internship"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
          <FormControl><InputLabel>Workplace type</InputLabel><Select label="Workplace type" name="workplaceType" value={form.workplaceType} onChange={change}>{["On-site", "Remote", "Hybrid"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
          <TextField label="Qualification" name="qualification" value={form.qualification} onChange={change} sx={{ gridColumn: { sm: "1 / -1" } }} />
          <TextField required label="Short summary" name="summary" value={form.summary} onChange={change} multiline minRows={2} sx={{ gridColumn: { sm: "1 / -1" } }} />
          <TextField required label="Job description" name="description" value={form.description} onChange={change} multiline minRows={4} sx={{ gridColumn: { sm: "1 / -1" } }} />
          <TextField label="Responsibilities (one per line)" name="responsibilities" value={form.responsibilities} onChange={change} multiline minRows={4} />
          <TextField label="Requirements (one per line)" name="requirements" value={form.requirements} onChange={change} multiline minRows={4} />
          <FormControl><InputLabel>Status</InputLabel><Select label="Status" name="status" value={form.status} onChange={change}>{["draft", "published", "closed"].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl>
          <TextField type="date" label="Application deadline" name="applicationDeadline" value={form.applicationDeadline} onChange={change} InputLabelProps={{ shrink: true }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}><Button onClick={() => setDialogOpen(false)}>Cancel</Button><Button variant="contained" onClick={save} disabled={loading} sx={{ bgcolor: "#ea6d11", "&:hover": { bgcolor: "#c95408" } }}>{loading ? "Saving…" : "Save vacancy"}</Button></DialogActions>
    </Dialog>
  </Box>;
}
