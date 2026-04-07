import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSeoPageContentMeta } from "../../../../redux/actions/seoPageContentAction";
import "./seoPageContentsScreening.css";

export default function SeoPageContentScreening({
  pageType,
  category,
  location,
}) {
  const dispatch = useDispatch();

  const {
    list: seoPageContents = [],
    loading: seoContentLoading = false,
    error = null,
  } = useSelector(
    (state) => state.seoPageContentReducer || {}
  );

  useEffect(() => {
    if (!pageType) return;

    dispatch(
      fetchSeoPageContentMeta({
        pageType,
        category,
        location,
      })
    );
  }, [dispatch, pageType, category, location]);

  if (seoContentLoading) return null;
  if (error) return null;
  if (!seoPageContents.length) return null;

  const content = seoPageContents[0];

  return (
    <main className="seo-screen">
      <article className="seo-article">
        {content?.headerContent && (
          <section
            className="seo-header-content"
            dangerouslySetInnerHTML={{
              __html: content.headerContent,
            }}
          />
        )}

        {content?.pageContent && <div className="seo-divider" />}

        {content?.pageContent && (
          <section
            className="seo-page-content"
            dangerouslySetInnerHTML={{
              __html: content.pageContent,
            }}
          />
        )}
      </article>
    </main>
  );
}
