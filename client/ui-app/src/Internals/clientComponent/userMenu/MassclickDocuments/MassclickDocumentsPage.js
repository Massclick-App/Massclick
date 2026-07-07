import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CloudDownloadOutlinedIcon from "@mui/icons-material/CloudDownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { getAllMassclickDocuments } from "../../../../redux/actions/massclickDocumentsAction.js";
import styles from "./MassclickDocumentsPage.module.css";

const cx = createScopedClassNames(styles);

const DOCUMENT_PAGE_SIZE = 100;

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "Resource";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
  if (!value) return "Recently added";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getExtension = (fileName = "") => {
  const extension = fileName.split(".").pop();
  return extension && extension !== fileName ? extension.toUpperCase() : "FILE";
};

const formatSectionName = (section = "") => {
  const trimmedSection = section.trim();
  if (!trimmedSection) return "General";
  if (/^\d+$/.test(trimmedSection)) return `Collection ${trimmedSection}`;
  return trimmedSection;
};

const getYoutubeEmbedUrl = (url = "") => {
  const trimmedUrl = url.trim();
  const match = trimmedUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : "";
};

const getDocumentKind = (document = {}) => {
  const fileType = document.fileType || "";
  const fileName = document.fileName || "";

  if (fileType.includes("pdf") || fileName.toLowerCase().endsWith(".pdf")) {
    return { label: "PDF", icon: <PictureAsPdfOutlinedIcon /> };
  }
  if (fileType.startsWith("image/")) {
    return { label: "Image", icon: <ImageOutlinedIcon /> };
  }
  if (fileType.includes("word") || /\.(doc|docx)$/i.test(fileName)) {
    return { label: "Document", icon: <DescriptionOutlinedIcon /> };
  }
  return { label: getExtension(fileName), icon: <InsertDriveFileOutlinedIcon /> };
};

const canPreviewInline = (document = {}) => {
  const fileType = document.fileType || "";
  const fileName = document.fileName || "";
  return (
    fileType.includes("pdf") ||
    fileType.startsWith("image/") ||
    fileType.startsWith("text/") ||
    /\.(pdf|txt)$/i.test(fileName)
  );
};

const getPreviewUrl = (document = {}, pageNumber = 1) => {
  if (!document.documentUrl) return "";
  const fileType = document.fileType || "";
  const fileName = document.fileName || "";
  const isPdf = fileType.includes("pdf") || /\.pdf$/i.test(fileName);
  return isPdf
    ? `${document.documentUrl}#page=${pageNumber}&zoom=page-fit&view=Fit&toolbar=0&navpanes=0&scrollbar=0&pagemode=none`
    : document.documentUrl;
};

const groupBySection = (documents = []) =>
  documents.reduce((groups, document) => {
    const section = document.section?.trim() || "General";
    groups[section] = groups[section] ? [...groups[section], document] : [document];
    return groups;
  }, {});

const getImageResources = (document = {}) => [
  ...(document.imageLinks || []).map((imageLink, index) => ({
    id: `${document._id || document.title}-image-link-${index}`,
    src: imageLink,
    title: document.title,
    description: document.summary || document.description,
  })),
  ...(document.mediaItems || [])
    .filter((item) => item.mediaType === "image" && item.mediaUrl)
    .map((item, index) => ({
      id: `${document._id || document.title}-image-upload-${index}`,
      src: item.mediaUrl,
      title: item.title || item.fileName || document.title,
      description: document.summary || document.description,
    })),
];

const getVideoResources = (document = {}) => [
  ...(document.videoLinks || []).map((videoLink, index) => ({
    id: `${document._id || document.title}-video-link-${index}`,
    src: videoLink,
    title: document.title,
    description: document.summary || document.description,
    isUploaded: false,
  })),
  ...(document.mediaItems || [])
    .filter((item) => item.mediaType === "video" && item.mediaUrl)
    .map((item, index) => ({
      id: `${document._id || document.title}-video-upload-${index}`,
      src: item.mediaUrl,
      title: item.title || item.fileName || document.title,
      description: document.summary || document.description,
      isUploaded: true,
    })),
];

const getYoutubeResources = (document = {}) =>
  (document.youtubeLinks || []).map((youtubeLink, index) => ({
    id: `${document._id || document.title}-youtube-${index}`,
    src: youtubeLink,
    embedUrl: getYoutubeEmbedUrl(youtubeLink),
    title: document.title,
    description: document.summary || document.description,
  }));

export default function MassclickDocumentsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { documents = [], loading, error } = useSelector(
    (state) => state.massclickDocuments || {}
  );
  const [searchText, setSearchText] = useState("");
  const [activeSection, setActiveSection] = useState("All");
  const [activeResourceView, setActiveResourceView] = useState("overview");
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [readerPage, setReaderPage] = useState(1);
  const [turnDirection, setTurnDirection] = useState("");

  useEffect(() => {
    dispatch(
      getAllMassclickDocuments({
        pageNo: 1,
        pageSize: DOCUMENT_PAGE_SIZE,
        options: { status: "active", sortBy: "createdAt", sortOrder: "desc" },
      })
    );
  }, [dispatch]);

  useEffect(() => {
    if (!selectedDocument) return;
    setReaderPage(1);
    setTurnDirection("");
  }, [selectedDocument]);

  const isSelectedPdf = useMemo(() => {
    if (!selectedDocument) return false;
    const fileType = selectedDocument.fileType || "";
    const fileName = selectedDocument.fileName || "";
    return fileType.includes("pdf") || /\.pdf$/i.test(fileName);
  }, [selectedDocument]);

  const handlePageTurn = (direction) => {
    if (!isSelectedPdf) return;

    setReaderPage((currentPage) => {
      if (direction === "previous") return Math.max(1, currentPage - 1);
      return currentPage + 1;
    });
    setTurnDirection(direction);
    window.setTimeout(() => setTurnDirection(""), 650);
  };

  const sections = useMemo(() => {
    const sectionNames = documents
      .map((document) => document.section?.trim())
      .filter(Boolean);
    return ["All", ...Array.from(new Set(sectionNames))];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return documents.filter((document) => {
      const section = document.section?.trim() || "General";
      const matchesSection = activeSection === "All" || section === activeSection;
      const searchableText = [
        document.title,
        document.section,
        document.description,
        document.summary,
        document.contentDetails,
        document.fileName,
        ...(document.youtubeLinks || []),
        ...(document.videoLinks || []),
        ...(document.imageLinks || []),
        ...(document.keyBenefits || []),
        ...(document.useCases || []),
        document.targetAudience,
      ]
        .join(" ")
        .toLowerCase();

      return matchesSection && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [activeSection, documents, searchText]);

  const groupedDocuments = useMemo(
    () => groupBySection(filteredDocuments),
    [filteredDocuments]
  );

  const featuredDocument = filteredDocuments[0] || documents[0];
  const overviewDocuments = filteredDocuments;
  const videoResources = filteredDocuments.flatMap((document) => getVideoResources(document));
  const youtubeResources = filteredDocuments.flatMap((document) => getYoutubeResources(document));
  const imageResources = filteredDocuments.flatMap((document) => getImageResources(document));
  const awarenessDocuments = filteredDocuments.filter((document) => {
    const resourceType = document.resourceType || "";
    return ["guide", "awareness"].includes(resourceType) || document.contentDetails || document.keyBenefits?.length || document.useCases?.length;
  });
  const fileDocuments = filteredDocuments.filter((document) => document.documentUrl);

  const resourceTabs = [
    { id: "overview", label: "Overview", count: overviewDocuments.length },
    {
      id: "videos",
      label: "Uploaded Videos",
      count: videoResources.length,
    },
    {
      id: "youtube",
      label: "YouTube Links",
      count: youtubeResources.length,
    },
    {
      id: "images",
      label: "Images",
      count: imageResources.length,
    },
    {
      id: "guides",
      label: "Awareness",
      count: awarenessDocuments.length,
    },
    {
      id: "files",
      label: "Files",
      count: fileDocuments.length,
    },
  ];

  const activeTab = resourceTabs.find((tab) => tab.id === activeResourceView) || resourceTabs[0];
  const isEmptyActiveView =
    (activeResourceView === "overview" && overviewDocuments.length === 0) ||
    (activeResourceView === "videos" && videoResources.length === 0) ||
    (activeResourceView === "youtube" && youtubeResources.length === 0) ||
    (activeResourceView === "images" && imageResources.length === 0) ||
    (activeResourceView === "guides" && awarenessDocuments.length === 0) ||
    (activeResourceView === "files" && fileDocuments.length === 0);

  return (
    <main className={cx("documents-shell")}>
      <div className={cx("page-topbar")}>
        <button className={cx("back-button")} type="button" onClick={() => navigate("/")}>
          <ArrowBackRoundedIcon className={cx("back-button-icon")} />
          Back to Dashboard
        </button>
        <span className={cx("page-label")}>MassClick Resource Hub</span>
      </div>

      <section className={cx("documents-hero")}>
        <div className={cx("hero-content")}>
          <span className={cx("eyebrow")}>MassClick Knowledge Hub</span>
          <h1 className={cx("hero-title")}>Learn the application with guides, videos, images, and resources.</h1>
          <p className={cx("hero-copy")}>
            Explore product awareness content, training videos, visual references, help links, and downloadable files in one organized place.
          </p>
          <div className={cx("hero-stats")}>
            <div className={cx("hero-stat")}>
              <span className={cx("hero-stat-value")}>{documents.length}</span>
              <span className={cx("hero-stat-label")}>Resources</span>
            </div>
            <div className={cx("hero-stat")}>
              <span className={cx("hero-stat-value")}>{Math.max(sections.length - 1, 0)}</span>
              <span className={cx("hero-stat-label")}>Sections</span>
            </div>
          </div>
        </div>

        <aside className={cx("featured-panel")}>
          <AutoStoriesOutlinedIcon className={cx("featured-icon")} />
          <span className={cx("featured-label")}>Featured topic</span>
          <h2 className={cx("featured-title")}>{featuredDocument?.title || "No resources yet"}</h2>
          <p className={cx("featured-copy")}>
            {featuredDocument?.description || "Published resources will appear here when they are active."}
          </p>
          {featuredDocument?.documentUrl && (
            <button className={cx("featured-action")} type="button" onClick={() => setSelectedDocument(featuredDocument)}>
              Open Resource
            </button>
          )}
        </aside>
      </section>

      <section className={cx("library-toolbar")}>
        <div className={cx("search-box")}>
          <SearchRoundedIcon className={cx("search-icon")} />
          <input
            className={cx("search-input")}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search by topic, video, image, guide, or file name"
          />
        </div>

        <div className={cx("section-tabs")} aria-label="Resource sections">
          {sections.map((section) => (
            <button
              className={cx(section === activeSection ? "section-tab section-tab-active" : "section-tab")}
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
            >
              {section === "All" ? "All" : formatSectionName(section)}
            </button>
          ))}
        </div>
      </section>

      <section className={cx("resource-tabs")} aria-label="Resource views">
        {resourceTabs.map((tab) => (
          <button
            className={cx(tab.id === activeResourceView ? "resource-tab resource-tab-active" : "resource-tab")}
            key={tab.id}
            type="button"
            onClick={() => setActiveResourceView(tab.id)}
          >
            <span className={cx("resource-tab-label")}>{tab.label}</span>
            <span className={cx(tab.id === activeResourceView ? "resource-tab-count resource-tab-count-active" : "resource-tab-count")}>{tab.count}</span>
          </button>
        ))}
      </section>

      {loading && (
        <section className={cx("document-grid")}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div className={cx("document-skeleton")} key={index} />
          ))}
        </section>
      )}

      {!loading && error && (
        <section className={cx("empty-state")}>
          <ArticleOutlinedIcon className={cx("empty-icon")} />
          <h2 className={cx("empty-title")}>Resources could not be loaded</h2>
          <p className={cx("empty-copy")}>Please refresh the page and try again.</p>
        </section>
      )}

      {!loading && !error && isEmptyActiveView && (
        <section className={cx("empty-state")}>
          <ArticleOutlinedIcon className={cx("empty-icon")} />
          <h2 className={cx("empty-title")}>No {activeTab.label.toLowerCase()} found</h2>
          <p className={cx("empty-copy")}>Try another search term, section, or upload this resource type from admin.</p>
        </section>
      )}

      {!loading && !error && activeResourceView === "overview" && overviewDocuments.length > 0 && (
        <section className={cx("library-sections")}>
          {Object.entries(groupedDocuments).map(([section, sectionDocuments]) => (
            <div className={cx("library-section")} key={section}>
              <div className={cx("section-heading")}>
                <span className={cx("section-kicker")}>Section</span>
                <h2 className={cx("section-title")}>{formatSectionName(section)}</h2>
                <span className={cx("section-count")}>{sectionDocuments.length} resource{sectionDocuments.length === 1 ? "" : "s"}</span>
              </div>

              <div className={cx("document-grid")}>
                {sectionDocuments.map((document) => {
                  const kind = getDocumentKind(document);

                  return (
                    <article className={cx("document-card")} key={document._id}>
                      <div className={cx("document-card-top")}>
                        <span className={cx("document-kind-icon")}>{kind.icon}</span>
                        <span className={cx("document-kind-label")}>{kind.label}</span>
                      </div>
                      <h3 className={cx("document-title")}>{document.title}</h3>
                      <p className={cx("document-description")}>
                        {document.summary || document.description || "Open this resource to understand the application and access supporting files."}
                      </p>
                      <div className={cx("resource-summary-strip")}>
                        <span>{getYoutubeResources(document).length} YouTube</span>
                        <span>{getVideoResources(document).length} Videos</span>
                        <span>{getImageResources(document).length} Images</span>
                      </div>
                      <div className={cx("document-meta")}>
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>{formatDate(document.createdAt)}</span>
                      </div>
                      <div className={cx("document-actions")}>
                        <button className={cx("read-button")} type="button" onClick={() => setSelectedDocument(document)}>
                          <AutoStoriesOutlinedIcon />
                          Open
                        </button>
                        {document.documentUrl && (
                          <a className={cx("download-button")} href={document.documentUrl} target="_blank" rel="noreferrer" download={document.fileName}>
                            <CloudDownloadOutlinedIcon />
                            Download
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      )}

      {!loading && !error && activeResourceView === "videos" && videoResources.length > 0 && (
        <section className={cx("media-section")}>
          <div className={cx("view-heading")}>
            <span className={cx("section-kicker")}>Uploaded video library</span>
            <h2 className={cx("section-title")}>Application videos</h2>
            <p className={cx("view-copy")}>Videos uploaded from admin are shown here separately from YouTube links and downloadable files.</p>
          </div>
          <div className={cx("video-library-grid")}>
            {videoResources.map((video) => (
              <article className={cx("video-resource-card")} key={video.id}>
                {video.isUploaded ? (
                  <video className={cx("video-player")} src={video.src} controls preload="metadata" />
                ) : (
                  <a className={cx("external-video-card")} href={video.src} target="_blank" rel="noreferrer">
                    <PlayCircleOutlineRoundedIcon className={cx("external-video-icon")} />
                    <span>Open video link</span>
                  </a>
                )}
                <div className={cx("media-card-body")}>
                  <span className={cx("media-type-label")}>{video.isUploaded ? "Uploaded video" : "Video link"}</span>
                  <h3 className={cx("media-card-title")}>{video.title}</h3>
                  <p className={cx("media-card-copy")}>{video.description || "Application video resource."}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && activeResourceView === "youtube" && youtubeResources.length > 0 && (
        <section className={cx("media-section")}>
          <div className={cx("view-heading")}>
            <span className={cx("section-kicker")}>YouTube learning links</span>
            <h2 className={cx("section-title")}>Watch official videos</h2>
            <p className={cx("view-copy")}>Every YouTube link is displayed as its own video card for clear browsing.</p>
          </div>
          <div className={cx("youtube-library-grid")}>
            {youtubeResources.map((video) => (
              <article className={cx("youtube-resource-card")} key={video.id}>
                {video.embedUrl ? (
                  <iframe className={cx("youtube-player")} src={video.embedUrl} title={`${video.title} YouTube video`} allowFullScreen />
                ) : (
                  <a className={cx("external-video-card")} href={video.src} target="_blank" rel="noreferrer">
                    <PlayCircleOutlineRoundedIcon className={cx("external-video-icon")} />
                    <span>Open YouTube link</span>
                  </a>
                )}
                <div className={cx("media-card-body")}>
                  <span className={cx("media-type-label")}>YouTube</span>
                  <h3 className={cx("media-card-title")}>{video.title}</h3>
                  <p className={cx("media-card-copy")}>{video.description || "YouTube awareness video."}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && activeResourceView === "images" && imageResources.length > 0 && (
        <section className={cx("media-section")}>
          <div className={cx("view-heading")}>
            <span className={cx("section-kicker")}>Image gallery</span>
            <h2 className={cx("section-title")}>Application visuals</h2>
            <p className={cx("view-copy")}>Uploaded images and image links are grouped into a dedicated visual gallery.</p>
          </div>
          <div className={cx("image-library-grid")}>
            {imageResources.map((image) => (
              <article className={cx("image-resource-card")} key={image.id}>
                <img className={cx("image-resource-preview")} src={image.src} alt={image.title || "MassClick resource"} />
                <div className={cx("media-card-body")}>
                  <span className={cx("media-type-label")}>Image</span>
                  <h3 className={cx("media-card-title")}>{image.title}</h3>
                  <p className={cx("media-card-copy")}>{image.description || "Application image resource."}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && activeResourceView === "guides" && awarenessDocuments.length > 0 && (
        <section className={cx("awareness-section")}>
          <div className={cx("view-heading")}>
            <span className={cx("section-kicker")}>Definitions and project details</span>
            <h2 className={cx("section-title")}>Application awareness</h2>
            <p className={cx("view-copy")}>Detailed explanations, benefits, use cases, and target audience notes are shown separately from files and media.</p>
          </div>
          <div className={cx("awareness-grid")}>
            {awarenessDocuments.map((document) => (
              <article className={cx("awareness-card")} key={document._id}>
                <span className={cx("media-type-label")}>{document.resourceType || "Awareness"}</span>
                <h3 className={cx("awareness-title")}>{document.title}</h3>
                <p className={cx("awareness-summary")}>{document.summary || document.description || "Application awareness resource."}</p>
                {document.contentDetails && <p className={cx("awareness-details")}>{document.contentDetails}</p>}
                {document.keyBenefits?.length > 0 && (
                  <div className={cx("pill-list")}>
                    {document.keyBenefits.map((benefit) => (
                      <span className={cx("info-pill")} key={benefit}>{benefit}</span>
                    ))}
                  </div>
                )}
                {document.useCases?.length > 0 && (
                  <div className={cx("use-case-list")}>
                    {document.useCases.map((useCase) => (
                      <span className={cx("use-case-item")} key={useCase}>{useCase}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && activeResourceView === "files" && fileDocuments.length > 0 && (
        <section className={cx("media-section")}>
          <div className={cx("view-heading")}>
            <span className={cx("section-kicker")}>Original files</span>
            <h2 className={cx("section-title")}>Files and downloads</h2>
            <p className={cx("view-copy")}>Only uploaded files are shown in this view, with read and download actions.</p>
          </div>
          <div className={cx("document-grid")}>
            {fileDocuments.map((document) => {
              const kind = getDocumentKind(document);
              return (
                <article className={cx("document-card")} key={document._id}>
                  <div className={cx("document-card-top")}>
                    <span className={cx("document-kind-icon")}>{kind.icon}</span>
                    <span className={cx("document-kind-label")}>{kind.label}</span>
                  </div>
                  <h3 className={cx("document-title")}>{document.title}</h3>
                  <p className={cx("document-description")}>{document.summary || document.description || document.fileName}</p>
                  <div className={cx("document-meta")}>
                    <span>{formatFileSize(document.fileSize)}</span>
                    <span>{formatDate(document.createdAt)}</span>
                  </div>
                  <div className={cx("document-actions")}>
                    <button className={cx("read-button")} type="button" onClick={() => setSelectedDocument(document)}>
                      <AutoStoriesOutlinedIcon />
                    Open
                    </button>
                    <a className={cx("download-button")} href={document.documentUrl} target="_blank" rel="noreferrer" download={document.fileName}>
                      <CloudDownloadOutlinedIcon />
                      Download
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {selectedDocument && (
        <div className={cx("reader-overlay")} role="dialog" aria-modal="true" aria-label={`${selectedDocument.title} reader`}>
          <div className={cx("reader-panel")}>
            <button className={cx("reader-close")} type="button" onClick={() => setSelectedDocument(null)} aria-label="Close reader">
              <CloseRoundedIcon />
            </button>

            <div className={cx("reader-book")}>
              <aside className={cx("reader-cover")}>
                <span className={cx("reader-cover-label")}>{formatSectionName(selectedDocument.section || "General")}</span>
                <h2 className={cx("reader-cover-title")}>{selectedDocument.title}</h2>
                <p className={cx("reader-cover-copy")}>
                  {selectedDocument.description || "Use the preview and download options to access this resource."}
                </p>
                <div className={cx("reader-cover-meta")}>
                  <span className={cx("reader-cover-meta-item")}>{getDocumentKind(selectedDocument).label}</span>
                  <span className={cx("reader-cover-meta-item")}>{formatFileSize(selectedDocument.fileSize)}</span>
                </div>
              </aside>

              <section className={cx("reader-page")}>
                

                {selectedDocument.documentUrl && canPreviewInline(selectedDocument) ? (
                  <div className={cx("book-preview-wrap")}>
                    <div className={cx("book-controls")}>
                      <button
                        className={cx("book-page-button")}
                        type="button"
                        onClick={() => handlePageTurn("previous")}
                        disabled={!isSelectedPdf || readerPage === 1}
                      >
                        Previous
                      </button>
                      <span className={cx("book-page-status")}>
                        {isSelectedPdf ? `Book page ${readerPage}` : "Preview"}
                      </span>
                      <button
                        className={cx("book-page-button")}
                        type="button"
                        onClick={() => handlePageTurn("next")}
                        disabled={!isSelectedPdf}
                      >
                        Next
                      </button>
                    </div>

                    <div className={cx("book-stage")}>
                      <button
                        className={cx("book-turn-zone book-turn-zone-left")}
                        type="button"
                        onClick={() => handlePageTurn("previous")}
                        disabled={!isSelectedPdf || readerPage === 1}
                        aria-label="Previous page"
                      >
                        <span className={cx("book-turn-label")}>Previous page</span>
                      </button>
                      <button
                        className={cx("book-turn-zone book-turn-zone-right")}
                        type="button"
                        onClick={() => handlePageTurn("next")}
                        disabled={!isSelectedPdf}
                        aria-label="Next page"
                      >
                        <span className={cx("book-turn-label")}>Next page</span>
                      </button>
                      <div
                        className={cx(
                          turnDirection === "next"
                            ? "page-flip-sheet page-flip-sheet-next"
                            : turnDirection === "previous"
                              ? "page-flip-sheet page-flip-sheet-previous"
                              : "page-flip-sheet"
                        )}
                      />
                      <div className={cx("preview-frame")}>
                    {selectedDocument.fileType?.startsWith("image/") ? (
                      <img className={cx("preview-image")} src={selectedDocument.documentUrl} alt={selectedDocument.title} />
                    ) : (
                      <iframe
                        className={cx("preview-iframe")}
                        key={`${selectedDocument._id || selectedDocument.documentUrl}-${readerPage}`}
                        src={getPreviewUrl(selectedDocument, readerPage)}
                        title={`${selectedDocument.title} page ${readerPage}`}
                      />
                    )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={cx("preview-placeholder")}>
                    <DescriptionOutlinedIcon className={cx("preview-placeholder-icon")} />
                    <h4 className={cx("preview-placeholder-title")}>Preview is not available for this file type</h4>
                  <p className={cx("preview-placeholder-copy")}>
                      Download the original file to open this resource in the right application.
                    </p>
                  </div>
                )}

                <div className={cx("reader-actions")}>
                  {selectedDocument.documentUrl && (
                    <a className={cx("reader-download")} href={selectedDocument.documentUrl} target="_blank" rel="noreferrer" download={selectedDocument.fileName}>
                      <CloudDownloadOutlinedIcon />
                      Download Original
                    </a>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
