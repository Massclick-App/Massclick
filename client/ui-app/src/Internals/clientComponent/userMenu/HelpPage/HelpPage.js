import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DynamicFeedRoundedIcon from "@mui/icons-material/DynamicFeedRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import PolicyRoundedIcon from "@mui/icons-material/PolicyRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import styles from "./HelpPage.module.css";

const cx = createScopedClassNames(styles);

const helpTopics = [
  {
    icon: ManageSearchRoundedIcon,
    title: "Search local businesses",
    category: "Search",
    text: "Use service names, city, area, landmark, or business name to find relevant local results faster.",
    route: "/",
    action: "Start search",
  },
  {
    icon: StorefrontRoundedIcon,
    title: "Manage your business profile",
    category: "Business",
    text: "Update contact details, address, category, photos, and profile information shown to customers.",
    route: "/user_edit-profile",
    action: "Edit profile",
  },
  {
    icon: BusinessCenterRoundedIcon,
    title: "Use MNI for business networking",
    category: "Growth",
    text: "Explore vendor connections, business opportunities, and local discovery workflows for paid business users.",
    route: "/user_mni",
    action: "Open MNI",
  },
  {
    icon: CampaignRoundedIcon,
    title: "Publicize and marketing",
    category: "Promotion",
    text: "Create promotion requests, understand campaign basics, and prepare marketing materials for visibility.",
    route: "/publicize",
    action: "View publicize",
  },
  {
    icon: DynamicFeedRoundedIcon,
    title: "MassClick Feed",
    category: "Updates",
    text: "Post offers, announcements, product updates, and business moments to keep customers informed.",
    route: "/user_feed",
    action: "Open feed",
  },
  {
    icon: FavoriteRoundedIcon,
    title: "Favorites and saved discovery",
    category: "Account",
    text: "Keep useful businesses in Favorites so you can return to them quickly from your dashboard.",
    route: "/user_favorites",
    action: "View favorites",
  },
];

const workflows = [
  {
    title: "Find a trusted local service",
    steps: [
      "Search with service plus location, for example: electrician in Anna Nagar.",
      "Compare business details, contact information, service category, and freshness.",
      "Use Favorites for businesses you want to revisit or compare later.",
    ],
  },
  {
    title: "Improve your business visibility",
    steps: [
      "Keep name, phone, address, category, and profile copy accurate.",
      "Publish offers or useful updates in MassClick Feed.",
      "Use marketing materials and Publicize when you need campaign support.",
    ],
  },
  {
    title: "Get support quickly",
    steps: [
      "Use Customer Service for account, lead, payment, or dashboard issues.",
      "Use Feedback for product suggestions or search quality issues.",
      "Include screenshots, location, search term, and business name when possible.",
    ],
  },
];

const faqs = [
  {
    question: "How do I improve search results?",
    answer:
      "Use a specific service name and location. If a listing looks incorrect, submit feedback with the search term, area, and expected result.",
  },
  {
    question: "Where can I update my business details?",
    answer:
      "Open Edit Business from the dashboard menu. Keep your business name, phone number, category, address, and description current.",
  },
  {
    question: "What is MassClick Feed used for?",
    answer:
      "MassClick Feed is for business updates such as offers, product arrivals, events, service timings, and customer-facing announcements.",
  },
  {
    question: "When should I use Customer Service instead of Feedback?",
    answer:
      "Use Customer Service for urgent help or account-specific problems. Use Feedback for product quality suggestions, local search accuracy, and platform improvements.",
  },
  {
    question: "How does MassClick handle trust and safety?",
    answer:
      "MassClick uses structured review, policy checks, user reports, and support workflows to reduce incorrect listings and suspicious activity.",
  },
];

const supportOptions = [
  {
    icon: SupportAgentRoundedIcon,
    title: "Customer Service",
    text: "Best for account, login, leads, payment, and dashboard support.",
    route: "/user_customer-service",
    action: "Contact support",
  },
  {
    icon: ChatBubbleRoundedIcon,
    title: "Send Feedback",
    text: "Best for search quality, product improvement, listing accuracy, and suggestions.",
    route: "/user_feedback",
    action: "Open feedback",
  },
  {
    icon: PolicyRoundedIcon,
    title: "Policies",
    text: "Review platform expectations, content rules, user responsibilities, and service terms.",
    route: "/user_policy",
    action: "View policy",
  },
];

const standards = [
  "Clear navigation for customers and business users",
  "Guided issue routing for support and product feedback",
  "Practical workflows for search, visibility, and account help",
  "Responsive layout for desktop, tablet, and mobile",
];

export default function HelpPage() {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [activeFaq, setActiveFaq] = useState(faqs[0].question);

  const filteredTopics = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return helpTopics;

    return helpTopics.filter((topic) =>
      [topic.title, topic.category, topic.text].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [searchText]);

  return (
    <main className={cx("help-page")}>
      <div className={cx("page-topbar")}>
        <button
          className={cx("back-button")}
          type="button"
          onClick={() => navigate("/")}
        >
          <ArrowBackRoundedIcon className={cx("button-icon")} />
          Back to dashboard
        </button>
        <span className={cx("page-label")}>Help center</span>
      </div>

      <section className={cx("help-hero")}>
        <div className={cx("hero-content")}>
          <span className={cx("eyebrow")}>MassClick support guide</span>
          <h1 className={cx("hero-title")}>
            Get help with search, business growth, account tools, and support.
          </h1>
          <p className={cx("hero-copy")}>
            A complete help center for MassClick users and business owners:
            discover local services, manage listings, promote your business,
            understand platform rules, and reach the right support channel.
          </p>

          <label className={cx("search-box")}>
            <SearchRoundedIcon className={cx("search-icon")} />
            <input
              className={cx("search-input")}
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search help topics, for example: business profile, feed, favorites"
            />
          </label>
        </div>

        <aside className={cx("hero-panel")} aria-label="Help center standard">
          <HelpOutlineRoundedIcon className={cx("hero-panel-icon")} />
          <span className={cx("panel-label panel-label-light")}>
            International standard
          </span>
          <h2 className={cx("panel-title")}>
            Structured help for every major user journey.
          </h2>
          <p className={cx("panel-copy")}>
            Search guidance, business workflows, trust policies, and support
            escalation are organized in one place.
          </p>
        </aside>
      </section>

      <section className={cx("help-shell")}>
        <div className={cx("main-column")}>
          <section className={cx("section-card")}>
            <div className={cx("section-heading")}>
              <span className={cx("eyebrow")}>Popular topics</span>
              <h2 className={cx("section-title")}>Choose what you need help with</h2>
              <p className={cx("section-copy")}>
                Each card takes you to the right place in the app or explains
                the next practical step.
              </p>
            </div>

            <div className={cx("topic-grid")}>
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <article className={cx("topic-card")} key={topic.title}>
                    <Icon className={cx("topic-icon")} />
                    <span className={cx("topic-category")}>{topic.category}</span>
                    <h3 className={cx("topic-title")}>{topic.title}</h3>
                    <p className={cx("topic-copy")}>{topic.text}</p>
                    <button
                      className={cx("link-button")}
                      type="button"
                      onClick={() => navigate(topic.route)}
                    >
                      {topic.action}
                    </button>
                  </article>
                );
              })}
            </div>

            {!filteredTopics.length && (
              <div className={cx("empty-state")}>
                <ArticleRoundedIcon className={cx("empty-icon")} />
                <h3 className={cx("empty-title")}>No matching help topic</h3>
                <p className={cx("empty-copy")}>
                  Try a simpler term such as search, business, feed, support, or policy.
                </p>
              </div>
            )}
          </section>

          <section className={cx("section-card")}>
            <div className={cx("section-heading")}>
              <span className={cx("eyebrow")}>Guided workflows</span>
              <h2 className={cx("section-title")}>Step-by-step help</h2>
            </div>

            <div className={cx("workflow-grid")}>
              {workflows.map((workflow) => (
                <article className={cx("workflow-card")} key={workflow.title}>
                  <h3 className={cx("workflow-title")}>{workflow.title}</h3>
                  <ol className={cx("workflow-list")}>
                    {workflow.steps.map((step) => (
                      <li className={cx("workflow-item")} key={step}>
                        <CheckCircleRoundedIcon className={cx("workflow-icon")} />
                        <span className={cx("workflow-text")}>{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>

          <section className={cx("section-card")}>
            <div className={cx("section-heading")}>
              <span className={cx("eyebrow")}>FAQ</span>
              <h2 className={cx("section-title")}>Frequently asked questions</h2>
            </div>

            <div className={cx("faq-list")}>
              {faqs.map((faq) => {
                const isOpen = activeFaq === faq.question;
                return (
                  <article className={cx("faq-item")} key={faq.question}>
                    <button
                      className={cx("faq-question")}
                      type="button"
                      onClick={() => setActiveFaq(isOpen ? "" : faq.question)}
                      aria-expanded={isOpen}
                    >
                      {faq.question}
                    </button>
                    {isOpen && <p className={cx("faq-answer")}>{faq.answer}</p>}
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className={cx("side-column")}>
          <div className={cx("support-card support-card-dark")}>
            <SecurityRoundedIcon className={cx("support-icon-dark")} />
            <span className={cx("panel-label panel-label-light")}>
              Trust and safety
            </span>
            <h3 className={cx("support-title-dark")}>
              Report incorrect, suspicious, or outdated information.
            </h3>
            <p className={cx("support-copy-dark")}>
              Accurate local discovery depends on clear reporting. Include
              business name, location, contact detail, and issue context.
            </p>
          </div>

          <div className={cx("support-options")}>
            {supportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <article className={cx("support-card")} key={option.title}>
                  <Icon className={cx("support-icon")} />
                  <h3 className={cx("support-title")}>{option.title}</h3>
                  <p className={cx("support-copy")}>{option.text}</p>
                  <button
                    className={cx("link-button")}
                    type="button"
                    onClick={() => navigate(option.route)}
                  >
                    {option.action}
                  </button>
                </article>
              );
            })}
          </div>

          <div className={cx("standards-card")}>
            <div className={cx("standards-header")}>
              <VerifiedRoundedIcon className={cx("standards-icon")} />
              <div className={cx("standards-heading")}>
                <span className={cx("panel-label")}>Help quality</span>
                <h3 className={cx("standards-title")}>Designed for clarity</h3>
              </div>
            </div>
            <ul className={cx("standards-list")}>
              {standards.map((standard) => (
                <li className={cx("standard-item")} key={standard}>
                  <CheckCircleRoundedIcon className={cx("standard-icon")} />
                  <span className={cx("standard-text")}>{standard}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
