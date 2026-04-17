import React from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Chip,
} from "@mui/material";

/* --------------------- Reusable Search Card --------------------- */
const SearchCardRow = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 4,
        border: "1px solid #ececec",
        background: "#fff",
      }}
    >
      <Grid container spacing={3}>
        {/* Image */}
        <Grid item xs={12} sm={3} md={2}>
          <Skeleton
            variant="rounded"
            width="100%"
            height={130}
            animation="wave"
            sx={{ borderRadius: 3 }}
          />
        </Grid>

        {/* Content */}
        <Grid item xs={12} sm={9} md={10}>
          <Skeleton width="45%" height={38} animation="wave" />
          <Skeleton width="20%" height={28} animation="wave" />
          <Skeleton width="35%" height={24} animation="wave" />
          <Skeleton width="30%" height={24} animation="wave" />

          {/* Buttons */}
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 2, flexWrap: "wrap" }}
          >
            <Skeleton
              variant="rounded"
              width={130}
              height={44}
              animation="wave"
              sx={{ borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width={130}
              height={44}
              animation="wave"
              sx={{ borderRadius: 2 }}
            />
            <Skeleton
              variant="rounded"
              width={130}
              height={44}
              animation="wave"
              sx={{ borderRadius: 2 }}
            />
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

/* ------------------------ Main Component ------------------------ */
function GlobalSkeleton({ type = "cards" }) {
  /* ---------------- Home Cards ---------------- */
  if (type === "cards") {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[...Array(8)].map((_, i) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 4,
                  textAlign: "center",
                }}
              >
                <Skeleton
                  variant="circular"
                  width={70}
                  height={70}
                  sx={{ mx: "auto", mb: 2 }}
                  animation="wave"
                />
                <Skeleton width="80%" sx={{ mx: "auto" }} />
                <Skeleton width="60%" sx={{ mx: "auto" }} />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  /* ---------------- Search Page ---------------- */
  if (type === "list") {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Banner */}
        <Skeleton
          variant="rounded"
          height={130}
          animation="wave"
          sx={{ borderRadius: 4, mb: 4 }}
        />

        {/* Title Box */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: "1px solid #ececec",
            mb: 3,
          }}
        >
          <Skeleton width="40%" height={50} animation="wave" />
        </Paper>

        {/* Description */}
        <Skeleton width="80%" height={26} animation="wave" />

        {/* Chips */}
        <Stack direction="row" spacing={1} sx={{ my: 2, flexWrap: "wrap" }}>
          {[1, 2, 3, 4].map((item) => (
            <Chip
              key={item}
              label={<Skeleton width={110} />}
              sx={{ borderRadius: 10 }}
            />
          ))}
        </Stack>

        {/* Listings */}
        {[...Array(5)].map((_, i) => (
          <SearchCardRow key={i} />
        ))}
      </Container>
    );
  }

  /* ---------------- Details Page ---------------- */
  if (type === "details") {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton
          variant="rounded"
          height={280}
          animation="wave"
          sx={{ borderRadius: 4, mb: 3 }}
        />
        <Skeleton width="55%" height={45} animation="wave" />
        <Skeleton width="35%" height={30} animation="wave" />
        <Skeleton width="100%" height={120} animation="wave" />
      </Container>
    );
  }

  /* ---------------- Dashboard ---------------- */
  if (type === "dashboard") {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton
                variant="rounded"
                height={180}
                animation="wave"
                sx={{ borderRadius: 4 }}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return null;
}

export default React.memo(GlobalSkeleton);