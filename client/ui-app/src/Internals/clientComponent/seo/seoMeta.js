import React from "react";
import { Helmet } from "react-helmet-async";

const SeoMeta = ({ seoData, fallback }) => {

  const meta =
    seoData && Object.keys(seoData).length > 0
      ? seoData
      : fallback;

  if (!meta) return null;

  return (
    <Helmet prioritizeSeoTags>

      <title key="title">
        {meta.title || "Massclick"}
      </title>

      {meta.description && (
        <meta
          key="description"
          name="description"
          content={meta.description}
        />
      )}

      {meta.keywords && (
        <meta
          key="keywords"
          name="keywords"
          content={meta.keywords}
        />
      )}

      <meta
        key="robots"
        name="robots"
        content={meta.robots || "index, follow"}
      />

      {meta.canonical && (
        <link
          key="canonical"
          rel="canonical"
          href={meta.canonical}
        />
      )}

      <meta
        key="og:title"
        property="og:title"
        content={meta.title}
      />

      <meta
        key="og:description"
        property="og:description"
        content={meta.description}
      />

      <meta
        key="og:url"
        property="og:url"
        content={meta.canonical}
      />

      <meta
        key="og:type"
        property="og:type"
        content="website"
      />

      <meta
        key="og:image"
        property="og:image"
        content="https://massclick.in/mi.png"
      />

      <meta
        key="twitter:card"
        name="twitter:card"
        content="summary_large_image"
      />

      <meta
        key="twitter:title"
        name="twitter:title"
        content={meta.title}
      />

      <meta
        key="twitter:description"
        name="twitter:description"
        content={meta.description}
      />

      <meta
        key="twitter:image"
        name="twitter:image"
        content="https://massclick.in/mi.png"
      />

      <meta key="author" name="author" content="Massclick" />
      <meta key="publisher" name="publisher" content="Massclick" />
      <meta key="content-language" httpEquiv="content-language" content="en" />
      <meta key="charset" charSet="utf-8" />

    </Helmet>
  );
};

export default SeoMeta;
