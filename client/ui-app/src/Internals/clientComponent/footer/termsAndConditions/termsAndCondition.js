import React, { useState, useEffect } from 'react';
import './termsAndCondition.css';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";

// ----------------------------------------------------
// Dummy Content for 8 T&C Sections
// ----------------------------------------------------
const termsData = [
    {
        id: 1,
        title: "1. Acceptance of Terms",
        content: (
            <>
                <p>a. These Terms constitute a legally binding agreement between you and massclick.in. By accessing or using the Website, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>
                <p>b. massclick.in reserves the right to modify or update these Terms at any time without prior notice. It is your responsibility to review these Terms periodically for any changes. Continued use of the Website after the modifications indicates your acceptance of the revised Terms.</p>
            </>
        ),
    },
    {
        id: 2,
        title: "2. Eligibility",
        content: (
            <>
                <p>a. By using our Website, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms. If you are accessing or using the Website on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms.</p>
                <p>b. massclick.in may refuse service, terminate accounts, or restrict access to certain features if we believe, in our sole discretion, that users have violated these Terms or any applicable laws.</p>
            </>
        ),
    },
    {
        id: 3,
        title: "3. User Accounts",
        content: (
            <>
                <p>a. In order to access certain features of our Website, you may be required to create a user account. You agree to provide accurate, current, and complete information during the registration process. You are solely responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
                <p>b. You agree to notify massclick.in immediately of any unauthorized use of your account or any other breach of security. We will not be liable for any loss or damage arising from your failure to comply with this security obligation.</p>
            </>
        ),
    },
    {
        id: 4,
        title: "4. User Responsibilities",
        content: (
            <>
                <p>a. You agree to use the Website in accordance with these Terms and all applicable laws and regulations. You are solely responsible for any content you submit or display on the Website and for any consequences that may arise from such content.</p>
                <p>b. You must not use the Website for any unlawful, offensive, abusive, or fraudulent purposes. You must not engage in any activity that interferes with or disrupts the functioning of the Website or the servers and networks connected to it.</p>
                <p>c. massclick.in reserves the right to remove or modify any content that violates these Terms or that we believe is inappropriate, without prior notice or liability.</p>
            </>
        ),
    },
    {
        id: 5,
        title: "5. Intellectual Property Rights",
        content: (
            <>
                <p>a. massclick.in and its contents, including but not limited to text, graphics, logos, images, and software, are protected by intellectual property laws and are the property of massclick.in or its licensors. You may not modify, reproduce, distribute, or create derivative works of any content from the Website without our prior written consent.</p>
                <p>b. By submitting content to the Website, you grant massclick.in a worldwide, non-exclusive, royalty-free, sublicensable, and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform such content in connection with the Website’s services.</p>
            </>
        ),
    },
    {
        id: 6,
        title: "6. Disclaimer of Warranties",
        content: (
            <>
                <p>a. The Website is provided on an 'as is' and 'as available' basis, without any warranties of any kind, whether express or implied. massclick.in does not guarantee that the Website will be uninterrupted, error-free, or secure, or that any defects will be corrected. Your use of the Website is at your own risk.</p>
                <p>b. massclick.in does not endorse, guarantee, or assume responsibility for any content posted by users or third parties. We are not responsible for the accuracy, completeness, or reliability of any information or content provided on the Website.</p>
            </>
        ),
    },
    {
        id: 7,
        title: "7. Limitation of Liability",
        content: (
            <>
                <p>a. To the maximum extent permitted by law, massclick.in and its affiliates, officers, directors, employees, and agents shall not be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in any way connected with your use of the Website, including but not limited to damages for loss of profits, goodwill, use, data, or other intangible losses, even if massclick.in has been advised of the possibility of such damages.</p>
                <p>b. You agree to indemnify and hold massclick.in and its affiliates, officers, directors, employees, and agents harmless from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of your breach of these Terms or your violation of any law or the rights of a third party.</p>
            </>
        ),
    },
    {
        id: 8,
        title: "8. Termination",
        content: (
            <>
                <p>a. massclick.in may, in its sole discretion, terminate or suspend your access to all or part of the Website for any reason, including, without limitation, breach of these Terms. Upon termination, your right to use the Website will immediately cease, and you may lose any information associated with your account.</p>
                <p>b. The provisions of these Terms that by their nature should survive termination shall survive, including, but not limited to, intellectual property rights, disclaimer of warranties, limitations of liability, and indemnification obligations.</p>
            </>
        ),
    },
    {
        id: 9,
        title: "9. Governing Law and Dispute Resolution",
        content: (
            <p>a. These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or relating to these Terms or the use of the Website shall be resolved exclusively by the courts located in Trichy.</p>
        ),
    },
    {
        id: 10,
        title: "10. Severability",
        content: (
            <p>a. If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. The invalid or unenforceable provision shall be replaced by a valid and enforceable provision that comes closest to the intention of the original provision.</p>
        ),
    },
    {
        id: 11,
        title: "11. Entire Agreement",
        content: (
            <>
                <p>a. These Terms constitute the entire agreement between you and massclick.in regarding the use of the Website and supersede any prior agreements or understandings, whether written or oral.</p>
                <p>b. By using massclick.in, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</p>
            </>
        ),
    },
];

const AccordionItem = ({ item, isOpen, onClick }) => {
    return (
        <div className={`accordion-item ${isOpen ? 'open' : ''}`}>
            <button className="accordion-header" onClick={() => onClick(item.id)}>
                <h3 className="accordion-title">{item.title}</h3>
                <div className="accordion-icon">
                    {isOpen ? <RemoveIcon /> : <AddIcon />}
                </div>
            </button>
            <div className="accordion-content">
                <p>{item.content}</p>
            </div>
        </div>
    );
};

const TermsAndConditions = () => {

    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "terms" }));
    }, [dispatch]);


    const fallbackSeo = {
        title: "Terms and Conditions - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "about massclick, business directory, local search",
        canonical: "https://massclick.in/terms",
        robots: "index, follow",
    };

    const [openItemId, setOpenItemId] = useState(termsData[0].id);

    const handleToggle = (id) => {
        setOpenItemId(openItemId === id ? null : id);
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch /><br /><br /><br />
            <section className="section-terms">
                <div className="terms-header-wrapper">
                    <h2 className="section-title-terms">Our Standard <span className="highlight-text-terms">Terms & Conditions</span></h2>
                    <p className="section-subtitle-terms">
                        Welcome to massclick.in. These Terms and Conditions ("Terms") govern your use of the Website and its associated services. By accessing or using our Website, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please refrain from using our Website.
                    </p>
                </div>

                <div className="accordion-container">
                    {termsData.map((item) => (
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

export default TermsAndConditions;