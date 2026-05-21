import React from 'react';
import { useSelector } from 'react-redux';
import GlobalLoader from './GlobalLoader';

const GlobalLoaderWrapper = ({ children }) => {
  const { isLoading, message } = useSelector(state => state.globalLoader || {});

  return (
    <>
      {isLoading && <GlobalLoader message={message} />}
      {children}
    </>
  );
};

export default GlobalLoaderWrapper;
