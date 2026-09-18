import React from 'react';
import { useSelector } from 'react-redux';
// Imported eagerly: the CSS loader is ~1 KB, so a lazy chunk would only add a
// network round-trip before the first loading indicator can paint.
import GlobalLoader from './GlobalLoader';

const GlobalLoaderWrapper = ({ children }) => {
  const { isLoading } = useSelector(state => state.globalLoader || {});

  return (
    <>
      {isLoading && <GlobalLoader />}
      {children}
    </>
  );
};

export default GlobalLoaderWrapper;
