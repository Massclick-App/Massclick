import React, { Suspense, lazy } from 'react';
import { useSelector } from 'react-redux';

const GlobalLoader = lazy(() => import(/* webpackChunkName: "global-loader" */ './GlobalLoader'));

const GlobalLoaderWrapper = ({ children }) => {
  const { isLoading } = useSelector(state => state.globalLoader || {});

  return (
    <>
      {isLoading && (
        <Suspense fallback={null}>
          <GlobalLoader />
        </Suspense>
      )}
      {children}
    </>
  );
};

export default GlobalLoaderWrapper;
