import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from "react-redux";
import './privacyPolicy.css'; // New CSS file
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";

// ----------------------------------------------------
// Content from the uploaded Privacy Policy images
// ----------------------------------------------------
const policyData = [
    {
        id: 1,
        title: "1. Information We Collect",
        content: (
            <>
                <p>a. **Personal Information:** We may collect Business information, such as your name, email address, phone number, and other contact information when you voluntarily provide it to us through the Website.</p>
            </>
        ),
    },
    {
        id: 2,
        title: "2. Use of Information",
        content: (
            <>
                <p>a. We may use the information we collect to:</p>
                <ul>
                    <li>Provide and personalize our services to you.</li>
                    <li>Communicate with you about your account and respond to your inquiries.</li>
                    <li>Send you promotional materials and updates about our services.</li>
                    <li>Improve and optimize the Website's performance and user experience.</li>
                    <li>Analyze and track usage patterns to understand how Users interact with the Website.</li>
                    <li>Detect, investigate, and prevent fraudulent or unauthorized activities.</li>
                </ul>
                <p>b. We will not sell, rent, or lease your personal information to third parties without your consent, except as described in this Policy.</p>
            </>
        ),
    },
    {
        id: 3,
        title: "3. Disclosure of Information",
        content: (
            <>
                <p>a. We may disclose your personal information to third-party service providers who assist us in operating our business and providing services to you. These service providers are bound by confidentiality obligations and are only authorized to use your personal information as necessary to perform their services.</p>
                <p>b. We may disclose your personal information to comply with applicable laws, regulations, legal processes, or enforceable governmental requests, or to protect our rights, privacy, safety, or property, as well as that of our Users and the public.</p>
            </>
        ),
    },
    {
        id: 4,
        title: "4. Data Security",
        content: (
            <>
                <p>a. We implement reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, please note that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
            </>
        ),
    },
    {
        id: 5,
        title: "6. Children's Privacy", // Note: The uploaded text skips section 5, so we follow the numbering provided.
        content: (
            <>
                <p>a. The Website is not intended for children under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected personal information from a child under 18, we will take reasonable steps to delete such information from our records.</p>
            </>
        ),
    },
    {
        id: 6,
        title: "7. Changes to this Policy",
        content: (
            <>
                <p>a. We may update this Policy from time to time. Any changes will be posted on this page with a revised "Effective Date." By continuing to use the Website after the updates are made, you accept the revised Policy.</p>
            </>
        ),
    },
    {
        id: 7,
        title: "8. Change of Privacy Policy",
        content: (
            <>
                <p>We may change this Privacy Policy without notice from time to time as a result of changes in the policies in our company.</p>
            </>
        ),
    },
    {
        id: 8,
        title: "9. Contact Us",
        content: (
            <>
                <p>a. If you have any questions, concerns, or requests regarding this Policy or the privacy practices of the Website, please contact us at support@massclick.in.</p>
                <p>By using massclick.in, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.</p>
            </>
        ),
    },
];

const AccordionItem = ({ item, isOpen, onClick }) => {
    return (
        <div className={`privacy-accordion-item ${isOpen ? 'open' : ''}`}>
            <button className="privacy-accordion-header" onClick={() => onClick(item.id)}>
                <h3 className="privacy-accordion-title">{item.title}</h3>
                <div className="privacy-accordion-icon">
                    {isOpen ? <RemoveIcon /> : <AddIcon />}
                </div>
            </button>
            <div className="privacy-accordion-content">
                {item.content}
            </div>
        </div>
    );
};

const PrivacyPolicy = () => {
    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "privacy" }));
    }, [dispatch]);


    const fallbackSeo = {
        title: "Privacy and Policy - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "about massclick, business directory, local search",
        canonical: "https://massclick.in/privacy",
        robots: "index, follow",
    };

    const [openItemId, setOpenItemId] = useState(policyData[0].id);

    const handleToggle = (id) => {
        setOpenItemId(openItemId === id ? null : id);
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch />
            <section className="section-privacy">
                <div className="privacy-header-wrapper">
                    <h2 className="section-title-privacy">Our <span className="highlight-text-privacy">Privacy Policy</span></h2>
                    <p className="section-subtitle-privacy">
                        This Privacy Policy ("Policy") explains how massclick.in ("Website") collects, uses, discloses, and protects the personal information of users ("Users" or "you") when using our Website. By accessing or using the Website, you consent to the collection, use, disclosure, and protection of your personal information as described in this Policy. If you do not agree with any part of this Policy, please refrain from using our Website.
                    </p>
                </div>

                <div className="privacy-accordion-container">
                    {policyData.map((item) => (
                        <AccordionItem
                            key={item.id}
                            item={item}
                            isOpen={item.id === openItemId}
                            onClick={handleToggle}
                        />
                    ))}
                </div>
            </section>
            <Footer />
        </>
    );
};

export default PrivacyPolicy;