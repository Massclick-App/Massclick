import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import { fetchSeoBlogBySlug } from "../../../../redux/actions/seoPageContentBlogAction";
import { fetchAllAuthors } from "../../../../redux/actions/authorMasterAction.js";
import { throttle } from "../../../../utils/throttle";
import { getPlaceholderImage } from "../../../../utils/placeholderImage";
import { generateArticleSchema, generateBreadcrumbSchema } from "../../../../utils/seoSchemaGenerators";
import styles from "./blogDetails.module.css";
import Navbar from "../relatedBlogNavbar/relatedBlogNavbar";
import Breadcrumbs from "../../Breadcrumbs/Breadcrumbs";
import AuthorCard from "./AuthorCard";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import ArticleIcon from "@mui/icons-material/Article";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DoneIcon from "@mui/icons-material/Done";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import ShareIcon from "@mui/icons-material/Share";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import VisibilityIcon from "@mui/icons-material/Visibility";
const cx = createScopedClassNames(styles);
const BlogDetail = () => {
  const {
    slug
  } = useParams();
  const dispatch = useDispatch();
  const [readingProgress, setReadingProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [copiedContact, setCopiedContact] = useState(false);
  const {
    blog,
    loading,
    error
  } = useSelector(state => state.seoPageContentBlogReducer);
  const { list: authors = [] } = useSelector(state => state.authorMasterReducer || {});

  useEffect(() => {
    if (slug) {
      dispatch(fetchSeoBlogBySlug(slug));
    }
    dispatch(fetchAllAuthors());
  }, [dispatch, slug]);

  // Helper function to get author details by authorId
  const getAuthorData = useCallback(() => {
    if (!blog?.authorId) {
      return {
        name: blog?.author || "Massclick Editorial Team",
        experience: blog?.experience,
        email: blog?.email,
        website: blog?.website,
        linkedin: blog?.linkedin,
        profileLink: null,
      };
    }

    const author = authors.find(a => a._id === blog.authorId);
    if (author) {
      return {
        name: author.displayName,
        experience: author.experience || blog?.experience,
        email: author.email || blog?.email,
        website: author.website || blog?.website,
        linkedin: author.linkedin || blog?.linkedin,
        expertCategory: author.expertCategory,
        profileLink: author.slug ? `/author/${author.slug}` : null,
      };
    }

    return {
      name: blog?.author || "Massclick Editorial Team",
      experience: blog?.experience,
      email: blog?.email,
      website: blog?.website,
      linkedin: blog?.linkedin,
      profileLink: null,
    };
  }, [blog, authors]);
  useEffect(() => {
    const updateReadingProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        setReadingProgress(0);
        return;
      }
      setReadingProgress(Math.min(100, Math.round(scrollTop / scrollHeight * 100)));
    };
    const throttledUpdate = throttle(updateReadingProgress, 60);
    updateReadingProgress();
    window.addEventListener("scroll", throttledUpdate, {
      passive: true
    });
    return () => window.removeEventListener("scroll", throttledUpdate);
  }, []);
  const renderFaqAnswer = (answer = "", links = []) => {
    if (!answer) return "";
    if (!links || links.length === 0) return answer;
    let html = answer;

    // Sort by position/index to replace from end to start (prevents offset issues)
    const sortedLinks = [...links].filter(link => link.linkText && link.url).sort((a, b) => {
      const posA = answer.indexOf(a.linkText);
      const posB = answer.indexOf(b.linkText);
      return posB - posA;
    });
    if (sortedLinks.length === 0) return answer;
    sortedLinks.forEach(link => {
      const escapedText = link.linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedText}\\b`, 'gi');
      html = html.replace(regex, `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="faq-link">${link.linkText}</a>`);
    });
    return html;
  };
  const makeSlug = (text = "") => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const formattedContent = useMemo(() => {
    if (!blog?.pageContent) {
      return {
        introduction: "",
        body: ""
      };
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.pageContent, "text/html");
    const headings = doc.querySelectorAll("h2, h3");
    headings.forEach(item => {
      const text = item.textContent.trim();
      item.setAttribute("id", makeSlug(text));
    });
    const firstStrong = doc.querySelector("p strong");
    if (firstStrong) {
      const text = firstStrong.textContent.trim();
      if (text.toLowerCase() === "introduction") {
        const parent = firstStrong.closest("p");
        if (parent) {
          const introductionHeading = doc.createElement("h2");
          introductionHeading.id = makeSlug(text);
          introductionHeading.textContent = text;
          parent.replaceWith(introductionHeading);
        }
      }
    }
    const introductionHeading = doc.getElementById("introduction");
    if (!introductionHeading) {
      return {
        introduction: "",
        body: doc.body.innerHTML
      };
    }

    const introductionNodes = [introductionHeading];
    let nextNode = introductionHeading.nextElementSibling;
    while (nextNode && !nextNode.matches("h2, h3")) {
      introductionNodes.push(nextNode);
      nextNode = nextNode.nextElementSibling;
    }

    const introductionContainer = doc.createElement("div");
    introductionNodes.forEach(node => introductionContainer.appendChild(node));

    return {
      introduction: introductionContainer.innerHTML,
      body: doc.body.innerHTML
    };
  }, [blog]);
  const tocItems = useMemo(() => {
    if (!blog?.pageContent) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.pageContent, "text/html");
    const items = [];
    const skipWords = ["features", "best for", "price", "includes", "services include"];
    const firstStrong = doc.querySelector("p strong");
    if (firstStrong) {
      const text = firstStrong.textContent.trim();
      if (text.toLowerCase() === "introduction") {
        items.push({
          title: text,
          id: makeSlug(text)
        });
      }
    }
    const headings = doc.querySelectorAll("h2, h3");
    headings.forEach(item => {
      const text = item.textContent.trim();
      const lower = text.toLowerCase();
      const shouldSkip = skipWords.some(word => lower === word || lower.startsWith(word));
      if (!shouldSkip) {
        items.push({
          title: text,
          id: makeSlug(text)
        });
      }
    });
    if (blog?.faq?.length > 0) {
      items.push({
        title: "Frequently Asked Questions",
        id: "frequently-asked-questions"
      });
    }
    return items;
  }, [blog]);
  const scrollToSection = useCallback(id => {
    const el = document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(() => {
      const elementTop = el.getBoundingClientRect().top;
      const pageOffset = window.pageYOffset;
      const offset = 90;
      window.scrollTo({
        top: elementTop + pageOffset - offset,
        behavior: "smooth"
      });
    });
  }, []);
  const handleContentClick = e => {
    const link = e.target.closest("a");
    if (!link) return;
    e.preventDefault();
    const href = link.getAttribute("href");
    if (href && href.startsWith("/")) {
      const parts = href.split("/").filter(Boolean);
      let location = "";
      let category = "";
      if (parts.length === 1) {
        category = parts[0];
      } else {
        category = parts[parts.length - 1];
        location = parts[parts.length - 2];
      }
      if (!location) {
        location = (blog?.location || "trichy").toLowerCase().replace(/\s+/g, "-");
      }
      const url = `https://massclick.in/${location}/${category}`;
      window.open(url, "_blank");
      return;
    }
    let text = link.innerText.toLowerCase().trim();
    let category = "";
    let location = "";
    if (text.includes(" in ")) {
      const parts = text.split(" in ");
      category = parts[0].trim();
      location = parts[1].trim();
    }
    category = category.replace(/near.*$/g, "").replace(/best|top|cheap|low|price/g, "").trim();
    if (!category) category = blog?.category || "services";
    if (!location) location = blog?.location || "trichy";
    category = category.replace(/\s+/g, "-");
    location = location.replace(/\s+/g, "-");
    const url = `https://massclick.in/${location}/${category}`;
    window.open(url, "_blank");
  };
  const ssrMeta = typeof window !== "undefined" ? window.__SSR_SEO__ : null;
  const metaTitle = blog?.metaTitle || ssrMeta?.title || "Massclick Blog";
  const metaDescription = blog?.metaDescription || ssrMeta?.description || "Read expert guides and local business tips on the Massclick blog.";
  const metaKeywords = blog?.metaKeywords || ssrMeta?.keywords || "massclick blog, local business tips";
  const canonical = `https://massclick.in/blog/${slug}`;
  const formatDate = value => {
    if (!value) return null;
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };
  const publishedDate = formatDate(blog?.createdAt);
  const updatedDate = formatDate(blog?.updatedAt);
  const plainContent = useMemo(() => {
    if (!blog?.pageContent) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(blog.pageContent, "text/html");
    return doc.body.textContent || "";
  }, [blog?.pageContent]);
  const wordCount = plainContent.trim().split(/\s+/).filter(Boolean).length;
  const estimatedReadTime = blog?.readTime || `${Math.max(3, Math.ceil(wordCount / 220))} min read`;
  const heroDescription = blog?.metaDescription || "Explore a practical local guide from Massclick with helpful recommendations, business insights and decision-ready details.";
  const articleUrl = canonical;
  const shareTitle = blog?.heading || metaTitle;
  const copyArticleLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      window.prompt("Copy this article link", articleUrl);
    }
  };
  const shareArticle = async () => {
    if (navigator.share) {
      await navigator.share({
        title: shareTitle,
        text: heroDescription,
        url: articleUrl
      });
      return;
    }
    copyArticleLink();
  };
  const renderContentBlock = block => {
    switch (block.type) {
      case "table":
        return <div key={block.id} className={cx("content-block table-block")}>
          <div className={cx("table-container")}>
            <table className={cx("data-table")}>
              <tbody>
                {block.rows.map((row, rIdx) => <tr key={rIdx}>
                  {row.map((cell, cIdx) => <td key={cIdx}>{cell}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>;
      case "code":
        return <div key={block.id} className={cx("content-block code-block")}>
          <div className={cx("code-block-display")}>
            <div className={cx("code-label")}>{block.language}</div>
            <pre>
              <code>{block.content}</code>
            </pre>
          </div>
        </div>;
      case "video":
        return <div key={block.id} className={cx("content-block video-block")}>
          <div className={cx("video-embed")}>
            <iframe width="100%" height="400" src={block.url.includes("youtube.com") || block.url.includes("youtu.be") ? `https://www.youtube.com/embed/${block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]}` : block.url.includes("vimeo.com") ? `https://player.vimeo.com/video/${block.url.match(/vimeo\.com\/(\d+)/)?.[1]}` : block.url} frameBorder="0" allowFullScreen title="Embedded Video"></iframe>
          </div>
        </div>;
      case "callout":
        return <div key={block.id} className={cx("content-block callout-block")}>
          <div className={cx(`callout callout-${block.calloutType}`)}>
            <span className={cx("callout-icon")}>
              {block.calloutType === "info" && "ℹ️"}
              {block.calloutType === "warning" && "⚠️"}
              {block.calloutType === "success" && "✅"}
              {block.calloutType === "error" && "❌"}
              {block.calloutType === "tip" && "💡"}
            </span>
            <p>{block.text}</p>
          </div>
        </div>;
      case "statistics":
        return <div key={block.id} className={cx("content-block statistics-block")}>
          <div className={cx("statistics-grid")}>
            {block.items.map((stat, idx) => <div key={idx} className={cx("stat-card")}>
              <div className={cx("stat-value")}>{stat.value}</div>
              <div className={cx("stat-label")}>{stat.label}</div>
            </div>)}
          </div>
        </div>;
      case "testimonial":
        return <div key={block.id} className={cx("content-block testimonial-block")}>
          <div className={cx("testimonial-card")}>
            <div className={cx("testimonial-text")}>"{block.text}"</div>
            <div className={cx("testimonial-author")}>
              {block.image && <img src={block.image} alt={block.name} />}
              <div>
                <div className={cx("author-name")}>{block.name}</div>
                {block.role && <div className={cx("author-role")}>{block.role}</div>}
              </div>
            </div>
          </div>
        </div>;
      case "steps":
        return <div key={block.id} className={cx("content-block steps-block")}>
          <div className={cx("steps-container")}>
            {block.items.map((step, idx) => <div key={idx} className={cx("step-item")}>
              <div className={cx("step-number")}>{idx + 1}</div>
              <div className={cx("step-content")}>
                <h4>{step.title}</h4>
                {step.description && <p>{step.description}</p>}
              </div>
            </div>)}
          </div>
        </div>;
      case "accordion":
        return <div key={block.id} className={cx("content-block accordion-block")}>
          <div className={cx("accordion-container")}>
            {block.items.map((item, idx) => <div key={idx} className={cx("accordion-item")}>
              <div className={cx("accordion-title")}>
                <span>{item.title}</span>
                <span>▼</span>
              </div>
              <div className={cx("accordion-content")}>{item.content}</div>
            </div>)}
          </div>
        </div>;
      case "button":
        return <div key={block.id} className={cx("content-block button-block")}>
          <div className={cx("button-container")}>
            {block.url ? <a href={block.url} target="_blank" rel="noopener noreferrer" className={cx(`cta-button btn-${block.style}`)}>
              {block.text}
            </a> : <button className={cx(`cta-button btn-${block.style}`)}>{block.text}</button>}
          </div>
        </div>;
      case "features":
        return <div key={block.id} className={cx("content-block features-block")}>
          <div className={cx("features-grid")}>
            {block.items.map((feature, idx) => <div key={idx} className={cx("feature-card")}>
              <div className={cx("feature-icon")}>{feature.icon}</div>
              <h4>{feature.title}</h4>
              {feature.description && <p>{feature.description}</p>}
            </div>)}
          </div>
        </div>;
      case "prosCons":
        return <div key={block.id} className={cx("content-block proscons-block")}>
          <div className={cx("proscons-container")}>
            <div className={cx("pros-column")}>
              <h4>✅ Pros</h4>
              <ul>
                {block.pros.map((pro, idx) => <li key={idx}>{pro}</li>)}
              </ul>
            </div>
            <div className={cx("cons-column")}>
              <h4>❌ Cons</h4>
              <ul>
                {block.cons.map((con, idx) => <li key={idx}>{con}</li>)}
              </ul>
            </div>
          </div>
        </div>;
      default:
        return null;
    }
  };
  const openContactPopover = business => {
    setSelectedContact(business);
    setCopiedContact(false);
  };
  const closeContactPopover = () => {
    setSelectedContact(null);
    setCopiedContact(false);
  };
  const copyContactNumber = async () => {
    if (!selectedContact?.contact) return;
    try {
      await navigator.clipboard.writeText(selectedContact.contact);
      setCopiedContact(true);
      window.setTimeout(() => setCopiedContact(false), 1600);
    } catch (error) {
      window.prompt("Copy this contact number", selectedContact.contact);
    }
  };
  if (loading) return null;
  if (error) return <div className={cx("error")}>Error loading blog</div>;
  if (!blog) return null;

  // Generate Article schema for blog post
  const articleSchema = generateArticleSchema({
    headline: blog.metaTitle || blog.heading,
    description: blog.metaDescription || blog.excerpt,
    image: blog.ogImageKey,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt,
    author: getAuthorData().name
  });

  // Generate Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://massclick.in"
  }, {
    name: blog.category,
    url: `https://massclick.in/${blog.location}/${blog.category}`
  }, {
    name: blog.heading,
    url: canonical
  }]);
  return <>
    <Helmet>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="article" />
      {blog?.ogImage && <meta property="og:image" content={blog.ogImage} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      {blog?.ogImage && <meta name="twitter:image" content={blog.ogImage} />}
      {articleSchema && <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>}
      {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
    </Helmet>
    <Navbar tags={blog?.tags} location={blog?.location} />
    <main>
      <div className={cx("reading-progress")} aria-hidden="true">
        <span style={{
          width: `${readingProgress}%`
        }} />
      </div>

      <div className={cx("blog-container")}>

        <section className={cx("blog-hero")}>
          <div className={cx("blog-hero-copy")}>
            <Breadcrumbs items={[{
              label: "Home",
              link: "/"
            }, {
              label: blog.category,
              link: `/${(blog.location || "trichy").toLowerCase().replace(/\s+/g, "-")}/${(blog.category || "services").toLowerCase().replace(/\s+/g, "-")}`
            }, {
              label: blog.heading
            }]} />

            <div className={cx("blog-kicker")}>
              <span>
                <LocalOfferIcon />
                {blog.category || "Guide"}
              </span>
              {blog.location && <span>
                <PlaceIcon />
                {blog.location}
              </span>}
            </div>

            <div className={cx("blog-header")}>
              <h1>{blog.heading}</h1>
              <p>{heroDescription}</p>

              <div className={cx("blog-meta")}>
                {publishedDate && <span>
                  <CalendarTodayIcon />
                  Published {publishedDate}
                </span>}
                {updatedDate && <span>
                  <TrendingUpIcon />
                  Updated {updatedDate}
                </span>}
                <span>
                  <VisibilityIcon />
                  {blog.views || 48} views
                </span>
                <span>
                  <AccessTimeIcon />
                  {estimatedReadTime}
                </span>
              </div>
            </div>

            <div className={cx("hero-actions")}>
              <button type="button" className={cx("share-btn primary-share")} onClick={shareArticle}>
                <ShareIcon />
                Share Article
              </button>
              <button type="button" className={cx("share-btn")} onClick={copyArticleLink}>
                {copied ? <DoneIcon /> : <ContentCopyIcon />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>

          <div className={cx("blog-hero-media")}>
            {blog.pageImages?.[0] && <img src={blog.pageImages[0]} className={cx("hero-img")} alt={blog.heading} />}
            <div className={cx("hero-stat-card")}>
              <span>Article depth</span>
              <strong>{wordCount || "Fresh"} words</strong>
            </div>
          </div>
        </section>

        <div className={cx("article-quick-stats")}>
          <div>
            <ArticleIcon />
            <span>Guide Type</span>
            <strong>{blog.category || "Local Guide"}</strong>
          </div>
          <div>
            <AccessTimeIcon />
            <span>Reading Time</span>
            <strong>{estimatedReadTime}</strong>
          </div>
          <div>
            <PlaceIcon />
            <span>Focus Area</span>
            <strong>{blog.location || "Massclick"}</strong>
          </div>
        </div>

        {blog.businessDetails?.length > 0 && <div className={cx("business-section")}>

          <h2 className={cx("business-title")}>Popular Businesses</h2>

          <div className={cx("business-grid")}>
            {blog.businessDetails.map((b, index) => <article className={cx("business-card")} key={b._id || b.businessName || index}>

              <div className={cx("business-header")}>
                <h3>{b.businessName}</h3>

                <button type="button" className={cx("call-btn")} onClick={() => openContactPopover(b)}>
                  <PhoneIcon />
                  Call
                </button>
              </div>

              <img src={b.bannerImage || getPlaceholderImage()} alt={b.businessName} className={cx("business-img")} loading="lazy" onError={event => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = getPlaceholderImage();
              }} />

              <p className={cx("business-desc")}>
                {b.businessName} is one of the best {b.category} in {b.location}.
              </p>

              <div className={cx("business-info")}>

                <div>
                  <strong>Experience</strong>
                  <p>{b.experience || "-"}</p>
                </div>

                <div>
                  <strong>Category</strong>
                  <p>{b.category || "-"}</p>
                </div>

                <div>
                  <strong>Contact</strong>
                  <p>{b.contact || "-"}</p>
                </div>
              </div>
              <div className={cx("business-address")}>
                <strong>Address</strong>
                <p>{b.street || b.location || "-"}</p>
              </div>

            </article>)}
          </div>

        </div>}

        {formattedContent.introduction && <div className={cx("introduction-section")}>
          <div className={cx("blog-content introduction-content")} onClick={handleContentClick} dangerouslySetInnerHTML={{
            __html: formattedContent.introduction
          }} />
        </div>}

        <div className={cx("blog-grid")}>

          <div className={cx("blog-content-area")}>

            <div className={cx("blog-content")} onClick={handleContentClick} dangerouslySetInnerHTML={{
              __html: formattedContent.body || (!formattedContent.introduction ? "<p>No content available</p>" : "")
            }} />

            {blog.contentBlocks?.length > 0 && <div className={cx("content-blocks-section")}>
              {blog.contentBlocks.map(block => renderContentBlock(block))}
            </div>}

            {blog.pageImages?.length > 1 && <div className={cx("image-grid")}>
              {blog.pageImages.slice(1).map((img, i) => <img key={i} src={img} alt={`${blog.heading} supporting visual ${i + 2}`} />)}
            </div>}

            {blog.faq?.length > 0 && <div className={cx("faq-section")}>

              <h2 className={cx("faq-title")} id="frequently-asked-questions">
                Frequently Asked Questions
              </h2>

              <div className={cx("faq-wrapper")}>
                {blog.faq.map((item, index) => <div className={cx("faq-item")} key={index}>

                  <h3 className={cx("faq-question")}>
                    {item.question}
                  </h3>

                  <p className={cx("faq-answer")} dangerouslySetInnerHTML={{
                    __html: renderFaqAnswer(item.answer, item.links)
                  }} />

                </div>)}
              </div>

            </div>}

            <div className={cx("comment-box")}>
              <h3>Comments (0)</h3>

              <textarea placeholder="Share your thoughts..." />

              <div className={cx("comment-actions")}>
                <button className={cx("cancel-btn")}>Cancel</button>
                <button className={cx("submit-btn")}>Submit</button>
              </div>
            </div>

            <AuthorCard
              variant="full-width"
              name={getAuthorData().name}
              title={getAuthorData().expertCategory || blog.expertCategory || "Content Expert"}
              profileImage={blog.profileImage || getPlaceholderImage()}
              bio={getAuthorData().experience || `${getAuthorData().name} curates local business guides, service recommendations and city-focused insights to help readers make informed decisions faster.`}
              expertiseAreas={blog.expertiseAreas || (blog.expertCategory ? [blog.expertCategory] : ["Local Guides", "Business Tips", "City Insights"])}
              bestFor={blog.bestFor || []}
              features={blog.features || []}
              email={getAuthorData().email || "content@massclick.in"}
              website={getAuthorData().website}
              linkedin={getAuthorData().linkedin}
              viewProfileLink={getAuthorData().profileLink}
            />

          </div>

          <div className={cx("sidebar")}>

            <AuthorCard
              variant="sidebar"
              name={getAuthorData().name}
              title={getAuthorData().expertCategory || blog.expertCategory || "Content Creator"}
              profileImage={blog.profileImage || getPlaceholderImage()}
              expertiseAreas={blog.expertiseAreas?.slice(0, 2) || (blog.expertCategory ? [blog.expertCategory] : ["Local Guides", "Business Tips"])}
              email={getAuthorData().email}
              website={getAuthorData().website}
              linkedin={getAuthorData().linkedin}
              viewProfileLink={getAuthorData().profileLink}
            />

            <div className={cx("toc")}>
              <h4>List of Contents</h4>

              <ul>
                {tocItems.map((item, index) => <li key={index} onClick={() => scrollToSection(item.id)}>
                  {item.title}
                </li>)}
              </ul>
            </div>

            <div className={cx("sidebar-cta")}>
              <span>Need a quick shortlist?</span>
              <h4>Find trusted {blog.category || "services"} near you</h4>
              <p>
                Use Massclick to compare local options faster and move from reading to action.
              </p>
              <button type="button" onClick={() => {
                const locationSlug = (blog.location || "trichy").toLowerCase().trim().replace(/\s+/g, "-");
                const categorySlug = (blog.category || "services").toLowerCase().trim().replace(/\s+/g, "-");
                window.open(`https://massclick.in/${locationSlug}/${categorySlug}`, "_blank");
              }}>
                Explore Listings
              </button>
            </div>

            <div className={cx("tags")}>
              <h4>Related Tags</h4>

              <div className={cx("tag-list")}>

                {blog?.tags?.length > 0 ? blog.tags.map((tag, index) => <span key={index} onClick={() => {
                  const locationSlug = (blog.location || "trichy").toLowerCase().trim().replace(/\s+/g, "-");
                  const categorySlug = (blog.category || tag).toLowerCase().trim().replace(/\s+/g, "-");
                  window.location.href = `https://massclick.in/${locationSlug}/${categorySlug}`;
                }}>
                  {tag}
                </span>) : <>
                  <span>{blog.category}</span>
                  <span>{blog.location}</span>
                </>}

              </div>
            </div>

          </div>

        </div>
      </div>
    </main>

    {selectedContact && <div className={cx("contact-popover-backdrop")} role="presentation" onClick={closeContactPopover}>
      <div className={cx("contact-popover")} role="dialog" aria-modal="true" aria-labelledby="contact-popover-title" onClick={event => event.stopPropagation()}>
        <button type="button" className={cx("contact-popover-close")} aria-label="Close contact details" onClick={closeContactPopover}>
          <CloseIcon />
        </button>

        <div className={cx("contact-popover-icon")}>
          <PhoneIcon />
        </div>

        <span className={cx("contact-popover-eyebrow")}>Contact number</span>
        <h3 id="contact-popover-title">{selectedContact.businessName}</h3>
        <p>{selectedContact.category} in {selectedContact.location}</p>

        <div className={cx("contact-number-box")}>
          <span>{selectedContact.contact || "Not available"}</span>
        </div>

        <div className={cx("contact-popover-actions")}>
          {selectedContact.contact && <a href={`tel:${selectedContact.contact}`} className={cx("contact-call-link")}>
            <PhoneIcon />
            Call Now
          </a>}

          <button type="button" className={cx("contact-copy-btn")} onClick={copyContactNumber}>
            {copiedContact ? <DoneIcon /> : <ContentCopyIcon />}
            {copiedContact ? "Copied" : "Copy Number"}
          </button>
        </div>
      </div>
    </div>}
  </>;
};
export default BlogDetail;
