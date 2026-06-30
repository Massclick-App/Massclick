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
    <Box className={cx("shimmer-shell")} role="status" aria-live="polite" aria-label="Loading page">
      <Box className={cx("shimmer-header")}>
        <Box className={cx("shimmer-bar shimmer-logo")} />
        <Box className={cx("shimmer-bar shimmer-bar-lg")} sx={{
        width: '58%'
      }} />
      </Box>

      <Box className={cx("shimmer-hero")}>
        <Box className={cx("shimmer-bar shimmer-bar-lg")} sx={{
        width: '100%',
        height: 22
      }} />
        <Box className={cx("shimmer-bar shimmer-bar-md")} sx={{
        width: '72%',
        height: 18
      }} />
      </Box>

      <Box className={cx("shimmer-content")}>
        {[100, 92, 84, 76].map((width, index) => <Box key={index} className={cx("shimmer-bar shimmer-bar-sm")} sx={{
        width: `${width}%`
      }} />)}
      </Box>
    </Box>
  </Box>;
export default React.memo(ShimmerSkeleton);
