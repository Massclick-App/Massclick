import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axiosInstance from "../../services/axiosInstance.js";
import {
  AUTH_STATE_EVENT,
  getAuthDebugSnapshot,
} from "../../auth/authStore.js";

const API_URL = process.env.REACT_APP_API_URL;

const SessionCard = ({ title, session }) => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h6">{title}</Typography>
        <Chip
          label={session.isAuthenticated ? "Active" : "Inactive"}
          color={session.isAuthenticated ? "success" : "default"}
          size="small"
        />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Session Type: {session.sessionType}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Expires At: {session.expiresAt || "n/a"}
      </Typography>
      {session.userRole ? (
        <Typography variant="body2" color="text.secondary">
          Role: {session.userRole}
        </Typography>
      ) : null}
      {session.user?.userName ? (
        <Typography variant="body2" color="text.secondary">
          User: {session.user.userName}
        </Typography>
      ) : null}
      {session.deviceId ? (
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
          Device: {session.deviceId}
        </Typography>
      ) : null}
    </CardContent>
  </Card>
);

export default function AuthConsole() {
  const [browserState, setBrowserState] = useState(getAuthDebugSnapshot());
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [audit, setAudit] = useState([]);
  const [tokenToInspect, setTokenToInspect] = useState("");
  const [inspection, setInspection] = useState(null);
  const [error, setError] = useState("");

  const loadServerState = async () => {
    try {
      setError("");
      const [overviewRes, sessionsRes, auditRes] = await Promise.all([
        axiosInstance.get(`${API_URL}/admin/auth/overview`),
        axiosInstance.get(`${API_URL}/admin/auth/sessions`, { params: { limit: 25 } }),
        axiosInstance.get(`${API_URL}/admin/auth/audit`, { params: { limit: 25 } }),
      ]);
      setOverview(overviewRes.data);
      setSessions(sessionsRes.data.sessions || []);
      setAudit(auditRes.data.events || []);
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || "Failed to load auth diagnostics");
    }
  };

  useEffect(() => {
    const sync = () => setBrowserState(getAuthDebugSnapshot());
    sync();
    window.addEventListener(AUTH_STATE_EVENT, sync);
    loadServerState();
    return () => window.removeEventListener(AUTH_STATE_EVENT, sync);
  }, []);

  const inspectToken = async () => {
    try {
      setError("");
      const { data } = await axiosInstance.post(`${API_URL}/admin/auth/introspect`, {
        token: tokenToInspect,
      });
      setInspection(data);
    } catch (inspectError) {
      setError(inspectError?.response?.data?.error || inspectError?.message || "Failed to inspect token");
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Auth Console
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Centralized browser and backend diagnostics for admin, customer, public client, websocket, and FCM auth.
          </Typography>
        </Box>
        <Button variant="contained" onClick={loadServerState}>
          Refresh
        </Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <SessionCard title="Admin Session" session={browserState.admin} />
        </Grid>
        <Grid item xs={12} md={4}>
          <SessionCard title="Customer Session" session={browserState.customer} />
        </Grid>
        <Grid item xs={12} md={4}>
          <SessionCard title="Public Client Session" session={browserState.publicClient} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Client Debug</Typography>
              <Typography variant="body2" color="text.secondary">
                Last Auth Failure: {browserState.debug.lastAuthFailure?.message || "n/a"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Refresh: {browserState.debug.lastTokenRefresh?.occurredAt || "n/a"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Websocket: {browserState.debug.websocket.state}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Websocket Error: {browserState.debug.websocket.lastError || "n/a"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                FCM: {browserState.debug.fcm.state}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                FCM Error: {browserState.debug.fcm.lastError || "n/a"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1.5 }}>Backend Overview</Typography>
              <Typography variant="body2" color="text.secondary">
                Active Admin Sessions: {overview?.overview?.activeAdminSessions ?? "n/a"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Public Sessions: {overview?.overview?.activePublicClientSessions ?? "n/a"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Customer Session Model: {overview?.overview?.customerOtpSessions ?? "n/a"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Policy Count: {overview?.overview?.policyCount ?? "n/a"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Token Introspection</Typography>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              fullWidth
              label="Paste access token"
              value={tokenToInspect}
              onChange={(event) => setTokenToInspect(event.target.value)}
            />
            <Button variant="contained" onClick={inspectToken} disabled={!tokenToInspect.trim()}>
              Inspect
            </Button>
          </Stack>
          {inspection ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Active: {String(inspection.active)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                Result: {JSON.stringify(inspection.actor || inspection.error, null, 2)}
              </Typography>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">Live Sessions</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1.5}>
                {sessions.map((session) => (
                  <Box key={session.id}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {session.actorType} / {session.sessionType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Subject: {session.subjectId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Client: {session.clientId || "n/a"} | Device: {session.deviceId || "n/a"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6">Recent Audit</Typography>
              <Divider sx={{ my: 1.5 }} />
              <Stack spacing={1.5}>
                {audit.map((event) => (
                  <Box key={event.id}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {event.eventType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {event.createdAt} | {event.actor?.actorType || "anonymous"} | {event.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {event.method || "n/a"} {event.path || ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
