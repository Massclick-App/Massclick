import React from "react";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonIcon from "@mui/icons-material/Person";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import EmailIcon from "@mui/icons-material/Email";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import LanguageIcon from "@mui/icons-material/Language";
import CampaignIcon from "@mui/icons-material/Campaign";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import PublicIcon from "@mui/icons-material/Public";
import SettingsIcon from "@mui/icons-material/Settings";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import StarIcon from "@mui/icons-material/Star";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import EditIcon from "@mui/icons-material/Edit";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import {
  MASSCLICK_PRODUCT_ITEM,
  normalizeFormItems,
  money,
  formatDate,
  calculateTotals,
  paymentStatusLabel,
  paymentMethodLabel,
} from "features/admin/quotation/quotationUtils.js";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/admin/quotation/quotationPdf.module.css";

const cx = createScopedClassNames(styles);
const coreInclusions = [
  "Business listing / profile setup",
  "Category-based visibility",
  "Enquiry support",
  "WhatsApp lead notification support",
  "MNI (Mass Network India) access",
  "Service card visibility",
  "MassClick feed / profile visibility",
  "1 year product validity",
  "Renewal required after 1 year",
];
const features = [
  {
    title: "Google Search Based Leads Generation",
    text: "When customers search using relevant keywords, MassClick helps generate business leads through Google-based discovery.",
    Icon: SearchIcon,
  },
  {
    title: "Website Search Based Leads Generation",
    text: "MassClick receives visits from a large website audience, and leads are generated when users directly search and explore businesses on the platform.",
    Icon: LanguageIcon,
  },
  {
    title: "MNI – Mass Network India",
    text: "A B2B business networking concept that helps business owners connect with other business persons, build partnerships, and create opportunities.",
    Icon: GroupsIcon,
  },
  {
    title: "Spotlight",
    text: "Spotlight is used to promote offers, discounts, and special business promotions, similar to an advertising placement that improves visibility.",
    Icon: StarIcon,
  },
  {
    title: "Marketing Materials",
    text: "Digital-access marketing materials such as visiting cards, letterheads, quotations, vouchers, and related business assets are included for brand support.",
    Icon: VolumeUpIcon,
  },
];

const featureIcon = (label = "") => {
  const normalized = label.toLowerCase();
  if (normalized.includes("youtube") || normalized.includes("video"))
    return OndemandVideoIcon;
  if (normalized.includes("website") || normalized.includes("web"))
    return PublicIcon;
  if (normalized.includes("marketing") || normalized.includes("campaign"))
    return CampaignIcon;
  return StarIcon;
};

const Header = ({ logoSrc, type, number }) => (
  <header className={cx("header")}>
    <div className={cx("headerWash")} />
    <div className={cx("brand")}>
      <img src={logoSrc} alt="MassClick Technologies Pvt Ltd" />
      <b>DISCOVER &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; GROW</b>
    </div>
    <div className={cx("motto")}>
      <span />
      SMART
      <br />
      BUSINESSES
      <br />
      STRONGER
      <br />
      TOMORROW
      <i />
    </div>
    <div className={cx("headerOrange")} />
    <div className={cx("headerNavy")} />
    <div className={cx("documentTitle")}>
      <div className={cx("documentIcon")}>
        {type === "quotation" ? <DescriptionIcon /> : <StarIcon />}
      </div>
      <div>
        <strong>{type === "quotation" ? "QUOTATION" : "MASSCLICK"}</strong>
        <b>{type === "quotation" ? number : "LISTING & FEATURES"}</b>
        <small>
          BUSINESS GROWTH
          <br />
          THROUGH DIGITAL SOLUTIONS
        </small>
      </div>
    </div>
  </header>
);

const Footer = ({ quotation }) => (
  <footer className={cx("footer")}>
    <div className={cx("footerContact")}>
      <span>
        <LocalPhoneIcon />
        {quotation.businessPhone || "+91 9789104201"}
      </span>
      <i />
      <span>
        <EmailIcon />
        {quotation.businessEmail || "admin@massclick.in"}
      </span>
      <i />
      <span>
        <LanguageIcon />
        www.massclick.in
      </span>
      <b>DISCOVER &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; GROW</b>
    </div>
    <div className={cx("footerOrange")}>
      <strong>
        THANK YOU FOR
        <br />
        YOUR BUSINESS
      </strong>
      <small>Let&apos;s Grow Together.</small>
    </div>
  </footer>
);

const PanelTitle = ({ icon: Icon, children, note }) => (
  <div className={cx("panelTitle")}>
    <span>
      <Icon />
    </span>
    <strong>{children}</strong>
    {note && <small>{note}</small>}
  </div>
);

export const QuotationPdfPage1 = ({
  innerRef,
  quotation,
  logoSrc,
  signatureSrc,
  qrSrc,
}) => {
  const item = normalizeFormItems(quotation.items)[0] || MASSCLICK_PRODUCT_ITEM;
  const totals = calculateTotals(quotation);
  const validityDays =
    quotation.issueDate && quotation.validUntil
      ? Math.max(
          0,
          Math.round(
            (new Date(quotation.validUntil) - new Date(quotation.issueDate)) /
              86400000,
          ),
        )
      : 0;
  const months = Number(quotation.digitalMarketingMonths || 0),
    videos = Number(quotation.youtubeVideoCount || 0),
    websites = Number(quotation.websiteCount || 0);
  const complimentaryPlans =
    Array.isArray(quotation.complimentaryPlans) &&
    quotation.complimentaryPlans.length
      ? quotation.complimentaryPlans
      : [
          {
            name: "Plan 1",
            badge: "Most Popular",
            selected: true,
            features: [
              {
                label: "Digital Marketing",
                quantity: months || 2,
                unit: months === 1 ? "Month" : "Months",
                selected: true,
              },
              {
                label: "YouTube Videos",
                quantity: videos || 2,
                unit: "Videos",
                selected: true,
              },
            ],
          },
          {
            name: "Plan 2",
            badge: "",
            selected: false,
            features: [
              {
                label: "Digital Marketing",
                quantity: 1,
                unit: "Month",
                selected: true,
              },
              {
                label: "Websites",
                quantity: websites,
                unit: "Websites",
                selected: true,
              },
              {
                label: "YouTube Videos",
                quantity: videos,
                unit: "Videos",
                selected: true,
              },
            ],
          },
        ];
  return (
    <div className={cx("page", "pageOne")} ref={innerRef}>
      <Header
        logoSrc={logoSrc}
        type="quotation"
        number={quotation.quotationNo || "-"}
      />
      <section className={cx("companyMeta")}>
        <div className={cx("companyInfo")}>
          <h1>Massclick Technologies Pvt Ltd</h1>
          <p>Discover Local. Grow Global.</p>
          <div className={cx("contactGrid")}>
            <span>
              <LocationOnIcon />
              {quotation.businessAddress || "Tamil Nadu, India"}
            </span>
            <span>
              <LocalPhoneIcon />
              {quotation.businessPhone || "+91 9789104201"}
            </span>
            <span>
              <EmailIcon />
              {quotation.businessEmail || "admin@massclick.in"}
            </span>
            <span>
              <LanguageIcon />
              www.massclick.in
            </span>
          </div>
        </div>
        <div className={cx("quoteMeta")}>
          <div>
            <b>QUOTATION NO.</b>
            <strong>{quotation.quotationNo || "-"}</strong>
          </div>
          <div>
            <b>ISSUE DATE</b>
            <strong>{formatDate(quotation.issueDate)}</strong>
          </div>
          <div>
            <b>VALID UNTIL</b>
            <strong>
              {formatDate(quotation.validUntil)}
              <small>
                {validityDays ? `(${validityDays} Days from Issue Date)` : ""}
              </small>
            </strong>
          </div>
        </div>
        {qrSrc && (
          <div className={cx("qr")}>
            <img src={qrSrc} alt="MassClick QR code" />
            <b>
              SCAN TO VISIT
              <br />
              MASSCLICK
            </b>
          </div>
        )}
      </section>
      <section className={cx("topCards")}>
        <div className={cx("panel", "billPanel")}>
          <PanelTitle icon={PersonIcon}>BILL TO</PanelTitle>
          <div className={cx("billBody")}>
            <strong>{quotation.customerName || "Customer Name"}</strong>
            {quotation.customerCompany && (
              <span>
                <SettingsIcon />
                {quotation.customerCompany}
              </span>
            )}
            <span>
              <LocationOnIcon />
              {quotation.customerAddress ||
                "Address Line 1, City, State, Pin Code"}
            </span>
            <span>
              <LocalPhoneIcon />
              {quotation.customerPhone || "Contact Number"}
            </span>
            <span>
              <EmailIcon />
              {quotation.customerEmail || "Email Address"}
            </span>
          </div>
        </div>
        <div className={cx("panel", "summaryPanel")}>
          <PanelTitle icon={QueryStatsIcon} note="Your Growth · Our Commitment">
            COMMERCIAL SUMMARY
          </PanelTitle>
          <div className={cx("summaryBody")}>
            <div>
              <b>Product</b>
              <strong>{item.description}</strong>
              <em>MassClick Product</em>
            </div>
            <div>
              <b>GST</b>
              <strong>{Number(quotation.taxRate || 0)}%</strong>
            </div>
          </div>
          <div className={cx("balanceBar")}>
            <b>BALANCE AMOUNT</b>
            <strong>{money(totals.balanceDue)}</strong>
          </div>
        </div>
      </section>
      <section className={cx("productTable")}>
        <div className={cx("tableHead")}>
          <b>#</b>
          <b>PRODUCT / DESCRIPTION</b>
          <b>QTY</b>
          <b>UNIT PRICE</b>
          <b>AMOUNT</b>
        </div>
        <div className={cx("tableRow")}>
          <b>1</b>
          <div>
            <strong>{item.description}</strong>
            <p>
              Business listing/profile setup, category visibility, enquiry
              support, WhatsApp lead notification support, MNI access, service
              card visibility, business feed support, and core MassClick
              platform features.
              <br />
              <b>
                Validity: 1 Year. Renewal required after completion of one year.
              </b>
            </p>
          </div>
          <b>{Number(item.quantity || 0)}</b>
          <b>{money(item.unitPrice)}</b>
          <b>
            {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
          </b>
        </div>
      </section>
      <section className={cx("detailsGrid")}>
        <div className={cx("panel", "inclusions")}>
          <PanelTitle
            icon={SettingsIcon}
            note="Massclick listing and platform features only"
          >
            KEY INCLUSIONS
          </PanelTitle>
          <ul>
            {coreInclusions.map((line) => (
              <li key={line}>
                <CheckCircleIcon />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <div className={cx("rightDetails")}>
          <div className={cx("panel", "paymentPanel")}>
            <PanelTitle
              icon={DescriptionIcon}
              note="Secure & Hassle-Free Transactions"
            >
              PAYMENT DETAILS
            </PanelTitle>
            <div className={cx("paymentColumns")}>
              <div className={cx("paymentInfo")}>
                <p>
                  <span>Method</span>
                  <b>{paymentMethodLabel(quotation.paymentMethod)}</b>
                </p>
                <p>
                  <span>Paid / Advance</span>
                  <b>{money(totals.advancePayment)}</b>
                </p>
                <p>
                  <span>Reference</span>
                  <b>{quotation.paymentReference || "-"}</b>
                </p>
                <p>
                  <span>Payment Status</span>
                  <b className={cx("status")}>
                    {paymentStatusLabel(totals.paymentStatus)}
                  </b>
                </p>
              </div>
              <div className={cx("totals")}>
                <p>
                  <span>Subtotal</span>
                  <b>{money(totals.subtotal)}</b>
                </p>
                <p>
                  <span>GST ({Number(quotation.taxRate || 0)}%)</span>
                  <b>{money(totals.tax)}</b>
                </p>
                <p className={cx("grand")}>
                  <span>GRAND TOTAL</span>
                  <b>{money(totals.total)}</b>
                </p>
                <p>
                  <span>Advance Paid</span>
                  <b>{money(totals.advancePayment)}</b>
                </p>
                <p className={cx("balance")}>
                  <span>BALANCE AMOUNT</span>
                  <b>{money(totals.balanceDue)}</b>
                </p>
              </div>
            </div>
          </div>
          <div className={cx("panel", "activation")}>
            <PanelTitle icon={DescriptionIcon}>
              PAYMENT &amp; ACTIVATION NOTE
            </PanelTitle>
            <ul>
              <li>
                This quotation is for MassClick listing and core product
                features only.
              </li>
              <li>
                Complimentary promotional offers, if any, are not part of the
                product value.
              </li>
              <li>Product validity is 1 year only.</li>
              <li>
                Renewal is mandatory after completion of one year to continue
                the services.
              </li>
            </ul>
          </div>
        </div>
      </section>
      <section className={cx("growthPlan")}>
        <div className={cx("growthTitle")}>
          <span>
            <CardGiftcardIcon />
          </span>
          <div>
            <strong>
              CHOOSE YOUR <em>COMPLIMENTARY DIGITAL GROWTH PLAN</em>
            </strong>
            <p>
              Select one of the plans below. These value-added services are
              provided <b>FREE</b> for a limited time only.
              <br />
              <b>and are not included in the core product value.</b>
            </p>
          </div>
          <aside>
            <AccessTimeIcon />
            <b>
              Limited Time Offer!
              <br />
              Complimentary Only
            </b>
          </aside>
        </div>
        <div className={cx("plans")}>
          {complimentaryPlans.slice(0, 2).map((plan, planIndex) => (
            <div
              className={cx("plan", plan.selected && "selectedPlan")}
              key={`${plan.name}-${planIndex}`}
            >
              {plan.selected ? (
                <CheckCircleIcon />
              ) : (
                <span className={cx("emptyCheck")} />
              )}
              <div>
                <h3>
                  {plan.name || `Plan ${planIndex + 1}`}{" "}
                  {plan.badge && <small>{plan.badge}</small>}
                </h3>
                {(plan.features || [])
                  .filter((feature) => feature.selected !== false)
                  .slice(0, 5)
                  .map((feature, featureIndex) => {
                    const Icon = featureIcon(feature.label);
                    return (
                      <p key={`${feature.label}-${featureIndex}`}>
                        <Icon />
                        {feature.label} – {Number(feature.quantity || 0)}{" "}
                        {feature.unit}
                        <b>Free</b>
                      </p>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
        <div className={cx("important")}>
          <VolumeUpIcon />
          <div>
            <strong>
              Important: This quotation covers only the MassClick listing and
              core platform features.
            </strong>
            <ul>
              <li>
                The product validity is 1 year from activation. After the
                completion of one year, renewal is required to continue the
                services.
              </li>
              <li>
                Any complimentary benefits are promotional and may be changed or
                removed at any time.
              </li>
              <li>
                These free offers may be revised or withdrawn without prior
                notice.
              </li>
            </ul>
          </div>
        </div>
      </section>
      <section className={cx("signatureRow")}>
        <div className={cx("signatureBox")}>
          <PanelTitle icon={CheckCircleIcon}>CUSTOMER ACCEPTANCE</PanelTitle>
          <p>
            I agree to the above quotation, pricing, validity and plan details.
            <br />I acknowledge the 1-year validity and renewal requirement.
          </p>
          <div className={cx("signatureLines")}>
            <span>Customer Name</span>
            <span>Date</span>
          </div>
        </div>
        <div className={cx("signatureBox", "authorized")}>
          <PanelTitle icon={EditIcon}>AUTHORIZED SIGNATURE</PanelTitle>
          {signatureSrc && (
            <img src={signatureSrc} alt="Authorized signature" />
          )}
          <p>
            Authorized Representative
            <br />
            <b>Massclick Technologies Pvt Ltd</b>
          </p>
          <aside>
            TOGETHER
            <br />
            FOR A SMARTER
            <br />
            TOMORROW
            <i />
          </aside>
        </div>
      </section>
      <Footer quotation={quotation} />
    </div>
  );
};

export const QuotationPdfPage2 = ({ innerRef, quotation, logoSrc }) => (
  <div className={cx("page", "pageTwo")} ref={innerRef}>
    <Header logoSrc={logoSrc} type="features" />
    <main className={cx("featuresMain")}>
      <div className={cx("featuresHeading")}>
        <span />
        <b>5 KEY</b>
        <h1>
          <em>MassClick</em> Features
        </h1>
        <p>
          Powerful tools that help businesses generate leads, improve
          visibility, and grow.
        </p>
      </div>
      <div className={cx("featuresGrid")}>
        {features.map(({ title, text, Icon }, index) => (
          <article
            className={cx("featureCard", index > 2 && "featureWide")}
            key={title}
          >
            <b className={cx("featureNo")}>{index + 1}</b>
            <span className={cx("featureIcon")}>
              <Icon />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </main>
    <Footer quotation={quotation} />
  </div>
);
