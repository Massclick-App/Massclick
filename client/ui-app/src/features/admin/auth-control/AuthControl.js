import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import axiosInstance from "shared/services/axiosInstance.js";
import {
  AUTH_STATE_EVENT,
  getAuthDebugSnapshot,
} from "app/auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL;

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-IN");

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getStatusColor = (status) => {
  if (status === "active") return "success";
  if (status === "revoked") return "error";
  if (status === "expired") return "warning";
  return "default";
};

function MetricCard({ icon: Icon, label, value, note, color = "#0f172a" }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Icon sx={{ color, fontSize: 21 }} />
          <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 700 }}>
            {label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 28, lineHeight: 1, fontWeight: 800, color }}>
          {value}
        </Typography>
        {note ? (
          <Typography sx={{ mt: 0.75, fontSize: 12, color: "text.secondary" }}>
            {note}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title, meta, children }) {
  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", md: "center" }}
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Icon sx={{ fontSize: 22, color: "#ef7c1a" }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {meta ? (
            <Typography variant="body2" color="text.secondary">
              {meta}
            </Typography>
          ) : null}
        </Box>
      </Stack>
      {children ? <Stack direction="row" spacing={1} flexWrap="wrap">{children}</Stack> : null}
    </Stack>
  );
}

function BrowserSessionCard({ title, session }) {
  return (
    <Card variant="outlined" sx={{ height: "100%", borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
          <Chip
            size="small"
            label={session.isAuthenticated ? "Active" : "Inactive"}
            color={session.isAuthenticated ? "success" : "default"}
          />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Type: {session.sessionType}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Expires: {formatDateTime(session.expiresAt)}
        </Typography>
        {session.userRole ? (
          <Typography variant="body2" color="text.secondary">
            Role: {session.userRole}
          </Typography>
        ) : null}
        {session.mobile ? (
          <Typography variant="body2" color="text.secondary">
            Mobile: {session.mobile}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function AuthControl() {
  const [browserState, setBrowserState] = useState(getAuthDebugSnapshot());
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatus, setAdminStatus] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [auditEventType, setAuditEventType] = useState("");
  const [auditActorType, setAuditActorType] = useState("");
  const [tokenToInspect, setTokenToInspect] = useState("");
  const [inspection, setInspection] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const initialLoadDone = useRef(false);

  const metrics = overview?.overview || {};

  const loadServerState = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [overviewRes, sessionsRes, adminsRes, customersRes, auditRes] =
        await Promise.all([
          axiosInstance.get(`${API_URL}/admin/auth/overview`),
          axiosInstance.get(`${API_URL}/admin/auth/sessions`, {
            params: {
              limit: 50,
              search: sessionSearch || undefined,
              sessionType: sessionType || undefined,
              includeRevoked: includeRevoked ? "true" : undefined,
            },
          }),
          axiosInstance.get(`${API_URL}/admin/auth/admin-users`, {
            params: {
              limit: 100,
              search: adminSearch || undefined,
              status: adminStatus || undefined,
            },
          }),
          axiosInstance.get(`${API_URL}/admin/auth/customers`, {
            params: {
              limit: 100,
              search: customerSearch || undefined,
            },
          }),
          axiosInstance.get(`${API_URL}/admin/auth/audit`, {
            params: {
              limit: 80,
              eventType: auditEventType || undefined,
              actorType: auditActorType || undefined,
            },
          }),
        ]);

      setOverview(overviewRes.data);
      setSessions(sessionsRes.data.sessions || []);
      setAdmins(adminsRes.data.admins || []);
      setCustomers(customersRes.data.customers || []);
      setAudit(auditRes.data.events || []);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load auth control data"));
    } finally {
      setLoading(false);
    }
  }, [
    adminSearch,
    adminStatus,
    auditActorType,
    auditEventType,
    customerSearch,
    includeRevoked,
    sessionSearch,
    sessionType,
  ]);

  useEffect(() => {
    const sync = () => setBrowserState(getAuthDebugSnapshot());
    sync();
    window.addEventListener(AUTH_STATE_EVENT, sync);
    return () => window.removeEventListener(AUTH_STATE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    loadServerState();
  }, [loadServerState]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const intervalId = window.setInterval(loadServerState, 30000);
    return () => window.clearInterval(intervalId);
  }, [autoRefresh, loadServerState]);

  const runCommand = async ({ confirmText, request, success }) => {
    if (confirmText && !window.confirm(confirmText)) return;

    try {
      setBusy(true);
      setError("");
      setNotice("");
      const { data } = await request();
      setNotice(typeof success === "function" ? success(data) : success);
      await loadServerState();
    } catch (commandError) {
      setError(getErrorMessage(commandError, "Auth command failed"));
    } finally {
      setBusy(false);
    }
  };

  const inspectToken = async () => {
    try {
      setBusy(true);
      setError("");
      const { data } = await axiosInstance.post(`${API_URL}/admin/auth/introspect`, {
        token: tokenToInspect,
      });
      setInspection(data);
    } catch (inspectError) {
      setError(getErrorMessage(inspectError, "Failed to inspect token"));
    } finally {
      setBusy(false);
    }
  };

  const auditEventOptions = useMemo(() => {
    const values = new Set(audit.map((event) => event.eventType).filter(Boolean));
    ["login", "login_failed", "logout", "revocation", "recovery", "otp_sent"].forEach((value) =>
      values.add(value)
    );
    return Array.from(values).sort();
  }, [audit]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1680, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#0f172a" }}>
            Auth Control
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Admin sessions, OTP users, recovery, and audit activity.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
            }
            label="Auto refresh"
          />
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress color="inherit" size={16} /> : <RefreshRoundedIcon />}
            onClick={loadServerState}
            disabled={loading || busy}
          >
            Refresh
          </Button>
        </Stack>
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <MetricCard
          icon={AdminPanelSettingsRoundedIcon}
          label="Active Admin Sessions"
          value={formatNumber(metrics.activeAdminSessions)}
          note={`${formatNumber(metrics.adminUsers)} admin accounts`}
          color="#0f766e"
        />
        <MetricCard
          icon={PhoneIphoneRoundedIcon}
          label="OTP Users"
          value={formatNumber(metrics.customerOtpUsers)}
          note={`${formatNumber(metrics.customersLoggedInToday)} logged in today`}
          color="#ea580c"
        />
        <MetricCard
          icon={LogoutRoundedIcon}
          label="Force Logged Out"
          value={formatNumber(metrics.customersForceLoggedOut)}
          note={`${formatNumber(metrics.revokedOAuthSessions)} OAuth sessions revoked`}
          color="#dc2626"
        />
        <MetricCard
          icon={LockOpenRoundedIcon}
          label="Admin Recovery Queue"
          value={formatNumber(metrics.lockedAdminUsers)}
          note={`${formatNumber(metrics.inactiveAdminUsers)} inactive admin accounts`}
          color="#7c3aed"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
          mb: 3,
        }}
      >
        <BrowserSessionCard title="This Browser Admin" session={browserState.admin} />
        <BrowserSessionCard title="This Browser OTP User" session={browserState.customer} />
        <BrowserSessionCard title="This Browser Public Client" session={browserState.publicClient} />
      </Box>

      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <SectionTitle
            icon={AdminPanelSettingsRoundedIcon}
            title="Admin Accounts"
            meta={`${admins.length} shown`}
          >
            <Button
              color="error"
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              disabled={busy || loading}
              onClick={() =>
                runCommand({
                  confirmText:
                    "Log out all other admin sessions? Your current session will stay active.",
                  request: () =>
                    axiosInstance.post(`${API_URL}/admin/auth/admin-users/logout-all`, {
                      confirm: true,
                      includeCurrent: false,
                    }),
                  success: (data) => `${data.loggedOut} admin sessions logged out`,
                })
              }
            >
              Log out admins
            </Button>
          </SectionTitle>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="Search admins"
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadServerState();
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="admin-status-filter-label">Status</InputLabel>
              <Select
                labelId="admin-status-filter-label"
                label="Status"
                value={adminStatus}
                onChange={(event) => setAdminStatus(event.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="locked">Locked</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              onClick={loadServerState}
              disabled={loading || busy}
            >
              Search
            </Button>
          </Stack>

          <TableContainer sx={{ maxHeight: 440 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Admin</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Sessions</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{admin.userName || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {admin.emailId || admin.contact || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{admin.role || "-"}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={admin.isActive ? "Active" : "Inactive"}
                          color={admin.isActive ? "success" : "default"}
                          variant={admin.isActive ? "filled" : "outlined"}
                        />
                        {admin.isLocked ? <Chip size="small" label="Locked" color="warning" /> : null}
                        {admin.loginAttempts ? (
                          <Chip size="small" label={`${admin.loginAttempts} attempts`} variant="outlined" />
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{formatDateTime(admin.lastLoginAt || admin.lastSessionAt)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {admin.activeSessions} active / {admin.totalSessions} total
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          color="warning"
                          variant="outlined"
                          startIcon={<RestartAltRoundedIcon />}
                          disabled={busy || loading}
                          onClick={() =>
                            runCommand({
                              request: () =>
                                axiosInstance.post(
                                  `${API_URL}/admin/auth/admin-users/${admin.id}/recover`
                                ),
                              success: `${admin.userName || admin.emailId} recovered`,
                            })
                          }
                        >
                          Recover
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<LogoutRoundedIcon />}
                          disabled={busy || loading || admin.activeSessions === 0}
                          onClick={() =>
                            runCommand({
                              confirmText: `Log out ${admin.userName || admin.emailId} from active admin sessions?`,
                              request: () =>
                                axiosInstance.post(
                                  `${API_URL}/admin/auth/admin-users/${admin.id}/logout`
                                ),
                              success: (data) =>
                                `${admin.userName || admin.emailId} logged out from ${data.loggedOut} sessions`,
                            })
                          }
                        >
                          Log out
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!admins.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? "Loading admins..." : "No admin accounts found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <SectionTitle
            icon={SecurityRoundedIcon}
            title="OAuth Sessions"
            meta={`${sessions.length} shown`}
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="Search sessions"
              value={sessionSearch}
              onChange={(event) => setSessionSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadServerState();
              }}
            />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel id="session-type-filter-label">Type</InputLabel>
              <Select
                labelId="session-type-filter-label"
                label="Type"
                value={sessionType}
                onChange={(event) => setSessionType(event.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="public">Public client</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={includeRevoked}
                  onChange={(event) => setIncludeRevoked(event.target.checked)}
                />
              }
              label="Revoked"
            />
            <Button
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              onClick={loadServerState}
              disabled={loading || busy}
            >
              Search
            </Button>
          </Stack>

          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Actor</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Device / Client</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>
                        {session.userName || session.clientId || session.subjectId || "-"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.emailId || session.subjectId}
                      </Typography>
                    </TableCell>
                    <TableCell>{session.sessionType}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={session.status}
                        color={getStatusColor(session.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{session.clientId || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.deviceId || "unknown device"}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDateTime(session.accessTokenExpiresAt)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        startIcon={<LogoutRoundedIcon />}
                        disabled={busy || loading || session.status === "revoked"}
                        onClick={() =>
                          runCommand({
                            confirmText: `Revoke this ${session.actorType} session?`,
                            request: () =>
                              axiosInstance.post(
                                `${API_URL}/admin/auth/sessions/${session.id}/revoke`
                              ),
                            success: "Session revoked",
                          })
                        }
                      >
                        Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!sessions.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? "Loading sessions..." : "No sessions found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <SectionTitle
            icon={PhoneIphoneRoundedIcon}
            title="OTP Users"
            meta={`${customers.length} shown`}
          >
            <Button
              color="error"
              variant="outlined"
              startIcon={<LogoutRoundedIcon />}
              disabled={busy || loading || !customers.length}
              onClick={() =>
                runCommand({
                  confirmText:
                    "Log out every OTP user from all existing sessions? They can log in again with OTP.",
                  request: () =>
                    axiosInstance.post(`${API_URL}/admin/auth/customers/logout-all`, {
                      confirm: true,
                    }),
                  success: (data) => `${data.loggedOut} OTP users logged out`,
                })
              }
            >
              Log out OTP users
            </Button>
          </SectionTitle>

          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="Search OTP users"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") loadServerState();
              }}
            />
            <Button
              variant="contained"
              startIcon={<SearchRoundedIcon />}
              onClick={loadServerState}
              disabled={loading || busy}
            >
              Search
            </Button>
          </Stack>

          <TableContainer sx={{ maxHeight: 460 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Account</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Login</TableCell>
                  <TableCell>OTP / Devices</TableCell>
                  <TableCell>Latest Search</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.mobileNumber1} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{customer.userName || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.mobileNumber1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        <Chip
                          size="small"
                          label={customer.businessPeople ? "Business" : "Customer"}
                          color={customer.businessPeople ? "primary" : "default"}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={customer.registeredFrom || "unknown"}
                          variant="outlined"
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDateTime(customer.lastLoginAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.loginCount} logins / token v{customer.tokenVersion}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        {customer.otpPending ? (
                          <Chip size="small" color="warning" label="OTP pending" />
                        ) : (
                          <Chip size="small" variant="outlined" label="No OTP pending" />
                        )}
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`${customer.activeFcmTokens} devices`}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {customer.latestSearch ? (
                        <Box>
                          <Typography variant="body2">
                            {customer.latestSearch.query || "-"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(customer.latestSearch.searchedAt)}
                          </Typography>
                        </Box>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          color="warning"
                          variant="outlined"
                          startIcon={<RestartAltRoundedIcon />}
                          disabled={busy || loading}
                          onClick={() =>
                            runCommand({
                              request: () =>
                                axiosInstance.post(`${API_URL}/admin/auth/customers/recover`, {
                                  mobile: customer.mobileNumber1,
                                }),
                              success: `${customer.userName || customer.mobileNumber1} OTP recovered`,
                            })
                          }
                        >
                          Recover
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<LogoutRoundedIcon />}
                          disabled={busy || loading}
                          onClick={() =>
                            runCommand({
                              confirmText: `Log out ${customer.userName || customer.mobileNumber1} from all OTP sessions?`,
                              request: () =>
                                axiosInstance.post(`${API_URL}/admin/auth/customers/logout`, {
                                  mobile: customer.mobileNumber1,
                                }),
                              success: (data) =>
                                `${data.customer.userName || data.customer.mobileNumber1} logged out`,
                            })
                          }
                        >
                          Log out
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!customers.length ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        {loading ? "Loading OTP users..." : "No OTP users found."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 0.9fr) minmax(0, 1.1fr)" },
          gap: 2,
        }}
      >
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <SectionTitle icon={VpnKeyRoundedIcon} title="Token Inspection" />
            <Stack spacing={1.5}>
              <TextField
                label="Access token"
                value={tokenToInspect}
                onChange={(event) => setTokenToInspect(event.target.value)}
                multiline
                minRows={4}
              />
              <Button
                variant="contained"
                startIcon={<VpnKeyRoundedIcon />}
                disabled={busy || !tokenToInspect.trim()}
                onClick={inspectToken}
              >
                Inspect
              </Button>
              {inspection ? (
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {JSON.stringify(inspection, null, 2)}
                </Box>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <SectionTitle
              icon={HistoryRoundedIcon}
              title="Audit Activity"
              meta={`${audit.length} events`}
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="audit-event-filter-label">Event</InputLabel>
                <Select
                  labelId="audit-event-filter-label"
                  label="Event"
                  value={auditEventType}
                  onChange={(event) => setAuditEventType(event.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  {auditEventOptions.map((eventType) => (
                    <MenuItem key={eventType} value={eventType}>
                      {eventType}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <InputLabel id="audit-actor-filter-label">Actor</InputLabel>
                <Select
                  labelId="audit-actor-filter-label"
                  label="Actor"
                  value={auditActorType}
                  onChange={(event) => setAuditActorType(event.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="publicClient">Public client</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                startIcon={<SearchRoundedIcon />}
                onClick={loadServerState}
                disabled={loading || busy}
              >
                Search
              </Button>
            </Stack>
            <Divider sx={{ mb: 1 }} />
            <TableContainer sx={{ maxHeight: 430 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Path</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audit.map((event) => (
                    <TableRow key={event.id} hover>
                      <TableCell>{formatDateTime(event.createdAt)}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                          {event.eventType}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.message || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {event.actor?.userName ||
                            event.actor?.mobile ||
                            event.actor?.actorType ||
                            "anonymous"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {event.source || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {event.method || ""} {event.path || ""}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!audit.length ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography variant="body2" color="text.secondary">
                          {loading ? "Loading audit..." : "No audit events found."}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
