import React, { useEffect } from "react";
import './refundPolicy.css';
import { useDispatch, useSelector } from "react-redux";
import CancelIcon from '@mui/icons-material/Cancel';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GavelIcon from '@mui/icons-material/Gavel';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";


const policyHighlights = [
    {
        id: 1,
        title: "Non-Refundable Payment",
        icon: CancelIcon,
        description: "All payments made for our **Business Listing Services** are non-refundable. This policy is established to ensure consistency, manage service resources effectively, and maintain fairness for all clients.",
        highlight: "No exceptions for change of mind or service non-use."
    },
    {
        id: 2,
        title: "Finality of Payment",
        icon: GavelIcon,
        description: "Once a payment is successfully processed and the business listing service has been activated or initiated, the payment **cannot be reversed, credited, or refunded** under any circumstance.",
        highlight: "Payment is final upon service initiation."
    },
    {
        id: 3,
        title: "Service Confirmation & Acceptance",
        icon: DoneAllIcon,
        description: "By completing the payment, you confirm that you have read, understood, and accept this Refund Policy, along with our full Terms of Service. This confirms your agreement to the non-refundable nature of the service.",
        highlight: "Acceptance is confirmed at payment checkout."
    },
];

const PolicyCard = ({ highlight }) => {
    const IconComponent = highlight.icon;
    return (
        <div className="refund-policy-card">
            <IconComponent className="card-icon-refund" />
            <h3 className="card-title-refund">{highlight.title}</h3>
            <p className="card-description-refund">{highlight.description}</p>
            <p className="card-highlight-refund">{highlight.highlight}</p>
        </div>
    );
};

const RefundPolicy = () => {
    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "refund" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "Refund Policy - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "about massclick, business directory, local search",
        canonical: "https://massclick.in/refund",
        robots: "index, follow",
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch />
            <section className="section-refund-policy">
                <div className="refund-header-wrapper">
                    <h2 className="section-title-refund">Official <span className="highlight-text-refund">Refund Policy</span></h2>
                    <p className="section-subtitle-refund">
                        At MassClick, we value your trust and strive to provide top-quality business listing services. To maintain transparency and a professional operational standard, we have outlined our non-refundable policy below.
                    </p>
                    <p className="contact-policy-note">
                        If you have any questions or require further clarification regarding this policy, please feel free to contact our support team before making a payment.
                    </p>
                </div>

                <div className="policy-highlights-container">
                    {policyHighlights.map((highlight) => (
                        <PolicyCard key={highlight.id} highlight={highlight} />
                    ))}
                </div>

                <div className="full-policy-cta">
                    <p>For complete details on service termination and client responsibilities, please review our <a href="/terms" className="terms-link-refund">Terms and Conditions.</a></p>
                </div>
            </section>
            <Footer />
        </>
    );
};

export default RefundPolicy;