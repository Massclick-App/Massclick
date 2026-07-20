import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import styles from "./privacyPolicy.module.css"; // New CSS file
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import StickySearchBar from '../../StickySearchBar/StickySearchBar';
import Footer from '../footer';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";

const cx = createScopedClassNames(styles);
const policyData = [{
  id: 1,
  title: "1. Information We Collect",
  content: <>
                <p>a. <strong>Personal Information:</strong> When you register or use the Website, we collect information such as your name, mobile number, email address, and location. Your mobile number is verified through a One-Time Password (OTP) at the time of login.</p>
                <p>b. <strong>Business Information:</strong> When a business registers or lists on Massclick, we collect business details such as business name, category, address, contact details, working hours, photographs, and logo. For business verification and certification, we may also collect supporting documents such as business registration details, GST certificate, address proof, identity proof (such as Aadhaar, where required), and business ownership proof.</p>
                <p>c. <strong>Usage Information:</strong> We collect information about how you use the Website, including the categories and locations you search for, the listings and feed posts you view or interact with, enquiries you submit, and reviews, ratings, or feedback you provide.</p>
                <p>d. <strong>Device and Technical Information:</strong> We may collect device type, browser type, IP address, operating system, and push-notification tokens to deliver and improve our services.</p>
            </>
}, {
  id: 2,
  title: "2. Use of Information",
  content: <>
                <p>a. We may use the information we collect to:</p>
                <ul>
                    <li>Provide, personalize, and improve our services.</li>
                    <li>Verify your identity and prevent fake or spam accounts.</li>
                    <li>Connect you with relevant businesses (and businesses with interested customers) based on your searches and enquiries.</li>
                    <li>Communicate with you about your account, enquiries, and service updates.</li>
                    <li>Send you promotional materials, offers, and updates about our services, where permitted.</li>
                    <li>Analyze usage patterns to understand how Users interact with the Website.</li>
                    <li>Detect, investigate, and prevent fraudulent or unauthorized activities.</li>
                    <li>Comply with legal obligations.</li>
                </ul>
                <p>b. We do not sell, rent, or lease your personal information to third parties, except as described in this Policy.</p>
            </>
}, {
  id: 3,
  title: "3. Lead Sharing & WhatsApp Communications",
  content: <>
                <p>a. Massclick operates a two-way lead generation service. When you search for a category, click a category card, or submit an enquiry after logging in, an enquiry (&quot;Lead&quot;) is generated based on your expressed interest.</p>
                <p>b. As part of this service, your name, mobile number, location, and the category or service you searched for may be shared — including via WhatsApp — with registered businesses that match your enquiry, so that they can respond to your requirement. Similarly, the business name, contact details, and address of matching businesses may be shared with you.</p>
                <p>c. For business members of MNI (Massclick Network India), business requirements and contact details you submit may be shared with other verified business members in the relevant category for B2B networking purposes.</p>
                <p>d. By logging in and using the search, enquiry, or MNI features, you consent to this sharing. If you do not wish your details to be shared with businesses, please do not submit enquiries, or contact us to opt out.</p>
                <p>e. Once your details are shared with a business (or a business&apos;s details are shared with you), any further communication between you and that business is between the two of you. We encourage all parties to communicate responsibly; however, Massclick is not responsible for the conduct of Users or businesses outside the platform.</p>
            </>
}, {
  id: 4,
  title: "4. Cookies & Tracking Technologies",
  content: <>
                <p>a. We use cookies, local storage, and similar technologies to keep you logged in, remember your preferences (such as your selected location), measure site performance, and understand usage patterns.</p>
                <p>b. You can control or delete cookies through your browser settings. Disabling cookies may affect certain features of the Website, such as staying logged in.</p>
            </>
}, {
  id: 5,
  title: "5. Disclosure of Information",
  content: <>
                <p>a. We may disclose your personal information to third-party service providers who assist us in operating our business and providing services to you — such as cloud hosting, SMS/OTP delivery, WhatsApp messaging, push notifications, and analytics providers. These service providers are bound by confidentiality obligations and are only authorized to use your personal information as necessary to perform their services.</p>
                <p>b. We may disclose your personal information to comply with applicable laws, regulations, legal processes, or enforceable governmental requests, or to protect the rights, privacy, safety, or property of Massclick, our Users, and the public.</p>
                <p>c. If Massclick is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction, subject to this Policy.</p>
            </>
}, {
  id: 6,
  title: "6. Payments",
  content: <>
                <p>a. Payments for paid memberships, advertisements, and other paid services are processed through third-party payment gateways. Your card, UPI, or banking credentials are collected and processed directly by the payment gateway and are not stored on our servers.</p>
                <p>b. We retain transaction records (such as order ID, amount, plan details, and payment status) for accounting, invoicing, and legal compliance.</p>
            </>
}, {
  id: 7,
  title: "7. Data Security",
  content: <>
                <p>a. We implement reasonable security practices and procedures to protect your personal information from unauthorized access, alteration, disclosure, or destruction, including access controls and encryption where appropriate.</p>
                <p>b. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security. You are responsible for keeping your OTP and device secure and for not sharing them with others.</p>
            </>
}, {
  id: 8,
  title: "8. Data Retention",
  content: <>
                <p>a. We retain your personal information for as long as your account is active or as needed to provide our services.</p>
                <p>b. When information is no longer required, we delete or anonymize it, except where retention is required for legal, tax, accounting, dispute-resolution, or fraud-prevention purposes (see also &quot;Account and Data Deletion&quot; below).</p>
            </>
}, {
  id: 9,
  title: "9. Your Rights & Choices",
  content: <>
                <p>a. Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you have the right to:</p>
                <ul>
                    <li>Access the personal information we hold about you.</li>
                    <li>Request correction or updating of inaccurate or incomplete information.</li>
                    <li>Request erasure of your personal information.</li>
                    <li>Withdraw consent previously given, where processing is based on consent.</li>
                    <li>Nominate another individual to exercise your rights in the event of death or incapacity.</li>
                    <li>Raise a grievance regarding the processing of your personal information.</li>
                </ul>
                <p>b. You may opt out of promotional communications at any time by following the opt-out instructions in the communication or by contacting us. We may still send you non-promotional, service-related communications.</p>
                <p>c. To exercise any of these rights, contact us using the details in the &quot;Grievances & Contact Us&quot; section. We may need to verify your identity (for example, via OTP) before acting on your request.</p>
            </>
}, {
  id: 10,
  title: "10. Account and Data Deletion",
  content: <>
                <p>You can request permanent deletion of your Massclick account and associated personal data from our <a className={cx("privacy-link")} href="/deleteaccount">account deletion page</a>. We verify account ownership using an OTP sent to the registered mobile number.</p>
                <p>Account profile data, contact details, favorites, search history, reviews, feedback, feed activity, notification tokens, and personal business-listing links are deleted as part of the request. Active-system deletion is targeted within seven days.</p>
                <p>A minimal request record and residual encrypted backup copies may remain for up to 90 days. Payment, invoice, and tax records may be retained for up to eight financial years, or longer where an active legal, tax, fraud-prevention, or regulatory obligation requires it. Retained records are access-restricted and are not used for marketing.</p>
            </>
}, {
  id: 11,
  title: "11. Children's Privacy",
  content: <>
                <p>a. The Website is not intended for children under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected personal information from a child under 18, we will take reasonable steps to delete such information from our records.</p>
            </>
}, {
  id: 12,
  title: "12. Third-Party Links & Content",
  content: <>
                <p>a. The Website may contain links to third-party websites, business websites, social media pages, or content published by businesses (such as offers and posts). We are not responsible for the privacy practices or content of those third parties. We encourage you to review the privacy policies of any third-party sites you visit.</p>
            </>
}, {
  id: 13,
  title: "13. Changes to this Policy",
  content: <>
                <p>a. We may update this Policy from time to time. Any changes will be posted on this page with a revised &quot;Last Updated&quot; date. Where the changes are material, we will make reasonable efforts to notify you. By continuing to use the Website after the updates are made, you accept the revised Policy.</p>
            </>
}, {
  id: 14,
  title: "14. Grievances & Contact Us",
  content: <>
                <p>a. If you have any questions, concerns, complaints, or requests regarding this Policy or the handling of your personal information, please contact our Grievance Officer at <a className={cx("privacy-link")} href="mailto:support@massclick.in">support@massclick.in</a>. We aim to acknowledge and resolve grievances within the timelines prescribed under applicable law.</p>
                <p>By using massclick.in, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.</p>
            </>
}];
const AccordionItem = ({
  item,
  isOpen,
  onClick
}) => {
  return <div className={cx(`privacy-accordion-item ${isOpen ? 'open' : ''}`)}>
            <button className={cx("privacy-accordion-header")} onClick={() => onClick(item.id)}>
                <h3 className={cx("privacy-accordion-title")}>{item.title}</h3>
                <div className={cx("privacy-accordion-icon")}>
                    {isOpen ? <RemoveIcon /> : <AddIcon />}
                </div>
            </button>
            <div className={cx("privacy-accordion-content")}>
                {item.content}
            </div>
        </div>;
};
const PrivacyPolicy = () => {
  const dispatch = useDispatch();
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer);
  useEffect(() => {
    dispatch(fetchSeoMeta({
      pageType: "privacy"
    }));
  }, [dispatch]);
  const fallbackSeo = {
    title: "Privacy and Policy - Massclick",
    description: "Massclick is a leading local search platform helping users discover trusted businesses and services.",
    keywords: "about massclick, business directory, local search",
    canonical: "https://massclick.in/privacy",
    robots: "index, follow"
  };
  const [openItemId, setOpenItemId] = useState(policyData[0].id);
  const handleToggle = id => {
    setOpenItemId(openItemId === id ? null : id);
  };
  return <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <StickySearchBar />
            <section className={cx("section-privacy")}>
                <div className={cx("privacy-header-wrapper")}>
                    <h2 className={cx("section-title-privacy")}>Our <span className={cx("highlight-text-privacy")}>Privacy Policy</span></h2>
                    <p className={cx("section-subtitle-privacy")}>
                        This Privacy Policy (&quot;Policy&quot;) explains how massclick.in (&quot;Website&quot;) collects, uses, discloses, and protects the personal information of users (&quot;Users&quot; or &quot;you&quot;) when using our Website. By accessing or using the Website, you consent to the collection, use, disclosure, and protection of your personal information as described in this Policy. If you do not agree with any part of this Policy, please refrain from using our Website.
                    </p>
                    <p className={cx("section-subtitle-privacy")}>Last Updated: 20 July 2026</p>
                </div>

                <div className={cx("privacy-accordion-container")}>
                    {policyData.map(item => <AccordionItem key={item.id} item={item} isOpen={item.id === openItemId} onClick={handleToggle} />)}
                </div>
            </section>
            <Footer />
        </>;
};
export default PrivacyPolicy;
