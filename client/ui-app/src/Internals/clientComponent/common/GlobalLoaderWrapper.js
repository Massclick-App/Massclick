import React, { Suspense, lazy } from 'react';
import { useSelector } from 'react-redux';

const GlobalLoader = lazy(() => import(/* webpackChunkName: "global-loader" */ './GlobalLoader'));

const GlobalLoaderWrapper = ({ children }) => {
  const { isLoading, message } = useSelector(state => state.globalLoader || {});

  return (
    <>
      {isLoading && (
        <Suspense fallback={null}>
          <GlobalLoader message={message} />
        </Suspense>
      )}
      {children}
    </>
  );
};

export default GlobalLoaderWrapper;
