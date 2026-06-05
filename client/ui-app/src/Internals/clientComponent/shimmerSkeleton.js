import { createScopedClassNames } from "../../utils/createScopedClassNames";
import React from 'react';
import { Box } from '@mui/material';
import styles from "./shimmerSkeleton.module.css";

/**
 * Simple shimmer skeleton loader - Flutter-style
 * Just a minimal placeholder with shimmer animation
 */
const cx = createScopedClassNames(styles);
const ShimmerSkeleton = () => <Box className={cx("shimmer-container")}>
    {/* Header bar */}
    <Box className={cx("shimmer-header")} />

    {/* Hero section */}
    <Box className={cx("shimmer-hero")}>
      <Box className={cx("shimmer-bar shimmer-bar-lg")} sx={{
      width: '70%',
      height: 60
    }} />
      <Box className={cx("shimmer-bar shimmer-bar-md")} sx={{
      width: '50%',
      height: 40,
      mt: 2
    }} />
    </Box>

    {/* Content sections */}
    <Box className={cx("shimmer-content")}>
      {[...Array(3)].map((_, i) => <Box key={i} sx={{
      mb: 4
    }}>
          {/* Section title */}
          <Box className={cx("shimmer-bar shimmer-bar-md")} sx={{
        width: '30%',
        height: 24,
        mb: 2
      }} />

          {/* Content rows */}
          <Box className={cx("shimmer-bar shimmer-bar-sm")} sx={{
        width: '100%',
        height: 20,
        mb: 1
      }} />
          <Box className={cx("shimmer-bar shimmer-bar-sm")} sx={{
        width: '95%',
        height: 20,
        mb: 1
      }} />
          <Box className={cx("shimmer-bar shimmer-bar-sm")} sx={{
        width: '80%',
        height: 20,
        mb: 3
      }} />
        </Box>)}
    </Box>
  </Box>;
export default React.memo(ShimmerSkeleton);
