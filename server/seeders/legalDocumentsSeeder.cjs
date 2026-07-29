/**
 * Seed the published Privacy Policy and Terms & Conditions into legal_documents.
 *
 * Idempotent: re-running replaces the seeded v1 of each type in place rather
 * than minting duplicates. It refuses to touch a document that has been edited
 * through the admin UI (version > 1 exists) so a real amendment is never
 * clobbered by a redeploy.
 *
 * Run: node server/seeders/legalDocumentsSeeder.cjs
 *      node server/seeders/legalDocumentsSeeder.cjs --uri "mongodb://..."
 */

const mongoose = require("mongoose");

const DEFAULT_URI =
  "mongodb://admin:Massclick123@127.0.0.1:27018/massClick_dev?authSource=admin";

const uriFlagIndex = process.argv.indexOf("--uri");
const MONGO_URI =
  (uriFlagIndex !== -1 && process.argv[uriFlagIndex + 1]) ||
  process.env.MONGO_URI ||
  DEFAULT_URI;

const COLLECTION = "legal_documents";
const EFFECTIVE_DATE = new Date("2026-07-29T00:00:00.000Z");
const CONTACT_EMAIL = "support@massclick.in";

const privacyPolicySections = [
  {
    heading: "Scope of This Policy",
    body: `<p>This Privacy Policy ("Policy") explains how Massclick ("Massclick", "we", "us" or "our") collects, uses, discloses and protects personal information when you use the massclick.in website, the Massclick mobile application, and any related services (together, the "Platform").</p>
<p>This Policy applies to everyone who uses the Platform — individuals searching for local businesses ("Users"), and businesses that list, advertise or subscribe on the Platform ("Business Users"). It should be read together with our Terms &amp; Conditions.</p>
<p>By accessing or using the Platform, you consent to the collection, use and disclosure of your personal information as described in this Policy. If you do not agree with any part of this Policy, please stop using the Platform.</p>`,
  },
  {
    heading: "Information We Collect",
    body: `<p><strong>a. Personal information.</strong> When you register or use the Platform, we collect your name, mobile number, email address and location. Your mobile number is verified through a One-Time Password (OTP) at the time of login.</p>
<p><strong>b. Business information.</strong> When a business registers or lists on Massclick, we collect business details such as business name, category, address, contact details, working hours, photographs and logo. For business verification and certification we may also collect supporting documents such as business registration details, GST certificate, address proof, identity proof (such as Aadhaar, where required) and proof of business ownership.</p>
<p><strong>c. Usage information.</strong> We collect information about how you use the Platform, including the categories and locations you search for, the listings and feed posts you view or interact with, enquiries you submit, and the reviews, ratings or feedback you provide.</p>
<p><strong>d. Device and technical information.</strong> We collect device type, operating system, app version, browser type, IP address, approximate location derived from IP, a device identifier and push-notification tokens, in order to deliver, secure and improve the Platform.</p>
<p><strong>e. Transaction information.</strong> For paid memberships, advertising and other paid services we retain order ID, amount, plan details, invoice details and payment status.</p>
<p>We do not collect sensitive personal data such as biometric information, and we do not ask for your bank, card or UPI credentials at any point.</p>`,
  },
  {
    heading: "Permissions the Mobile App Requests",
    body: `<p>The Massclick mobile app asks only for the permissions it needs to work. Each one is optional, is requested in context, and can be revoked at any time from your device settings.</p>
<ul>
<li><strong>Location (precise and approximate)</strong> — used to show businesses near you, sort results by distance and pre-fill your city. If you decline, you can still search by typing a location manually.</li>
<li><strong>Microphone</strong> — used only while you are actively using voice search. Audio is processed to produce the search text and is not stored by us or used for any other purpose.</li>
<li><strong>Notifications</strong> — used to send you enquiry responses, service updates and, where you have not opted out, offers. You can turn notifications off at any time.</li>
<li><strong>Network access</strong> — required for the app to communicate with our servers.</li>
</ul>
<p>The app does not request access to your contacts, photos, camera, call logs, SMS messages or files on your device.</p>`,
  },
  {
    heading: "How We Use Your Information",
    body: `<p>We use the information we collect to:</p>
<ul>
<li>Provide, personalise and improve the Platform and its services.</li>
<li>Verify your identity and prevent fake, duplicate or spam accounts and listings.</li>
<li>Connect you with relevant businesses, and connect businesses with interested customers, based on your searches and enquiries.</li>
<li>Communicate with you about your account, your enquiries and service updates.</li>
<li>Send you promotional material, offers and updates about our services, where permitted and subject to your choices.</li>
<li>Analyse usage patterns to understand how the Platform is used and where it can be improved.</li>
<li>Detect, investigate and prevent fraudulent, abusive or unauthorised activity.</li>
<li>Comply with our legal and regulatory obligations.</li>
</ul>
<p>We do not sell, rent or lease your personal information to third parties.</p>`,
  },
  {
    heading: "Lead Sharing and WhatsApp Communications",
    body: `<p><strong>a.</strong> Massclick operates a two-way lead generation service. When you search for a category, tap a category card, or submit an enquiry after logging in, an enquiry ("Lead") is generated based on the interest you have expressed.</p>
<p><strong>b.</strong> As part of this service, your name, mobile number, location and the category or service you searched for may be shared — including over WhatsApp and SMS — with registered businesses that match your enquiry, so that they can respond to your requirement. Correspondingly, the name, contact details and address of matching businesses may be shared with you.</p>
<p><strong>c.</strong> For business members of MNI (Massclick Network India), business requirements and contact details submitted may be shared with other verified business members in the relevant category for business-to-business networking.</p>
<p><strong>d.</strong> By logging in and using the search, enquiry or MNI features, you consent to this sharing. If you do not want your details shared with businesses, do not submit enquiries, or contact us at ${CONTACT_EMAIL} to opt out.</p>
<p><strong>e.</strong> Once your details have been shared with a business — or a business's details with you — any further communication is directly between the two of you. We encourage all parties to communicate responsibly, but Massclick is not responsible for conduct that takes place outside the Platform.</p>`,
  },
  {
    heading: "Cookies and Similar Technologies",
    body: `<p><strong>a.</strong> On the website we use cookies, local storage and similar technologies to keep you signed in, remember your preferences (such as your selected location), measure performance and understand usage patterns. The mobile app uses local device storage for the same purposes.</p>
<p><strong>b.</strong> You can control or delete cookies through your browser settings, and clear app storage from your device settings. Disabling them may affect features such as staying signed in.</p>`,
  },
  {
    heading: "Disclosure of Information",
    body: `<p><strong>a.</strong> We share personal information with third-party service providers who help us operate the Platform — including cloud hosting, SMS and OTP delivery, WhatsApp business messaging, push notification delivery, payment processing and analytics. These providers are bound by confidentiality obligations and may use the information only to perform services for us.</p>
<p><strong>b.</strong> We may disclose personal information to comply with applicable law, regulation, legal process or an enforceable governmental request, or to establish, exercise or defend legal claims, or to protect the rights, privacy, safety or property of Massclick, our Users and the public.</p>
<p><strong>c.</strong> If Massclick is involved in a merger, acquisition or sale of assets, your information may be transferred as part of that transaction, and will remain subject to this Policy.</p>`,
  },
  {
    heading: "Payments",
    body: `<p><strong>a.</strong> Payments for memberships, advertising and other paid services are processed through third-party payment gateways. Your card, UPI or net-banking credentials are collected and processed directly by the payment gateway. They never reach, and are never stored on, our servers.</p>
<p><strong>b.</strong> We retain transaction records — order ID, amount, plan, invoice and payment status — for accounting, invoicing, tax and legal compliance.</p>`,
  },
  {
    heading: "Data Security",
    body: `<p><strong>a.</strong> We follow reasonable security practices and procedures, including access controls, encryption in transit and restricted internal access, to protect personal information from unauthorised access, alteration, disclosure or destruction.</p>
<p><strong>b.</strong> No method of transmission over the internet or of electronic storage is completely secure, and we cannot guarantee absolute security. You are responsible for keeping your OTP and your device secure, and for not sharing them with anyone. Massclick will never ask you for your OTP over a call, SMS or WhatsApp message.</p>`,
  },
  {
    heading: "Data Retention",
    body: `<p><strong>a.</strong> We retain your personal information for as long as your account is active or as needed to provide the services you have asked for.</p>
<p><strong>b.</strong> When information is no longer required, we delete or anonymise it — except where retention is required for legal, tax, accounting, dispute-resolution or fraud-prevention purposes. See "Account and Data Deletion" below for the specific timelines.</p>`,
  },
  {
    heading: "Your Rights and Choices",
    body: `<p>Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you have the right to:</p>
<ul>
<li>Access the personal information we hold about you.</li>
<li>Request correction or updating of information that is inaccurate or incomplete.</li>
<li>Request erasure of your personal information.</li>
<li>Withdraw consent you have previously given, where processing is based on consent.</li>
<li>Nominate another individual to exercise your rights in the event of your death or incapacity.</li>
<li>Raise a grievance about how your personal information is being handled.</li>
</ul>
<p>You may opt out of promotional communications at any time by following the opt-out instructions in the message or by contacting us. We may still send you non-promotional, service-related messages.</p>
<p>To exercise any of these rights, contact us using the details in the "Grievances and Contact Us" section. We may need to verify your identity, for example through an OTP, before acting on your request.</p>`,
  },
  {
    heading: "Account and Data Deletion",
    body: `<p>You can request permanent deletion of your Massclick account and associated personal data from the account deletion page on our website, or from Settings in the mobile app. We verify account ownership using an OTP sent to your registered mobile number.</p>
<p>Account profile data, contact details, favourites, search history, reviews, feedback, feed activity, notification tokens and personal business-listing links are deleted as part of the request. Deletion from active systems is targeted within seven days.</p>
<p>A minimal record of the deletion request, and residual encrypted backup copies, may remain for up to 90 days. Payment, invoice and tax records may be retained for up to eight financial years, or longer where an active legal, tax, fraud-prevention or regulatory obligation requires it. Retained records are access-restricted and are never used for marketing.</p>`,
  },
  {
    heading: "Children's Privacy",
    body: `<p>The Platform is not intended for children under the age of 18, and we do not knowingly collect personal information from them. If we become aware that we have inadvertently collected personal information from a child under 18, we will take reasonable steps to delete it from our records. If you believe a child has provided us with personal information, please contact us at ${CONTACT_EMAIL}.</p>`,
  },
  {
    heading: "Third-Party Links and Content",
    body: `<p>The Platform contains links to third-party websites, business websites and social media pages, as well as content published by businesses such as offers and posts. We are not responsible for the privacy practices or the content of those third parties. We encourage you to read the privacy policy of any third-party site you visit.</p>`,
  },
  {
    heading: "Changes to This Policy",
    body: `<p>We may update this Policy from time to time. Any change is published on this page with a revised effective date, and previous versions are retained. Where a change is material we will make reasonable efforts to notify you in advance, for example through the app or by email. Continuing to use the Platform after a change takes effect means you accept the revised Policy.</p>`,
  },
  {
    heading: "Grievances and Contact Us",
    body: `<p>If you have any question, concern, complaint or request regarding this Policy or the handling of your personal information, contact our Grievance Officer:</p>
<p><strong>Grievance Officer, Massclick</strong><br />
Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
<p>We aim to acknowledge every grievance within 24 hours and to resolve it within the timelines prescribed under the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023.</p>
<p>By using the Massclick website or mobile application, you acknowledge that you have read and understood this Privacy Policy.</p>`,
  },
];

const termsSections = [
  {
    heading: "Acceptance of These Terms",
    body: `<p><strong>a.</strong> These Terms &amp; Conditions ("Terms") form a legally binding agreement between you and Massclick ("Massclick", "we", "us" or "our") governing your use of the massclick.in website, the Massclick mobile application and all related services (together, the "Platform").</p>
<p><strong>b.</strong> By accessing, browsing, registering on or otherwise using the Platform, you confirm that you have read, understood and agree to be bound by these Terms and by our Privacy Policy. If you do not agree, please do not use the Platform.</p>
<p><strong>c.</strong> We may amend these Terms from time to time. The current version is always published on this page with its effective date. Where a change is material we will make reasonable efforts to notify you. Continued use of the Platform after a change takes effect constitutes acceptance of the revised Terms.</p>`,
  },
  {
    heading: "Definitions",
    body: `<ul>
<li><strong>"User"</strong> means any person who accesses or uses the Platform, whether or not registered.</li>
<li><strong>"Business User"</strong> means a person or entity that creates, claims or manages a business listing, or purchases a membership, advertisement or other paid service.</li>
<li><strong>"Listing"</strong> means the profile of a business published on the Platform, including its name, category, address, contact details, images and other content.</li>
<li><strong>"Lead"</strong> means an enquiry generated when a User expresses interest in a category, service or business.</li>
<li><strong>"User Content"</strong> means any content you submit to the Platform, including listings, images, reviews, ratings, feed posts, enquiries and feedback.</li>
<li><strong>"MNI"</strong> means Massclick Network India, our business-to-business networking programme for verified Business Users.</li>
</ul>`,
  },
  {
    heading: "Eligibility",
    body: `<p><strong>a.</strong> You must be at least 18 years old and legally capable of entering into a binding contract under the Indian Contract Act, 1872 to use the Platform.</p>
<p><strong>b.</strong> If you use the Platform on behalf of a company, firm or other legal entity, you represent that you are authorised to bind that entity to these Terms, and "you" refers to that entity.</p>
<p><strong>c.</strong> We may refuse service, suspend or terminate accounts, or restrict access to any feature if we reasonably believe these Terms or applicable law have been breached.</p>`,
  },
  {
    heading: "Your Account and OTP Login",
    body: `<p><strong>a.</strong> Access to certain features requires an account. Registration and login are verified through a One-Time Password (OTP) sent to your mobile number. You agree to provide accurate, current and complete information and to keep it up to date.</p>
<p><strong>b.</strong> You are responsible for everything that happens under your account and for keeping your OTP and registered device secure. Massclick will never ask you for your OTP over a call, SMS or WhatsApp message. Treat any such request as fraudulent.</p>
<p><strong>c.</strong> Notify us immediately at ${CONTACT_EMAIL} if you become aware of unauthorised use of your account. We are not liable for loss arising from your failure to keep your credentials secure.</p>
<p><strong>d.</strong> One mobile number may be linked to one User account. Creating accounts by automated means, or to circumvent a suspension, is prohibited.</p>`,
  },
  {
    heading: "Nature of the Platform",
    body: `<p><strong>a.</strong> Massclick is a local search and discovery platform. We publish business listings and connect Users with businesses. We are an intermediary within the meaning of the Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.</p>
<p><strong>b.</strong> We are not a party to any transaction, contract, engagement or dispute between a User and a business. We do not supply the goods or services that businesses advertise, we do not guarantee their quality, availability, pricing, licensing or legality, and we do not act as an agent for either side.</p>
<p><strong>c.</strong> Listings, including any verification badge, indicate that a business has provided information to us and, where applicable, that we have carried out reasonable checks. A badge is not a warranty, endorsement or recommendation, and it does not certify the quality of any goods or services.</p>
<p><strong>d.</strong> You are responsible for making your own enquiries and exercising your own judgement before engaging any business found through the Platform.</p>`,
  },
  {
    heading: "Business Listings and Verification",
    body: `<p><strong>a.</strong> Business Users must ensure their listing information is accurate, current, lawful and not misleading, and must hold all registrations, licences and approvals required to offer the goods or services listed.</p>
<p><strong>b.</strong> For verification and certification we may ask for supporting documents such as business registration details, GST certificate, address proof, identity proof and proof of ownership. Submitting forged, altered or borrowed documents is grounds for immediate removal and may be reported to the authorities.</p>
<p><strong>c.</strong> We may edit, reclassify, suspend or remove a listing that is inaccurate, duplicated, unlawful, in breach of these Terms, or the subject of a credible complaint. Where practicable we will tell you why.</p>
<p><strong>d.</strong> A listing does not transfer any ownership right in the Platform, in search rankings, or in a category or location.</p>`,
  },
  {
    heading: "Leads, Enquiries and Business Networking",
    body: `<p><strong>a.</strong> Massclick operates a two-way lead service. When you search a category, tap a category card or submit an enquiry while logged in, a Lead is generated from the interest you have expressed.</p>
<p><strong>b.</strong> Your name, mobile number, location and the category you searched for may be shared — including over WhatsApp and SMS — with matching registered businesses so they can respond. The details of matching businesses may likewise be shared with you. For MNI members, business requirements may be shared with other verified members in the relevant category.</p>
<p><strong>c.</strong> By using the search, enquiry or MNI features while logged in, you consent to this sharing. If you do not want your details shared, do not submit enquiries, or contact us at ${CONTACT_EMAIL} to opt out.</p>
<p><strong>d.</strong> Business Users must use Lead data only to respond to the enquiry it relates to. Selling, renting, transferring or bulk-marketing to Lead contacts, or contacting them after being asked to stop, is prohibited and will result in termination.</p>
<p><strong>e.</strong> We do not guarantee any number, quality or conversion rate of Leads. Leads are provided on an as-available basis.</p>`,
  },
  {
    heading: "Reviews, Ratings and User Content",
    body: `<p><strong>a.</strong> You are solely responsible for the User Content you submit, and you confirm that you own it or have the rights necessary to publish it on the Platform.</p>
<p><strong>b.</strong> Reviews and ratings must reflect a genuine experience. Posting fake, paid, incentivised or competitor-targeting reviews, or using multiple accounts to influence a rating, is prohibited.</p>
<p><strong>c.</strong> By submitting User Content you grant Massclick a worldwide, non-exclusive, royalty-free, sublicensable and transferable licence to host, store, reproduce, adapt, publish and display that content in connection with operating and promoting the Platform. This licence ends when you delete the content, except for copies retained in backups or where the content has been shared with others.</p>
<p><strong>d.</strong> We may remove or restrict User Content that breaches these Terms or applicable law, and will act on valid takedown requests within the timelines set out in the Intermediary Guidelines.</p>
<p><strong>e.</strong> We do not pre-screen User Content and do not endorse it. Opinions expressed in reviews are those of their authors.</p>`,
  },
  {
    heading: "Paid Memberships, Advertising and Payments",
    body: `<p><strong>a.</strong> Some features — including memberships, promoted placement, banner advertising and MNI participation — are paid. The price, duration and inclusions of each are stated at the point of purchase.</p>
<p><strong>b.</strong> Payments are processed by third-party payment gateways. Your card, UPI or net-banking credentials are handled by the gateway and are never stored on our servers. You must use only a payment instrument you are authorised to use.</p>
<p><strong>c.</strong> All fees are quoted in Indian Rupees and are exclusive of applicable taxes unless stated otherwise. GST is charged at the prevailing rate and a tax invoice is issued to the details you provide.</p>
<p><strong>d.</strong> Paid placement affects where a listing appears but does not alter the factual content of any listing, and it is not an endorsement.</p>
<p><strong>e.</strong> We may revise pricing prospectively. A change never affects a subscription period already paid for.</p>
<p><strong>f.</strong> If a payment is reversed, charged back or fails after a service has been activated, we may suspend that service until the amount is settled.</p>`,
  },
  {
    heading: "Refunds and Cancellations",
    body: `<p><strong>a.</strong> Refunds and cancellations are governed by our Refund Policy, which forms part of these Terms.</p>
<p><strong>b.</strong> Digital services activated on payment — including memberships, promoted placement and advertising — are generally non-refundable once live, except where we have failed to deliver a paid service, or where a refund is required by law.</p>
<p><strong>c.</strong> Where a refund is approved, it is credited to the original payment instrument. Timelines depend on your bank or payment provider.</p>
<p><strong>d.</strong> To raise a refund request, contact ${CONTACT_EMAIL} with your order ID and the reason for the request.</p>`,
  },
  {
    heading: "Prohibited Conduct",
    body: `<p>You must not:</p>
<ul>
<li>Use the Platform for any unlawful, fraudulent, misleading, defamatory, obscene, hateful or harassing purpose.</li>
<li>Publish content that infringes intellectual property, privacy or publicity rights, or that discloses another person's information without consent.</li>
<li>Impersonate any person or business, or misrepresent your affiliation with one.</li>
<li>Scrape, crawl, harvest, mirror or bulk-download listings, contact details or other content, or use the Platform to build a competing database.</li>
<li>Use bots, scripts or automated means to create accounts, generate Leads, inflate metrics or manipulate reviews and rankings.</li>
<li>Interfere with, probe or attempt to gain unauthorised access to the Platform, its servers, networks or the accounts of others.</li>
<li>Upload malware or any code intended to disrupt, damage or limit the functioning of the Platform.</li>
<li>Send unsolicited commercial communications to Users or businesses obtained through the Platform.</li>
</ul>
<p>We may investigate suspected breaches, remove content, suspend accounts and report unlawful activity to the appropriate authorities.</p>`,
  },
  {
    heading: "Intellectual Property",
    body: `<p><strong>a.</strong> The Platform and everything in it other than User Content — including the Massclick name and logo, software, design, layout, graphics, compilations and databases — is owned by Massclick or its licensors and is protected by intellectual property law.</p>
<p><strong>b.</strong> You may use the Platform only as permitted by these Terms. You may not copy, modify, distribute, sell, lease, reverse engineer or create derivative works from any part of it without our prior written consent.</p>
<p><strong>c.</strong> Trade marks, logos and brand names belonging to businesses listed on the Platform remain the property of their respective owners and are displayed for identification purposes only.</p>
<p><strong>d.</strong> If you believe content on the Platform infringes your rights, write to ${CONTACT_EMAIL} with details of the content, your rights and your contact information, and we will act in accordance with applicable law.</p>`,
  },
  {
    heading: "Third-Party Content and Links",
    body: `<p>The Platform contains links to and content from third parties, including business websites, offers, social media pages, maps and payment providers. We do not control these and are not responsible for their content, accuracy, availability, practices or terms. Accessing them is at your own risk and subject to their own terms and privacy policies.</p>`,
  },
  {
    heading: "Disclaimer of Warranties",
    body: `<p><strong>a.</strong> The Platform is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, we disclaim all warranties, express or implied, including those of merchantability, fitness for a particular purpose, accuracy and non-infringement.</p>
<p><strong>b.</strong> We do not warrant that the Platform will be uninterrupted, timely, secure or error-free, that defects will be corrected, or that listings, contact details, working hours, prices or other information are accurate, complete or current.</p>
<p><strong>c.</strong> We do not endorse, guarantee or assume responsibility for any business listed on the Platform or for any content posted by Users or third parties.</p>`,
  },
  {
    heading: "Limitation of Liability",
    body: `<p><strong>a.</strong> To the maximum extent permitted by law, Massclick and its affiliates, directors, officers, employees and agents will not be liable for any indirect, incidental, special, consequential, punitive or exemplary damages, or for any loss of profits, revenue, goodwill, data or business opportunity, arising out of or connected with your use of the Platform — even if we have been advised of the possibility of such damages.</p>
<p><strong>b.</strong> We are not liable for any loss arising from a transaction, engagement or dispute between you and a business found through the Platform, or from any act or omission of a business or other User.</p>
<p><strong>c.</strong> Where liability cannot be excluded, our total aggregate liability arising out of or relating to the Platform is limited to the amount you actually paid us for the service giving rise to the claim in the three months immediately before the event, or ₹1,000, whichever is higher.</p>
<p><strong>d.</strong> Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>`,
  },
  {
    heading: "Indemnity",
    body: `<p>You agree to indemnify and hold harmless Massclick and its affiliates, directors, officers, employees and agents from any claim, demand, loss, liability, cost or expense — including reasonable legal fees — arising out of or connected with your User Content, your use of the Platform, your breach of these Terms or of any applicable law, or your infringement of the rights of a third party.</p>`,
  },
  {
    heading: "Suspension and Termination",
    body: `<p><strong>a.</strong> You may stop using the Platform at any time, and may request deletion of your account and personal data from the account deletion page on our website or from Settings in the mobile app.</p>
<p><strong>b.</strong> We may suspend or terminate your access, with or without notice, if you breach these Terms or applicable law, if your account is used fraudulently, or if we are required to do so by law.</p>
<p><strong>c.</strong> On termination your right to use the Platform ceases immediately, and listings and content associated with your account may be removed. Termination does not entitle you to a refund of fees for a service already delivered, and does not affect rights or liabilities that arose before it.</p>
<p><strong>d.</strong> Provisions that by their nature should survive termination do so — including those on User Content licences, intellectual property, disclaimers, limitation of liability, indemnity and governing law.</p>`,
  },
  {
    heading: "Grievance Redressal",
    body: `<p>In accordance with the Information Technology Act, 2000 and the rules made under it, complaints about content on the Platform or about your use of it may be sent to our Grievance Officer:</p>
<p><strong>Grievance Officer, Massclick</strong><br />
Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
<p>Please include your name and contact details, a description of the complaint, the URL or listing concerned, and any supporting material. We aim to acknowledge complaints within 24 hours and to resolve them within 15 days of receipt.</p>`,
  },
  {
    heading: "Governing Law and Jurisdiction",
    body: `<p><strong>a.</strong> These Terms and any dispute arising out of or relating to them or to the Platform are governed by the laws of India, without regard to conflict-of-law principles.</p>
<p><strong>b.</strong> The courts at Tiruchirappalli (Trichy), Tamil Nadu have exclusive jurisdiction over any such dispute.</p>
<p><strong>c.</strong> Before commencing proceedings, both parties agree to attempt in good faith to resolve the dispute by writing to ${CONTACT_EMAIL} and allowing 30 days for a resolution.</p>`,
  },
  {
    heading: "General",
    body: `<p><strong>a. Severability.</strong> If any provision of these Terms is held invalid or unenforceable, it will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions continue in full force.</p>
<p><strong>b. Waiver.</strong> A failure or delay in enforcing any provision is not a waiver of it or of any other provision.</p>
<p><strong>c. Assignment.</strong> You may not assign or transfer your rights under these Terms without our prior written consent. We may assign ours in connection with a merger, acquisition or sale of assets.</p>
<p><strong>d. Entire agreement.</strong> These Terms, together with the Privacy Policy and the Refund Policy, are the entire agreement between you and Massclick regarding the Platform, and supersede any prior understanding, whether written or oral.</p>
<p>By using massclick.in or the Massclick mobile application, you acknowledge that you have read and understood these Terms &amp; Conditions.</p>`,
  },
];

const slugifyHeading = (heading = "", index = 0) => {
  const slug = heading
    .toString()
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `section-${index + 1}`;
};

const withKeys = (sections) =>
  sections.map((section, index) => ({
    key: slugifyHeading(section.heading, index),
    heading: section.heading,
    body: section.body.trim(),
    order: index,
  }));

const documents = [
  {
    type: "privacy-policy",
    title: "Privacy Policy",
    summary:
      "How Massclick collects, uses, shares and protects your personal information across our website and mobile app, and the choices and rights you have over it.",
    sections: withKeys(privacyPolicySections),
  },
  {
    type: "terms-and-conditions",
    title: "Terms & Conditions",
    summary:
      "The agreement between you and Massclick covering how you may use our website and mobile app, what we do and do not take responsibility for, and how disputes are handled.",
    sections: withKeys(termsSections),
  },
];

const seed = async () => {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to ${mongoose.connection.name}`);

  const collection = mongoose.connection.db.collection(COLLECTION);

  // Match the indexes the application model declares, so the "only one
  // published per type" guarantee holds even on a freshly seeded database.
  await collection.createIndex(
    { type: 1, locale: 1, version: -1 },
    { unique: true, name: "legal_doc_version_unique" }
  );
  await collection.createIndex(
    { type: 1, locale: 1 },
    {
      unique: true,
      partialFilterExpression: { status: "published" },
      name: "legal_doc_single_published",
    }
  );

  for (const document of documents) {
    const amended = await collection.findOne({
      type: document.type,
      locale: "en",
      version: { $gt: 1 },
    });

    if (amended) {
      console.log(
        `SKIP  ${document.type} — v${amended.version} exists, this document has been amended in admin.`
      );
      continue;
    }

    const now = new Date();

    const result = await collection.updateOne(
      { type: document.type, locale: "en", version: 1 },
      {
        $set: {
          status: "published",
          title: document.title,
          summary: document.summary,
          effectiveDate: EFFECTIVE_DATE,
          sections: document.sections,
          contactEmail: CONTACT_EMAIL,
          changeNote: "Initial published version (seeded).",
          publishedAt: EFFECTIVE_DATE,
          publishedBy: { userId: null, userName: "seeder" },
          updatedBy: { userId: null, userName: "seeder" },
          updatedAt: now,
        },
        $setOnInsert: {
          type: document.type,
          locale: "en",
          version: 1,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const action = result.upsertedCount ? "INSERT" : "UPDATE";
    console.log(
      `${action}  ${document.type} v1 — ${document.sections.length} sections, published, effective ${EFFECTIVE_DATE.toISOString().slice(0, 10)}`
    );
  }

  const summary = await collection
    .find({}, { projection: { type: 1, version: 1, status: 1, "sections.heading": 1 } })
    .toArray();

  console.log("\nlegal_documents now holds:");
  summary.forEach((doc) => {
    console.log(
      `  ${doc.type} v${doc.version} [${doc.status}] — ${doc.sections.length} sections`
    );
  });

  await mongoose.disconnect();
};

seed()
  .then(() => {
    console.log("\nSeed complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nSeed failed:", error.message);
    process.exit(1);
  });
