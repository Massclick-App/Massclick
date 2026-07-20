import React from "react";
import { createScopedClassNames } from "../../utils/createScopedClassNames";
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
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import EditNoteIcon from "@mui/icons-material/EditNote";
import InfoIcon from "@mui/icons-material/Info";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SearchIcon from "@mui/icons-material/Search";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import GroupsIcon from "@mui/icons-material/Groups";
import DynamicFeedIcon from "@mui/icons-material/DynamicFeed";
import ShareIcon from "@mui/icons-material/Share";
import ContactMailIcon from "@mui/icons-material/ContactMail";
import ChatIcon from "@mui/icons-material/Chat";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import StarIcon from "@mui/icons-material/Star";
import {
  MASSCLICK_PRODUCT_ITEM,
  PRODUCT_INCLUSION_TEXT,
  serviceAdvantagesText,
  whyChooseMassClick,
  importantNote,
  DEFAULT_QUOTATION_NAME,
  normalizeFormItems,
  money,
  formatDate,
  calculateTotals,
  paymentStatusLabel,
  paymentMethodLabel,
} from "./quotationUtils";
import styles from "./quotationPdf.module.css";

const cx = createScopedClassNames(styles);

const featureIcons = [
  WhatsAppIcon,
  SearchIcon,
  TrendingUpIcon,
  GroupsIcon,
  CampaignIcon,
  DynamicFeedIcon,
  ShareIcon,
  ContactMailIcon,
  ChatIcon,
  MenuBookIcon,
];

export const QuotationPdfPage1 = ({ innerRef, quotation, logoSrc, signatureSrc, qrSrc, qrCaption }) => {
  const items = normalizeFormItems(quotation.items);
  const quoteItem = items[0] || MASSCLICK_PRODUCT_ITEM;
  const totals = calculateTotals(quotation);

  return (
    <div className={cx("page")} ref={innerRef}>
      <div className={cx("header")}>
        <svg className={cx("headerShape")} viewBox="0 0 1050 190" preserveAspectRatio="none">
          <polygon points="462,0 1050,0 1050,190 336,190" fill="#f4711d" />
          <polygon points="483,0 1050,0 1050,190 357,190" fill="#ffffff" />
        </svg>
        <div className={cx("brand")}>
          <img className={cx("brandLogo")} src={logoSrc} alt="MassClick" />
          <p className={cx("brandTagline")}>Discover &bull; Connect &bull; Grow</p>
        </div>
        <div className={cx("headerTag")}>
          <div className={cx("headerTagAccent")} />
          <div className={cx("headerTagShape")} />
          <div className={cx("headerTagContent")}>
            <div className={cx("headerTagIcon")}>
              <DescriptionIcon />
            </div>
            <div className={cx("headerTagText")}>
              <span className={cx("headerTagLabel")}>QUOTATION</span>
              <span className={cx("headerTagNo")}>{quotation.quotationNo || "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={cx("metaRow")}>
        <div className={cx("companyBlock")}>
          <h1 className={cx("companyName")}>Massclick Technologies Pvt Ltd</h1>
          <span className={cx("companyLine")}>
            <LocationOnIcon /> {quotation.businessAddress || "Tamil Nadu, India"}
          </span>
          <span className={cx("companyLine")}>
            <EmailIcon /> {quotation.businessEmail || "support@massclick.in"}
          </span>
        </div>
        <div className={cx("metaRight")}>
          <div className={cx("metaTable")}>
            <div className={cx("metaTableRow")}>
              <span className={cx("metaTableLabel")}>Quotation No</span>
              <span className={cx("metaTableValue")}>{quotation.quotationNo || "-"}</span>
            </div>
            <div className={cx("metaTableRow")}>
              <span className={cx("metaTableLabel")}>Issue Date</span>
              <span className={cx("metaTableValue")}>{formatDate(quotation.issueDate)}</span>
            </div>
            <div className={cx("metaTableRow")}>
              <span className={cx("metaTableLabel")}>Valid Until</span>
              <span className={cx("metaTableValue")}>{formatDate(quotation.validUntil)}</span>
            </div>
          </div>
          {qrSrc && (
            <div className={cx("qrBox")}>
              <img className={cx("qrImage")} src={qrSrc} alt="Scan to WhatsApp MassClick" />
              <div className={cx("qrCaption")}>{qrCaption}</div>
            </div>
          )}
        </div>
      </div>

      <div className={cx("partyGrid")}>
        <div className={cx("partyCard")}>
          <div className={cx("cardHeader")}>
            <div className={cx("cardIconBadge")}>
              <PersonIcon />
            </div>
            <h3>Bill To</h3>
          </div>
          <div className={cx("partyBody", "partyBodyAccent")}>
            <span className={cx("partyName")}>{quotation.customerName || "Customer Name"}</span>
            <span className={cx("partyLine")}>{quotation.customerPhone || "-"}</span>
            <span className={cx("partyLine")}>{quotation.customerEmail || "-"}</span>
            <span className={cx("partyLine")}>{quotation.customerAddress || "-"}</span>
          </div>
        </div>
        <div className={cx("partyCard")}>
          <div className={cx("cardHeader")}>
            <div className={cx("cardIconBadge")}>
              <QueryStatsIcon />
            </div>
            <h3>Commercial Summary</h3>
          </div>
          <div className={cx("partyBody")}>
            <span className={cx("partyName")}>{quotation.quotationName || DEFAULT_QUOTATION_NAME}</span>
            <div className={cx("summaryRow")}>
              <span>Product</span>
              <span>{quoteItem.description}</span>
            </div>
            <div className={cx("summaryRow")}>
              <span>Websites Included</span>
              <span>{Number(quotation.websiteCount || 0)}</span>
            </div>
            <div className={cx("summaryRow")}>
              <span>GST</span>
              <span>{Number(quotation.taxRate || 0)}%</span>
            </div>
          </div>
          <div className={cx("balanceBar")}>
            <span className={cx("balanceBarLabel")}>Balance Due</span>
            <span className={cx("balanceBarValue")}>{money(totals.balanceDue)}</span>
          </div>
        </div>
      </div>

      <div className={cx("advantagesRow")}>
        <div className={cx("advantageItem")}>
          <div className={cx("advantageIcon")}>
            <CampaignIcon />
          </div>
          <div>
            <div className={cx("advantageLabel")}>Digital Marketing</div>
            <div className={cx("advantageValue")}>
              {Number(quotation.digitalMarketingMonths || 0)}{" "}
              {Number(quotation.digitalMarketingMonths || 0) === 1 ? "month" : "months"}
            </div>
          </div>
        </div>
        <div className={cx("advantageItem")}>
          <div className={cx("advantageIcon")}>
            <OndemandVideoIcon />
          </div>
          <div>
            <div className={cx("advantageLabel")}>YouTube Videos</div>
            <div className={cx("advantageValue")}>
              {Number(quotation.youtubeVideoCount || 0)}{" "}
              {Number(quotation.youtubeVideoCount || 0) === 1 ? "video" : "videos"}
            </div>
          </div>
        </div>
        <div className={cx("advantageItem")}>
          <div className={cx("advantageIcon")}>
            <PublicIcon />
          </div>
          <div>
            <div className={cx("advantageLabel")}>Websites</div>
            <div className={cx("advantageValue")}>{Number(quotation.websiteCount || 0)}</div>
          </div>
        </div>
      </div>

      <div className={cx("itemTableWrap")}>
        <table className={cx("itemTable")}>
          <thead>
            <tr>
              <th>#</th>
              <th>Product / Description</th>
              <th className={cx("numCell")}>Qty</th>
              <th className={cx("numCell")}>Unit Price</th>
              <th className={cx("numCell")}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>
                <span className={cx("itemDescTitle")}>{quoteItem.description}</span>
                <span className={cx("itemDescText")}>
                  {PRODUCT_INCLUSION_TEXT} {serviceAdvantagesText(quotation)}
                </span>
              </td>
              <td className={cx("numCell")}>{Number(quoteItem.quantity || 0)}</td>
              <td className={cx("numCell")}>{money(quoteItem.unitPrice)}</td>
              <td className={cx("numCell")}>
                {money(Number(quoteItem.quantity || 0) * Number(quoteItem.unitPrice || 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={cx("paymentGrid")}>
        <div className={cx("paymentCard")}>
          <div className={cx("cardHeader")}>
            <div className={cx("cardIconBadge")}>
              <AccountBalanceWalletIcon />
            </div>
            <h3>Payment Details</h3>
          </div>
          <div className={cx("paymentBody")}>
            <div className={cx("paymentRow")}>
              <span>Method</span>
              <span>{paymentMethodLabel(quotation.paymentMethod)}</span>
            </div>
            <div className={cx("paymentRow")}>
              <span>Due Date</span>
              <span>{formatDate(quotation.paymentDueDate)}</span>
            </div>
            <div className={cx("paymentRow")}>
              <span>Paid / Advance</span>
              <span>{money(totals.advancePayment)}</span>
            </div>
            <div className={cx("paymentRow")}>
              <span>Reference</span>
              <span>{quotation.paymentReference || "-"}</span>
            </div>
          </div>
        </div>
        <div className={cx("totalsCol")}>
          <div className={cx("totalsRow")}>
            <span>Subtotal</span>
            <span>{money(totals.subtotal)}</span>
          </div>
          <div className={cx("totalsRow")}>
            <span>GST ({Number(quotation.taxRate || 0)}%)</span>
            <span>{money(totals.tax)}</span>
          </div>
          <div className={cx("totalsRow", "totalsRowGrand")}>
            <span>Grand Total</span>
            <span>{money(totals.total)}</span>
          </div>
          <div className={cx("totalsRow")}>
            <span>Advance Paid</span>
            <span>{money(totals.advancePayment)}</span>
          </div>
          <div className={cx("totalsRow")}>
            <span>Payment Status</span>
            <span>{paymentStatusLabel(totals.paymentStatus)}</span>
          </div>
          <div className={cx("balanceBar", "balanceBarRounded")}>
            <span className={cx("balanceBarLabel")}>Balance Due</span>
            <span className={cx("balanceBarValue")}>{money(totals.balanceDue)}</span>
          </div>
        </div>
      </div>

      <div className={cx("notePanel")}>
        <div className={cx("noteCol")}>
          <div className={cx("noteHeader")}>
            <div className={cx("noteIcon")}>
              <EditNoteIcon />
            </div>
            <h4>Terms</h4>
          </div>
          <p>{quotation.terms || "-"}</p>
        </div>
        <div className={cx("noteDivider")} />
        <div className={cx("noteCol")}>
          <div className={cx("noteHeader")}>
            <div className={cx("noteIcon")}>
              <InfoIcon />
            </div>
            <h4>Notes</h4>
          </div>
          <p>{quotation.notes || "-"}</p>
        </div>
      </div>

      <div className={cx("acceptPanel")}>
        <div className={cx("acceptCol")}>
          <div className={cx("acceptHeader")}>
            <div className={cx("cardIconBadge")}>
              <EditNoteIcon />
            </div>
            <h3>Customer Acceptance</h3>
          </div>
          <div className={cx("acceptName")}>{quotation.customerName || "Customer Name"}</div>
          <div className={cx("acceptLine")} />
        </div>
        <div className={cx("acceptDivider")} />
        <div className={cx("acceptCol")}>
          <div className={cx("acceptHeader")}>
            <div className={cx("cardIconBadge")}>
              <VerifiedUserIcon />
            </div>
            <h3>Authorized Signature</h3>
          </div>
          {signatureSrc && <img className={cx("acceptSignature")} src={signatureSrc} alt="Authorized signature" />}
          <div className={cx("acceptCaption")}>Authorized Representative</div>
        </div>
      </div>

      <div className={cx("footer")}>
        <div className={cx("footerContacts")}>
          <span>
            <LocalPhoneIcon /> {quotation.businessPhone || "+91 1234 5689 456"}
          </span>
          <span>
            <EmailIcon /> {quotation.businessEmail || "support@massclick.in"}
          </span>
          <span>
            <LanguageIcon /> www.massclick.in
          </span>
        </div>
        <div className={cx("footerThanks")}>
          <div className={cx("footerThanksShape")} />
          <div className={cx("footerThanksText")}>Thank you for your business</div>
        </div>
      </div>
    </div>
  );
};

export const QuotationPdfPage2 = ({ innerRef, quotation, logoSrc }) => (
  <div className={cx("page")} ref={innerRef}>
    <div className={cx("header")}>
      <svg className={cx("headerShape")} viewBox="0 0 1050 190" preserveAspectRatio="none">
        <polygon points="462,0 1050,0 1050,190 336,190" fill="#f4711d" />
        <polygon points="483,0 1050,0 1050,190 357,190" fill="#ffffff" />
      </svg>
      <div className={cx("brand")}>
        <img className={cx("brandLogo")} src={logoSrc} alt="MassClick" />
        <p className={cx("brandTagline")}>Discover &bull; Connect &bull; Grow</p>
      </div>
      <div className={cx("headerTag")}>
        <div className={cx("headerTagAccent")} />
        <div className={cx("headerTagShape")} />
        <div className={cx("headerTagContent")}>
          <div className={cx("headerTagIcon")}>
            <StarIcon />
          </div>
          <div className={cx("headerTagText")}>
            <span className={cx("headerTagLabel")}>FEATURES</span>
            <span className={cx("headerTagNo")}>{quotation.quotationNo || "-"}</span>
          </div>
        </div>
      </div>
    </div>

    <div className={cx("sectionIntro")}>
      <h2>10 Key MassClick Features</h2>
      <p>
        Lead generation, digital presence, discovery, and business network advantages included with this quotation.
      </p>
    </div>

    <div className={cx("featureGrid")}>
      {whyChooseMassClick.map((point, index) => {
        const Icon = featureIcons[index] || StarIcon;
        return (
          <div className={cx("featureCard")} key={point.title}>
            <div className={cx("featureIcon")}>
              <Icon />
              <span className={cx("featureNumber")}>{index + 1}</span>
            </div>
            <div className={cx("featureBody")}>
              <h4>{point.title}</h4>
              <p>
                <span className={cx("featureLang")}>English</span>
                {point.text}
              </p>
              <p className={cx("featureTamil")} lang="ta">
                <span className={cx("featureLang")}>தமிழ்</span>
                {point.tamilText}
              </p>
            </div>
          </div>
        );
      })}
    </div>

    <div className={cx("noteCard", "noteCardFull")}>
      <div className={cx("noteHeader")}>
        <div className={cx("noteIcon")}>
          <InfoIcon />
        </div>
        <h4>Important Note</h4>
      </div>
      <p>{importantNote}</p>
    </div>

    <div className={cx("footer")}>
      <div className={cx("footerContacts")}>
        <span>
          <LocalPhoneIcon /> {quotation.businessPhone || "+91 1234 5689 456"}
        </span>
        <span>
          <EmailIcon /> {quotation.businessEmail || "support@massclick.in"}
        </span>
        <span>
          <LanguageIcon /> www.massclick.in
        </span>
      </div>
      <div className={cx("footerThanks")}>
        <div className={cx("footerThanksShape")} />
        <div className={cx("footerThanksText")}>Thank you for your business</div>
      </div>
    </div>
  </div>
);
