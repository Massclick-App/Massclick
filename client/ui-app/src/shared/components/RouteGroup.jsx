import React, { Suspense } from 'react';
import ShimmerSkeleton from 'features/public/shimmerSkeleton.js';

// Minimal skeleton for faster fallback rendering
const MinimalSkeleton = () => <ShimmerSkeleton />;

// Route group component for granular code splitting and loading boundaries
export const RouteGroup = ({ children, fallback = null }) => (
  <Suspense fallback={fallback || <MinimalSkeleton />}>
    {children}
  </Suspense>
);

export default RouteGroup;
