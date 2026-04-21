import React from "react";
import { Box, Container, Grid, Paper, Skeleton, Stack } from "@mui/material";
import "./skeleton.css";

/* ──────────────────────────────────────────────────────────────
   Shared style helpers — warm brand-orange shimmer
────────────────────────────────────────────────────────────── */
const SK = {
  base: { bgcolor: "rgba(255,107,44,0.055)" },
  wave: "wave",
};

const S = ({ variant = "rounded", w, h, r, sx, ...rest }) => (
  <Skeleton
    variant={variant}
    width={w}
    height={h}
    animation={SK.wave}
    sx={{ borderRadius: r ?? 2, flexShrink: 0, ...SK.base, ...sx }}
    {...rest}
  />
);

const Circ = ({ size = 20 }) => (
  <Skeleton
    variant="circular"
    width={size}
    height={size}
    animation={SK.wave}
    sx={SK.base}
  />
);

const Txt = ({ w = "100%", h = 14, r = 1, sx } = {}) => (
  <S variant="rounded" w={w} h={h} r={r} sx={sx} />
);

/* Section header: accent bar + title line */
const SectionHead = ({ titleW = 200 }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
    <Box
      className="sk-section-accent"
      sx={{ height: 26, bgcolor: "rgba(255,107,44,0.15)" }}
    />
    <Txt w={titleW} h={22} r={2} />
  </Box>
);

/* ──────────────────────────────────────────────────────────────
   1. LANDING PAGE skeleton
────────────────────────────────────────────────────────────── */
const LandingSkeleton = () => (
  <div className="sk-root">
    {/* ── Category bar ─────────────────────────── */}
    <div className="sk-catbar">
      {[...Array(9)].map((_, i) => (
        <div key={i} className="sk-catitem">
          <Circ size={46} />
          <Txt w={54} h={11} />
        </div>
      ))}
    </div>

    {/* ── Hero section ─────────────────────────── */}
    <div className="sk-hero">
      <Txt w="55%" h={46} r={3} sx={{ maxWidth: 520 }} />
      <Txt w="38%" h={20} r={2} sx={{ maxWidth: 340 }} />
      <Box sx={{ width: "100%", maxWidth: 680, mt: 1 }}>
        <S w="100%" h={58} r={30} />
      </Box>
    </div>

    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ── Featured services ─────────────────── */}
      <SectionHead titleW={220} />
      <div className="sk-hscroll" style={{ marginBottom: "2.5rem" }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="sk-hcard" style={{ width: 180 }}>
            <S w={180} h={130} r={14} />
            <Txt w="70%" h={13} sx={{ mt: 1, mx: "auto" }} />
            <Txt w="50%" h={11} sx={{ mt: 0.5, mx: "auto" }} />
          </div>
        ))}
      </div>

      {/* ── Service cards grid ────────────────── */}
      <SectionHead titleW={180} />
      <Grid container spacing={2} sx={{ mb: 5 }}>
        {[...Array(6)].map((_, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 3,
                border: "1px solid #f0ece8",
                textAlign: "center",
              }}
            >
              <S w="100%" h={96} r={10} />
              <Txt w="78%" h={13} sx={{ mt: 1.25, mx: "auto" }} />
              <Txt w="52%" h={11} sx={{ mt: 0.5, mx: "auto" }} />
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── MassClick banner ─────────────────── */}
      <S w="100%" h={110} r={18} sx={{ mb: 5 }} />

      {/* ── Trending searches ─────────────────── */}
      <SectionHead titleW={190} />
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 5 }}
      >
        {[96, 74, 112, 88, 68, 104, 80, 92, 76, 118].map((w, i) => (
          <S key={i} w={w} h={34} r={999} />
        ))}
      </Stack>

      {/* ── Popular searches carousel ────────── */}
      <SectionHead titleW={210} />
      <div className="sk-hscroll" style={{ marginBottom: "2.5rem" }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="sk-hcard" style={{ width: 240 }}>
            <S w={240} h={150} r={14} />
            <Txt w="65%" h={14} sx={{ mt: 1 }} />
            <Txt w="45%" h={12} sx={{ mt: 0.5 }} />
          </div>
        ))}
      </div>

      {/* ── Top tourist ───────────────────────── */}
      <SectionHead titleW={160} />
      <Grid container spacing={2} sx={{ mb: 5 }}>
        {[...Array(4)].map((_, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <S w="100%" h={150} r={12} />
            <Txt w="60%" h={13} sx={{ mt: 1 }} />
          </Grid>
        ))}
      </Grid>

      {/* ── Blog cards ───────────────────────── */}
      <SectionHead titleW={170} />
      <Grid container spacing={3}>
        {[...Array(3)].map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: "1px solid #f0ece8",
              }}
            >
              <S w="100%" h={170} r={0} />
              <Box sx={{ p: 2 }}>
                <Txt w="85%" h={18} sx={{ mb: 1 }} />
                <Txt w="58%" h={13} sx={{ mb: 1.5 }} />
                <Txt w="100%" h={12} sx={{ mb: 0.5 }} />
                <Txt w="88%" h={12} />
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  </div>
);

/* ──────────────────────────────────────────────────────────────
   2. BUSINESS LIST skeleton
────────────────────────────────────────────────────────────── */
const ListCardRow = () => (
  <div className="sk-root sk-list-card">
    <div className="sk-list-inner">
      {/* Image */}
      <div className="sk-list-img" style={{ width: 140, minWidth: 140 }}>
        <S w={140} h={145} r={12} />
      </div>

      {/* Content */}
      <div className="sk-list-body">
        {/* Title */}
        <Txt w="52%" h={26} r={3} />

        {/* Rating + reviews */}
        <div className="sk-list-meta">
          <S w={66} h={26} r={999} />
          <Txt w={90} h={15} />
          <Txt w={70} h={15} />
        </div>

        {/* Category + address */}
        <div className="sk-list-row">
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Circ size={15} />
            <Txt w={90} h={14} />
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Circ size={15} />
            <Txt w={130} h={14} />
          </Stack>
        </div>

        {/* Details lines */}
        <Txt w="88%" h={13} />
        <Txt w="66%" h={13} />

        {/* Action buttons */}
        <div className="sk-list-actions">
          <S w={96} h={40} r={999} />
          <S w={118} h={40} r={999} />
          <S w={106} h={40} r={999} />
        </div>
      </div>
    </div>
  </div>
);

const ListSkeleton = () => (
  <div className="sk-root">
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Banner ad */}
      <S w="100%" h={110} r={16} sx={{ mb: 3.5 }} />

      {/* Page header */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 4,
          border: "1px solid #f0ece8",
          mb: 2.5,
        }}
      >
        <Txt w="48%" h={34} r={3} />
        <Txt w="32%" h={17} sx={{ mt: 1 }} />
      </Paper>

      {/* Subtitle */}
      <Txt w="78%" h={16} sx={{ mb: 2 }} />

      {/* Trust badge chips */}
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 3.5 }}
      >
        {[...Array(4)].map((_, i) => (
          <Stack
            key={i}
            direction="row"
            alignItems="center"
            spacing={0.6}
            sx={{
              bgcolor: "#f9f7f5",
              borderRadius: 999,
              px: 1.5,
              py: 0.75,
              border: "1px solid #f0ece8",
            }}
          >
            <Circ size={16} />
            <Txt w={[88, 104, 96, 112][i]} h={14} />
          </Stack>
        ))}
      </Stack>

      {/* Business card rows */}
      {[...Array(5)].map((_, i) => (
        <ListCardRow key={i} />
      ))}
    </Container>
  </div>
);

/* ──────────────────────────────────────────────────────────────
   3. BUSINESS DETAILS skeleton
────────────────────────────────────────────────────────────── */
const DetailsSkeleton = () => (
  <div className="sk-root">
    <Container maxWidth="xl" sx={{ py: 3, px: { xs: 2, md: 3.5 } }}>
      {/* Hero banner */}
      <S w="100%" h={{ xs: 200, sm: 260, md: 310 }} r={20} />

      {/* Thumbnail strip */}
      <div className="sk-thumbstrip">
        {[...Array(5)].map((_, i) => (
          <S key={i} w={62} h={62} r={10} />
        ))}
      </div>

      {/* Main 2-col grid */}
      <div className="sk-detail-grid">
        {/* ─── LEFT COLUMN ─── */}
        <div className="sk-detail-left">
          {/* Header card */}
          <div className="sk-detail-card">
            <Txt w="58%" h={32} r={3} />

            {/* Rating row */}
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.25, mb: 0.5 }}>
              <S w={72} h={26} r={999} />
              <Txt w={110} h={16} />
            </Stack>

            {/* Quick facts */}
            <div className="sk-fact-row">
              {[
                { icon: true, w: 130 },
                { icon: true, w: 90 },
                { icon: true, w: 110 },
              ].map(({ w }, i) => (
                <div key={i} className="sk-fact-item">
                  <Circ size={17} />
                  <Txt w={w} h={14} />
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="sk-action-row" style={{ paddingTop: "0.9rem", borderTop: "1px solid #f0ece8", marginTop: "0.85rem" }}>
              <S w={138} h={44} r={999} />
              <S w={128} h={44} r={999} />
              <S w={44} h={44} r={999} />
              <S w={44} h={44} r={999} />
            </div>
          </div>

          {/* Tab bar */}
          <Paper
            elevation={0}
            sx={{ borderRadius: 3, border: "1px solid #f0ece8", overflow: "hidden" }}
          >
            <div className="sk-detail-tabs-bar" style={{ paddingTop: "0.9rem", paddingBottom: "0.9rem" }}>
              {[64, 52, 58, 46, 62].map((w, i) => (
                <Txt key={i} w={w} h={14} />
              ))}
            </div>

            <div className="sk-detail-content">
              {/* Overview section */}
              <Txt w="36%" h={22} r={2} sx={{ mb: 1.5 }} />
              {["100%", "96%", "90%", "84%", "70%"].map((w, i) => (
                <Txt key={i} w={w} h={14} sx={{ mb: 0.75 }} />
              ))}

              {/* Quick info grid */}
              <Txt w="28%" h={20} r={2} sx={{ mt: 2.5, mb: 1.5 }} />
              <div className="sk-detail-grid-2">
                {[...Array(4)].map((_, i) => (
                  <Box key={i}>
                    <Txt w="40%" h={11} sx={{ mb: 0.5 }} />
                    <Txt w="70%" h={18} />
                  </Box>
                ))}
              </div>
            </div>
          </Paper>

          {/* Photos card */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: "1px solid #f0ece8" }}
          >
            <Txt w="22%" h={20} r={2} sx={{ mb: 1.5 }} />
            <div className="sk-detail-photo-grid">
              {[...Array(6)].map((_, i) => (
                <S key={i} w="100%" h={110} r={12} />
              ))}
            </div>
          </Paper>

          {/* Reviews card */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, borderRadius: 3, border: "1px solid #f0ece8" }}
          >
            <Txt w="38%" h={22} r={2} sx={{ mb: 2 }} />
            {[...Array(3)].map((_, i) => (
              <Stack key={i} direction="row" spacing={1.5} sx={{ mb: 2 }}>
                <Circ size={36} />
                <Box sx={{ flex: 1 }}>
                  <Txt w="35%" h={15} sx={{ mb: 0.5 }} />
                  <Txt w="20%" h={13} sx={{ mb: 0.75 }} />
                  <Txt w="90%" h={13} sx={{ mb: 0.4 }} />
                  <Txt w="70%" h={13} />
                </Box>
              </Stack>
            ))}
          </Paper>
        </div>

        {/* ─── RIGHT SIDEBAR ─── */}
        <div className="sk-sidebar">
          <div className="sk-detail-card">
            {/* Contact */}
            <Txt w="38%" h={20} r={2} sx={{ mb: 1.25 }} />
            <div className="sk-sidebar-row">
              <Circ size={20} />
              <Txt w={110} h={15} />
            </div>

            {/* Address */}
            <Txt w="34%" h={20} r={2} sx={{ mt: 1.5, mb: 1 }} />
            <Txt w="100%" h={14} sx={{ mb: 0.5 }} />
            <Txt w="72%" h={14} sx={{ mb: 1.25 }} />
            <Stack direction="row" gap={1} sx={{ mb: 2 }}>
              <S w={118} h={34} r={8} />
              <S w={78} h={34} r={8} />
            </Stack>

            {/* Hours toggle */}
            <Stack
              direction="row"
              alignItems="center"
              gap={1}
              sx={{
                py: 1.4,
                borderTop: "1px solid #f0ece8",
                borderBottom: "1px solid #f0ece8",
                mb: 0.5,
              }}
            >
              <Circ size={20} />
              <Txt w="55%" h={15} />
              <Box sx={{ ml: "auto" }}>
                <S w={20} h={20} r={4} />
              </Box>
            </Stack>

            {/* Sidebar action list */}
            {[...Array(7)].map((_, i) => (
              <Stack
                key={i}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{
                  py: 1.1,
                  borderBottom: i < 6 ? "1px solid #f5f5f5" : "none",
                }}
              >
                <Circ size={20} />
                <Txt
                  w={`${[62, 78, 84, 55, 70, 66, 60][i]}%`}
                  h={15}
                />
              </Stack>
            ))}
          </div>
        </div>
      </div>
    </Container>
  </div>
);

/* ──────────────────────────────────────────────────────────────
   4. HOME CARDS  (category icon grid — unchanged shape, better style)
────────────────────────────────────────────────────────────── */
const CardsSkeleton = () => (
  <div className="sk-root">
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {[...Array(8)].map((_, i) => (
          <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 4,
                textAlign: "center",
                border: "1px solid #f0ece8",
              }}
            >
              <Circ size={70} />
              <Txt w="80%" h={14} sx={{ mx: "auto", mt: 2 }} />
              <Txt w="58%" h={12} sx={{ mx: "auto", mt: 0.75 }} />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  </div>
);

/* ──────────────────────────────────────────────────────────────
   5. DASHBOARD
────────────────────────────────────────────────────────────── */
const DashboardSkeleton = () => (
  <div className="sk-root">
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {[...Array(6)].map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <S variant="rounded" w="100%" h={180} r={16} />
          </Grid>
        ))}
      </Grid>
    </Container>
  </div>
);

/* ──────────────────────────────────────────────────────────────
   Main export
────────────────────────────────────────────────────────────── */
function GlobalSkeleton({ type = "cards" }) {
  switch (type) {
    case "landing":  return <LandingSkeleton />;
    case "list":     return <ListSkeleton />;
    case "details":  return <DetailsSkeleton />;
    case "cards":    return <CardsSkeleton />;
    case "dashboard":return <DashboardSkeleton />;
    default:         return null;
  }
}

export default React.memo(GlobalSkeleton);
