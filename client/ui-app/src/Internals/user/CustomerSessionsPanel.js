import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axiosInstance from "../../services/axiosInstance.js";

const API_URL = process.env.REACT_APP_API_URL;

const formatDateTime = (value) => {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function CustomerSessionsPanel({
  title = "Customer Sessions",
  description = "Search customer OTP accounts and log them out from every device.",
}) {
  const [customers, setCustomers] = useState([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerSearch, setCustomerSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadCustomers = useCallback(async (search = "") => {
    try {
      setLoading(true);
      setError("");
      const { data } = await axiosInstance.get(`${API_URL}/admin/auth/customers`, {
        params: { search: search || undefined, limit: 100 },
      });
      setCustomers(data.customers || []);
      setCustomerTotal(data.total || 0);
    } catch (loadError) {
      setError(loadError?.response?.data?.message || loadError?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers("");
  }, [loadCustomers]);

  const logoutCustomer = async (customer) => {
    if (!window.confirm(`Log ${customer.userName || customer.mobileNumber1} out of all devices?`)) return;

    try {
      setBusy(true);
      setError("");
      const { data } = await axiosInstance.post(`${API_URL}/admin/auth/customers/logout`, {
        mobile: customer.mobileNumber1,
      });
      setNotice(
        `${data.customer.userName || data.customer.mobileNumber1} logged out (tokenVersion ${data.customer.tokenVersion})`
      );
      await loadCustomers(customerSearch);
    } catch (logoutError) {
      setError(logoutError?.response?.data?.message || logoutError?.message || "Failed to log out customer");
    } finally {
      setBusy(false);
    }
  };

  const logoutAllCustomers = async () => {
    if (
      !window.confirm(
        `Log out ALL ${customerTotal} customers on every device?\n\nThey stay registered and can log in again with OTP, but every existing session is invalidated.`
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      setError("");
      const { data } = await axiosInstance.post(`${API_URL}/admin/auth/customers/logout-all`, {
        confirm: true,
      });
      setNotice(`${data.loggedOut} customers logged out on all devices`);
      await loadCustomers(customerSearch);
    } catch (logoutError) {
      setError(logoutError?.response?.data?.message || logoutError?.message || "Failed to log out customers");
    } finally {
      setBusy(false);
    }
  };

  const runSearch = () => loadCustomers(customerSearch);

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={1.5}
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {description} {customerTotal} customers total.
            </Typography>
          </Box>
          <Button
            color="error"
            variant="outlined"
            onClick={logoutAllCustomers}
            disabled={busy || loading || customerTotal === 0}
          >
            Log out all customers
          </Button>
        </Stack>

        {notice ? (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>
            {notice}
          </Alert>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        ) : null}

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Search by name or mobile"
            value={customerSearch}
            onChange={(event) => setCustomerSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") runSearch();
            }}
          />
          <Button variant="contained" onClick={runSearch} disabled={busy || loading}>
            {loading ? <CircularProgress size={18} color="inherit" /> : "Search"}
          </Button>
        </Stack>

        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Mobile</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Sessions</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.mobileNumber1} hover>
                  <TableCell>{customer.userName || "-"}</TableCell>
                  <TableCell>{customer.mobileNumber1}</TableCell>
                  <TableCell>
                    {customer.businessPeople ? (
                      <Chip label="Business" size="small" color="primary" variant="outlined" />
                    ) : (
                      <Chip label="Customer" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.forcedLogout ? (
                      <Chip label={`Logged out (v${customer.tokenVersion})`} size="small" color="warning" />
                    ) : (
                      <Chip label="Active" size="small" color="success" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>{formatDateTime(customer.lastLoginAt)}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => logoutCustomer(customer)}
                      disabled={busy || loading}
                    >
                      Log out
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!customers.length ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      {loading ? "Loading customers..." : "No customers match this search."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
