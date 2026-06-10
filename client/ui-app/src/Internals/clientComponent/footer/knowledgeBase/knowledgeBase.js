import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import styles from "./knowledgeBase.module.css";
import Footer from '../footer';
import CardsSearch from '../../CardsSearch/CardsSearch';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";
import SearchIcon from '@mui/icons-material/Search';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const cx = createScopedClassNames(styles);

const KnowledgeBasePage = () => {
    const dispatch = useDispatch();
    const { meta: seoMetaData } = useSelector(state => state.seoReducer);

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "knowledgeBase" }));
        window.scrollTo(0, 0);
    }, [dispatch]);

    const fallbackSeo = {
        title: "Knowledge Base - MassClick",
        description: "Explore the MassClick Knowledge Base for guides, FAQs, and platform insights to help you grow your business.",
        keywords: "massclick help, knowledge base, business guides, faq, support",
        canonical: "https://massclick.in/knowledgebase",
        robots: "index, follow"
    };

    const platformFeatures = [
        {
            title: "Smart Search Engine",
            description: "MassClick uses a MongoDB-powered text search with keyword inheritance. When a business joins a category, it automatically inherits relevant keywords, making it instantly discoverable.",
            icon: SearchIcon
        },
        {
            title: "Business Visibility",
            description: "List your business to reach a global audience. Our platform supports localized searches, allowing users to find trusted services in their specific city or district.",
            icon: BusinessIcon
        },
        // {
        //     title: "Secure Authentication",
        //     description: "We prioritize security with OTP-based login via MSG91 and JWT (JSON Web Tokens) for session management, ensuring your data and business profile are always protected.",
        //     icon: SecurityIcon
        // },
        {
            title: "Real-time Updates",
            description: "Stay informed with real-time service updates and maintenance notifications delivered through our integrated WebSocket architecture.",
            icon: TrendingUpIcon
        }
    ];

    const faqs = [
        {
            question: "How do I list my business on MassClick?",
            answer: "To list your business, navigate to the 'Free Listing' page. Fill in your business details, select the appropriate category, and our system will automatically optimize your listing with relevant keywords for better search visibility."
        },
        {
            question: "How does the search ranking work?",
            answer: "Our search engine ranks businesses based on keyword relevance and location. It tokenizes search terms and matches them against business names, descriptions, and inherited category keywords to provide the most relevant results."
        },
        {
            question: "Is my personal information secure?",
            answer: "Yes, we use industry-standard security measures including JWT for authentication and MSG91 for secure OTP verification. Your sensitive data is encrypted and stored securely in our MongoDB database."
        },
        {
            question: "What should I do if I forget my login?",
            answer: "Since MassClick uses OTP-based login, you don't need to remember a password. Simply enter your registered mobile number, and you'll receive a secure OTP to access your account."
        },
        {
            question: "How can I contact support for technical issues?",
            answer: "You can visit our 'Customer Care' page to start a live chat with our specialists, join our WhatsApp community, or reach out to our executive support team for priority assistance."
        }
    ];

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch />
            
            <div className={cx("kb-container")}>
                <section className={cx("kb-hero")}>
                    <h1 className={cx("kb-title")}>Knowledge Base</h1>
                    <p className={cx("kb-subtitle")}>
                        Everything you need to know about using MassClick. Discover how our platform works, 
                        how to optimize your business listing, and get answers to common questions.
                    </p>
                </section>

                <section className={cx("kb-section")}>
                    <h2 className={cx("section-heading")}>Platform Insights</h2>
                    <div className={cx("kb-grid")}>
                        {platformFeatures.map((feature, index) => {
                            const Icon = feature.icon;
                            return (
                                <div key={index} className={cx("kb-card")}>
                                    <div className={cx("card-icon-wrapper")}>
                                        <Icon className={cx("card-icon")} />
                                    </div>
                                    <h3 className={cx("card-title")}>{feature.title}</h3>
                                    <p className={cx("card-content")}>{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className={cx("kb-section")} style={{ backgroundColor: '#f8f9fa' }}>
                    <h2 className={cx("section-heading")}>Frequently Asked Questions</h2>
                    <div className={cx("faq-list")}>
                        {faqs.map((faq, index) => (
                            <div key={index} className={cx("faq-item")}>
                                <h3 className={cx("faq-question")}>
                                    <HelpOutlineIcon style={{ color: '#ff6600', marginRight: '10px', marginTop: '2px' }} />
                                    {faq.question}
                                </h3>
                                <p className={cx("faq-answer")}>{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={cx("kb-section")}>
                    <div className={cx("kb-card")} style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto', border: 'none', background: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)', color: 'white' }}>
                        <ContactSupportIcon style={{ fontSize: '4rem', marginBottom: '20px' }} />
                        <h2 className={cx("card-title")} style={{ color: 'white' }}>Still need help?</h2>
                        <p className={cx("card-content")} style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }}>
                            Our dedicated customer care team is available to assist you with any specific queries or technical issues.
                        </p>
                        <a 
                            href="/customercare" 
                            className={cx("kb-button")} 
                            style={{ 
                                display: 'inline-block', 
                                marginTop: '20px', 
                                padding: '12px 30px', 
                                backgroundColor: 'white', 
                                color: '#ff6600', 
                                borderRadius: '30px', 
                                fontWeight: 'bold', 
                                textDecoration: 'none' 
                            }}
                        >
                            Go to Customer Care
                        </a>
                    </div>
                </section>
            </div>

            <Footer />
        </>
    );
};

export default KnowledgeBasePage;
