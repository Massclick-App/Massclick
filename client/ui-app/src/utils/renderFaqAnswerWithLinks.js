import React from "react";

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isSafeFaqUrl = (url = "") =>
  /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(String(url).trim());

export const renderFaqAnswerWithLinks = (answer = "", links = []) => {
  if (!answer) return null;

  const validLinks = (links || [])
    .filter((link) => link?.linkText && link?.url && isSafeFaqUrl(link.url))
    .sort((a, b) => b.linkText.length - a.linkText.length);

  if (validLinks.length === 0) {
    return answer;
  }

  let segments = [answer];

  validLinks.forEach((link, linkIndex) => {
    const escapedText = escapeRegExp(link.linkText);
    const pattern = new RegExp(`\\b(${escapedText})\\b`, "gi");
    const nextSegments = [];

    segments.forEach((segment) => {
      if (typeof segment !== "string") {
        nextSegments.push(segment);
        return;
      }

      const parts = segment.split(pattern);
      parts.forEach((part, partIndex) => {
        if (!part) return;

        if (partIndex % 2 === 1) {
          nextSegments.push(
            React.createElement(
              "a",
              {
                href: link.url,
                target: "_blank",
                rel: "noopener noreferrer",
                key: `${linkIndex}-${nextSegments.length}`,
              },
              part
            )
          );
          return;
        }

        nextSegments.push(part);
      });
    });

    segments = nextSegments;
  });

  return segments;
};
