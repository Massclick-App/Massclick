import React from 'react';
import ReactDOM from 'react-dom';
import styles from './GlobalLoader.module.css';

const GlobalLoader = () => {
  const loaderElement = (
    <div className={styles.overlay}>
      <div className={styles.loader} role="status" aria-label="Loading" />
    </div>
  );

  return ReactDOM.createPortal(loaderElement, document.body);
};

export default GlobalLoader;
