import React, { useLayoutEffect, useRef, useState } from "react";
import AgreementDocument from "features/admin/agreement/AgreementDocument.js";
import styles from "features/admin/agreement/agreementPreview.module.css";

export default function AgreementPreview({ agreement }) {
  const containerRef = useRef(null);
  const documentRef = useRef(null);
  const [size, setSize] = useState({ scale: 1, height: 1485 });

  useLayoutEffect(() => {
    const updateSize = () => {
      const width = containerRef.current.clientWidth;
      setSize({
        scale: Math.min(1, width / 1050),
        height: documentRef.current.offsetHeight,
      });
    };
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);
    observer.observe(documentRef.current);
    updateSize();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={styles.viewport}>
      <div
        className={styles.frame}
        style={{ width: 1050 * size.scale, height: size.height * size.scale }}
      >
        <div
          ref={documentRef}
          className={styles.sheet}
          style={{ transform: `scale(${size.scale})` }}
        >
          <AgreementDocument agreement={agreement} />
        </div>
      </div>
    </div>
  );
}
