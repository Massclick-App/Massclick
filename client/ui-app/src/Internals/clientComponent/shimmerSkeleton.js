import React from 'react';
import { Box } from '@mui/material';
import './shimmerSkeleton.css';

/**
 * Simple shimmer skeleton loader - Flutter-style
 * Just a minimal placeholder with shimmer animation
 */
const ShimmerSkeleton = () => (
  <Box className="shimmer-container">
    {/* Header bar */}
    <Box className="shimmer-header" />

    {/* Hero section */}
    <Box className="shimmer-hero">
      <Box className="shimmer-bar shimmer-bar-lg" sx={{ width: '70%', height: 60 }} />
      <Box className="shimmer-bar shimmer-bar-md" sx={{ width: '50%', height: 40, mt: 2 }} />
    </Box>

    {/* Content sections */}
    <Box className="shimmer-content">
      {[...Array(3)].map((_, i) => (
        <Box key={i} sx={{ mb: 4 }}>
          {/* Section title */}
          <Box className="shimmer-bar shimmer-bar-md" sx={{ width: '30%', height: 24, mb: 2 }} />

          {/* Content rows */}
          <Box className="shimmer-bar shimmer-bar-sm" sx={{ width: '100%', height: 20, mb: 1 }} />
          <Box className="shimmer-bar shimmer-bar-sm" sx={{ width: '95%', height: 20, mb: 1 }} />
          <Box className="shimmer-bar shimmer-bar-sm" sx={{ width: '80%', height: 20, mb: 3 }} />
        </Box>
      ))}
    </Box>
  </Box>
);

export default React.memo(ShimmerSkeleton);
