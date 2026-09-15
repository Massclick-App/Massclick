import React from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import AgreementDocument from "features/admin/agreement/AgreementDocument.js";

export const generateAgreementPdf = async (agreement) => {
  // html2canvas measures font baselines using a hidden 1px GIF in the live
  // document. The global img { display: block; height: auto } reset in
  // public/index.html otherwise shifts every exported text baseline down.
  // Scope this reset to that measuring image, never the agreement logo.
  const fontMetricsStyle = document.createElement("style");
  fontMetricsStyle.textContent = `
    body > div > img[width="1"][height="1"][src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"] {
      display: inline !important;
      width: 1px !important;
      height: 1px !important;
      max-width: none !important;
    }
  `;
  document.head.appendChild(fontMetricsStyle);
  const host = document.createElement("div");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1050px",
  });
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() =>
      root.render(React.createElement(AgreementDocument, { agreement })),
    );
    await document.fonts.ready;
    await Promise.all(
      Array.from(host.querySelectorAll("img")).map((img) => img.decode()),
    );
    const page = host.firstElementChild;
    const canvas = await html2canvas(page, {
      scale: 2,
      backgroundColor: "#fff",
      useCORS: true,
      windowWidth: 1200,
    });
    const pdf = new jsPDF({
      orientation: "p",
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const height = Math.min(297, (canvas.height * 210) / canvas.width);
    const width = (height * canvas.width) / canvas.height;
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.88),
      "JPEG",
      (210 - width) / 2,
      0,
      width,
      height,
      undefined,
      "FAST",
    );
    pdf.setProperties({
      title: agreement.agreementNo,
      subject: "MassClick Business Agreement",
    });
    return pdf;
  } finally {
    root.unmount();
    host.remove();
    fontMetricsStyle.remove();
  }
};
