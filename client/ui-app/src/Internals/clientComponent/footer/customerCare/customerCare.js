import React, { useEffect } from "react";
import './customerCare.css';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ForumIcon from '@mui/icons-material/Forum';
import CallIcon from '@mui/icons-material/Call';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";


const carePillars = [
    {
        id: 1,
        title: "Knowledge Base & FAQs",
        description: "Find instant answers to common questions about accounts, billing, and services. Search our extensive library for quick self-help.",
        icon: LiveHelpIcon,
        buttonText: "Search Articles",
        link: "/faqs"
    },

    {
        id: 2,
        title: "Speak to a Specialist",
        description: "For technical issues or personalized consultation, connect directly with our expert team via live chat or a scheduled call.",
        icon: SupportAgentIcon,
        buttonText: "Start Live Chat",
        link: "/contact"
    },

    {
        id: 3,
        title: "Community & Social Hub",
        description: "Join our official channels to share ideas, report minor bugs, and stay updated on the latest service features and announcements.",
        icon: ForumIcon,
        buttonText: "Connect Now",
        link: "/community"
    },
];

const contactLeads = [
    {
        id: 1,
        role: "CEO Support",
        phone: "+91 97891 04201",
        icon: BusinessCenterIcon,
        note: "Priority executive assistance"
    },
    {
        id: 2,
        role: "HR Contact",
        phone: "+91 93454 98086",
        icon: CallIcon,
        note: "People operations and partnership support"
    },
];

const CareCard = ({ pillar }) => {
    const IconComponent = pillar.icon;
    return (
        <div className="care-card">
            <div className="icon-wrapper">
                <IconComponent className="care-icon" />
            </div>
            <h3 className="card-title">{pillar.title}</h3>
            <p className="card-description">{pillar.description}</p>
            <a href={pillar.link} className="card-button">
                {pillar.buttonText}
            </a>
        </div>
    );
};

const CustomerCareComponent = () => {

    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "customerCare" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "Customer Care - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "about massclick, business directory, local search",
        canonical: "https://massclick.in/customerCare",
        robots: "index, follow",
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch /><br /><br /><br />
            <section className="section-customer-care">
                <div className="care-header-wrapper">
                    <h2 className="section-title-care">Dedicated Customer Care</h2>
                    <p className="section-subtitle-care">
                    </p>
                </div>

                <div className="care-top-banner">
                    <div className="banner-copy">
                        <span className="care-badge">Global Service | Executive Access</span>
                        <h3 className="banner-title">Your customer care team is ready to help, anytime.</h3>
                        <p className="banner-copy-text">
                            Speak directly with our leadership and support specialists for business strategy, HR queries, and premium assistance.
                        </p>
                    </div>

                    <div className="banner-contact-cards">
                        {contactLeads.map((lead) => {
                            const IconComponent = lead.icon;
                            return (
                                <div key={lead.id} className="contact-card">
                                    <div className="contact-icon">
                                        <IconComponent />
                                    </div>
                                    <p className="contact-role">{lead.role}</p>
                                    <a href={`tel:${lead.phone.replace(/[^0-9+]/g, '')}`} className="contact-phone">
                                        {lead.phone}
                                    </a>
                                    <p className="contact-note">{lead.note}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="care-grid-container">
                    {carePillars.map((pillar) => (
                        <CareCard key={pillar.id} pillar={pillar} />
                    ))}
                </div>
            </section>
            <Footer />
        </>
    );
};

export default CustomerCareComponent;