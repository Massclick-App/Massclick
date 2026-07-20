import React from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import massclickLogo from "../../assets/MassClick_pvt_ltd.webp";
import authorizedSignature from "../../assets/signature1.webp";
import { QuotationPdfPage1, QuotationPdfPage2 } from "./QuotationPdfDocument";

const PAGE_WIDTH_PX = 1050;
const PAGE_HEIGHT_PX = 1485;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;

const cachedImageDataUrls = {};

const imageBlobToPngDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Unable to prepare image for PDF.");
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image for PDF."));
    };
    image.src = objectUrl;
  });

const imageUrlToDataUrl = async (url) => {
  if (cachedImageDataUrls[url]) return cachedImageDataUrls[url];
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    cachedImageDataUrls[url] = await imageBlobToPngDataUrl(blob);
    return cachedImageDataUrls[url];
  } catch {
    return "";
  }
};

export const buildQrTarget = (quotation) => {
  const phoneDigits = String(quotation.businessPhone || "").replace(/\D/g, "");
  if (phoneDigits) {
    const withCountryCode = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
    const message = encodeURIComponent(
      `Hi MassClick, I'd like to know more about quotation ${quotation.quotationNo || ""}.`.trim()
    );
    return { url: `https://wa.me/${withCountryCode}?text=${message}`, caption: "Scan to WhatsApp Us" };
  }
  return { url: "https://massclick.in", caption: "Scan to Visit MassClick" };
};

const waitForImages = (container) => {
  const images = Array.from(container.querySelectorAll("img"));
  return Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  );
};

const waitForPaint = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const captureNode = async (node) => {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: PAGE_WIDTH_PX,
    height: PAGE_HEIGHT_PX,
  });
  return canvas.toDataURL("image/jpeg", 0.96);
};

export const generateQuotationPdf = async (quotation) => {
  const [logoDataUrl, signatureDataUrl] = await Promise.all([
    imageUrlToDataUrl(massclickLogo),
    imageUrlToDataUrl(authorizedSignature),
  ]);
  const qrTarget = buildQrTarget(quotation);
  const qrDataUrl = await QRCode.toDataURL(qrTarget.url, {
    margin: 1,
    width: 300,
    color: { dark: "#0b1f3f", light: "#ffffff" },
  }).catch(() => "");

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  document.body.appendChild(container);

  const page1Container = document.createElement("div");
  const page2Container = document.createElement("div");
  container.appendChild(page1Container);
  container.appendChild(page2Container);

  const root1 = createRoot(page1Container);
  const root2 = createRoot(page2Container);

  let page1El = null;
  let page2El = null;

  try {
    root1.render(
      React.createElement(QuotationPdfPage1, {
        innerRef: (el) => {
          page1El = el;
        },
        quotation,
        logoSrc: logoDataUrl,
        signatureSrc: signatureDataUrl,
        qrSrc: qrDataUrl,
        qrCaption: qrTarget.caption,
      })
    );
    root2.render(
      React.createElement(QuotationPdfPage2, {
        innerRef: (el) => {
          page2El = el;
        },
        quotation,
        logoSrc: logoDataUrl,
      })
    );

    await waitForPaint();
    await waitForImages(container);

    const [page1Image, page2Image] = await Promise.all([
      captureNode(page1El),
      captureNode(page2El),
    ]);

    const pdf = new jsPDF("p", "mm", "a4");
    pdf.setProperties({
      title: quotation.quotationNo || "MassClick Quotation",
      subject: "MassClick product quotation",
    });
    pdf.addImage(page1Image, "JPEG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);
    pdf.addPage();
    pdf.addImage(page2Image, "JPEG", 0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM);

    return pdf;
  } finally {
    root1.unmount();
    root2.unmount();
    container.remove();
  }
};
