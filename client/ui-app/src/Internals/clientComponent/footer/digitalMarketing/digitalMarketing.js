import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createStartProject } from '../../../../redux/actions/startProjectAction';
import './digitalMarketing.css';
import Footer from '../footer';
import CardsSearch from '../../CardsSearch/CardsSearch';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";

// NOTE: ICONS from react-icons/fa ARE NOT USED IN THIS VERSION, 
// since the service icons are handled by <i> tags with CSS classes.
// import { FaSearchengin, FaGlobe, FaHandsHelping, FaBullhorn, FaMailBulk, FaGoogle } from 'react-icons/fa'; // REMOVED IMPORT

// Import the local image for the CTA section
import EnquiryImage from '../../../../assets/enquiry.png';
import digitmarketing from '../../../../assets/digitalmarketing.jpg'
import {
    Typography, Button, Box,
    Modal,CircularProgress
} from '@mui/material';

const primaryOrange = '#ff6600';
const darkOrange = '#e65100';

const initialFormState = {
    name: '',
    email: '',
    phone: '',
    message: '',
};

const DigitalMarketing = () => {

    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "digital" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "Digital Marketing - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "digital marketing, business directory, local search",
        canonical: "https://massclick.in/digital",
        robots: "index, follow",
    };

    const { loading } = useSelector(state => state.startProjectReducer);

    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const handleOpen = () => {
        setFormData(initialFormState);
        setSubmissionSuccess(false);
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmissionSuccess(false);

        const payload = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            message: formData.message,
        };

        try {
            await dispatch(createStartProject(payload));
            setSubmissionSuccess(true);
            setFormData(initialFormState);

            setTimeout(() => {
                handleClose();
            }, 3000);
        } catch (err) {

            console.error("Project submission failed:", err);
        }
    };

    // Updated modal style to ensure max-width and proper placement
    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        // Change 'width' to 'maxWidth' to control size without forcing overflow
        maxWidth: { xs: '90%', sm: 400, md: 500 }, // Use maxWidth for proper constraint
        width: '100%', // Use width: 100% so it respects maxWidth
        bgcolor: 'background.paper',
        borderRadius: '12px',
        boxShadow: 24,
        p: 4,
        outline: 'none',
        maxHeight: '90vh',
        overflowY: 'auto',
    };

    return (
        <>

            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

            <CardsSearch /><br /><br /><br /><br />
            <div className="digital-marketing-page">
                {/* Section 1: Digital Marketing Intro */}
                <section className="dm-intro-section">
                    <div className="dm-intro-content">
                        <h1 className="dm-title">Digital Marketing</h1>
                        <p className="dm-text">
                            We are passionate about helping businesses thrive in the digital landscape. We understand that in today's fast-paced world, effective digital marketing strategies are essential for reaching and engaging your target audience. Our dedicated team of digital marketing experts is committed to **driving measurable results** and maximizing your online presence.
                        </p>
                        <p className="dm-text">
                            Our comprehensive range of digital marketing services covers all aspects of your online marketing needs, from strategy development to implementation and optimization. We tailor our solutions to your specific business goals, ensuring that every campaign is designed to deliver **tangible results.**
                        </p>
                    </div>
                    <div className="dm-visual-container">
                        <img
                            src={digitmarketing}
                            alt="Digital Marketing Concepts"
                            className="dm-main-graphic-image"
                        />
                    </div>
                </section>

                {/* Section 2: Services We Offer */}
                <section className="digital-services-section"> {/* Updated to digital-services-section */}
                    <h2 className="digital-services-title">Digital Services We Offer 📈</h2> {/* Updated to digital-services-title */}
                    <div className="digital-services-grid"> {/* Updated to digital-services-grid */}
                        <div className="digital-service-card"> {/* Updated to digital-service-card */}
                            <i className="digital-service-icon digital-icon-seo"></i> {/* Updated icon class name */}
                            <h3 className="digital-service-heading">Search Engine Optimization (SEO)</h3> {/* Updated to digital-service-heading */}
                            <p className="digital-service-description"> {/* Updated to digital-service-description */}
                                Increase your website's visibility on search engines and drive organic traffic with our expert SEO services.
                            </p>
                        </div>
                        <div className="digital-service-card">
                            <i className="digital-service-icon digital-icon-ppc"></i> {/* Updated icon class name */}
                            <h3 className="digital-service-heading">Pay-Per-Click (PPC) Advertising</h3>
                            <p className="digital-service-description">
                                We create and manage high-ROI PPC campaigns across Google Ads, Bing Ads, and various social platforms.
                            </p>
                        </div>
                        <div className="digital-service-card">
                            <i className="digital-service-icon digital-icon-social"></i> {/* Updated icon class name */}
                            <h3 className="digital-service-heading">Social Media Marketing</h3>
                            <p className="digital-service-description">
                                Engage your target audience, build strong brand awareness, and drive conversions through strategic social media marketing.
                            </p>
                        </div>
                        <div className="digital-service-card">
                            <i className="digital-service-icon digital-icon-sem"></i> {/* Updated icon class name */}
                            <h3 className="digital-service-heading">Search Engine Marketing (SEM)</h3>
                            <p className="digital-service-description">
                                SEM combines paid and organic strategies to ensure your business dominates search results and generates qualified leads.
                            </p>
                        </div>
                        <div className="digital-service-card">
                            <i className="digital-service-icon digital-icon-gmb"></i> {/* Updated icon class name */}
                            <h3 className="digital-service-heading">Google My Business</h3>
                            <p className="digital-service-description">
                                We claim, optimize, and manage your GMB listing to ensure accurate, up-to-date business information and improved local ranking.
                            </p>
                        </div>
                        <div className="digital-service-card">
                            <i className="digital-service-icon digital-icon-email"></i> {/* Updated icon class name */}
                            <h3 className="digital-service-heading">Email Marketing</h3>
                            <p className="digital-service-description">
                                Campaign design and execution to deliver personalized messages that nurture leads, retain customers, and drive sales.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 3: Call to Action */}
                <section className="digital-cta-section"> {/* Updated to digital-cta-section */}
                    <div className="digital-cta-left-visual"> {/* Updated to digital-cta-left-visual */}
                        <img
                            src={EnquiryImage}
                            alt="Website design and development screens"
                            className="digital-cta-local-image"
                        />
                    </div>
                    <div className="digital-cta-right-content"> {/* Updated to digital-cta-right-content */}
                        <h2 className="digital-cta-title">Ready to take your online presence to new heights? 🚀</h2> {/* Updated to digital-cta-title */}
                        <p className="digital-cta-text"> {/* Updated to digital-cta-text */}
                            Get in touch with us today, and let's discuss how our web design and development services can help you achieve your business objectives. Our team is excited to collaborate with you and create a website that **drives growth and success.**
                        </p>
                        <Button
                            variant="outlined"
                            onClick={handleOpen} // Also attach the modal opener to the CTA button
                            sx={{
                                color: 'white',
                                borderColor: 'white',
                                padding: '18px 50px',
                                borderRadius: '50px',
                                fontWeight: 700,
                                fontSize: '1.1rem',
                                borderWidth: '3px',
                                '&:hover': {
                                    backgroundColor: 'white',
                                    color: darkOrange,
                                    borderColor: 'white',
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4)',
                                    borderWidth: '3px',
                                }
                            }}
                        >
                            Get a Free Consultation
                        </Button>
                    </div>
                </section>
            </div><br />
            <Footer />

            {/* Modal remains unchanged as it uses Material UI classes */}
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="quick-project-enquiry-title"
                aria-describedby="quick-project-enquiry-description"
            >
                <Box sx={modalStyle}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        {/* ... (Modal Header) ... */}
                    </Box>

                    <Typography id="quick-project-enquiry-description" sx={{ mt: 1, mb: 3, color: 'text.secondary' }}>
                        Tell us a little about your project, and we'll get back to you within 24 hours.
                    </Typography>

                    {/* ... (Alerts for submission success/error) ... */}

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                        {/* 1. Your Name Input */}
                        <input
                            required
                            className="custom-form-input" // Custom class for styling
                            placeholder="Your Name *"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            type="text"
                        />

                        {/* 2. Email Address Input */}
                        <input
                            required
                            className="custom-form-input" // Custom class for styling
                            placeholder="Email Address *"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            type="email"
                        />

                        {/* 3. Phone Number Input */}
                        <input
                            className="custom-form-input" // Custom class for styling
                            placeholder="Phone Number (Optional)"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            type="tel"
                        />

                        <textarea
                            required
                            className="custom-form-textarea"
                            placeholder="Tell Us About Your Project *"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            rows={4}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            sx={{
                                mt: 2,
                                backgroundColor: darkOrange,
                                '&:hover': {
                                    backgroundColor: primaryOrange,
                                },
                                padding: '10px 0',
                                fontWeight: 600,
                            }}
                        >
                            {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Submit Enquiry'}
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </>
    );
}

export default DigitalMarketing;