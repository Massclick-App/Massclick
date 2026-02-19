import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createStartProject } from '../../../../redux/actions/startProjectAction';

import {
    Container, Grid, Card, CardContent, Typography, Button, Box,
    Modal, CircularProgress
} from '@mui/material';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";

// Import specific icons
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MapIcon from '@mui/icons-material/Map';
import DevicesIcon from '@mui/icons-material/Devices';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

import './webDevSection.css';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import EnquiryImage from '../../../../assets/enquiry.png';

const featuresData = [
    { title: "Customized Approach", description: "We believe in the power of customization. We take the time to understand your business, target audience, and goals to create a website that reflects your unique brand identity.", icon: AutoFixHighIcon },
    { title: "User-Centric Design", description: "By placing your users at the center of our design process, we ensure that every interaction on your website is seamless and enjoyable, leading to increased engagement and conversions.", icon: MapIcon },
    { title: "Responsive & Mobile-First", description: "Our team excels in crafting websites that adapt seamlessly to different screen sizes, ensuring your site looks and functions flawlessly on all devices.", icon: DevicesIcon },
    { title: "Cutting-Edge Technologies", description: "We stay at the forefront, leveraging the latest technologies and frameworks (HTML5, CSS3, JavaScript, CMS, E-commerce) to deliver outstanding results.", icon: RocketLaunchIcon },
    { title: "SEO-Friendly Architecture", description: "A beautiful website must be discoverable. We design sites with SEO best practices and clean architecture built-in for better search engine results.", icon: TrendingUpIcon },
    { title: "Ongoing Support", description: "Our commitment continues post-launch. We provide comprehensive support and maintenance to ensure your website remains secure, up-to-date, and performs optimally.", icon: SupportAgentIcon },
];

const primaryOrange = '#ff6600';
const darkOrange = '#e65100';

const initialFormState = {
    name: '',
    email: '',
    phone: '',
    message: '',
};

const WebDevSection = () => {
    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "web" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "Web Design - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "Web Design massclick, business directory, local search",
        canonical: "https://massclick.in/services/web",
        robots: "index, follow",
    };

    const { loading } = useSelector(state => state.startProjectReducer);

    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState(initialFormState);
    const [submissionSuccess, setSubmissionSuccess] = useState(false);

    const handleOpen = () => {
        setFormData(initialFormState); // Reset form when opening
        setSubmissionSuccess(false); // Reset success message
        setOpen(true);
    };

    const handleClose = () => setOpen(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // 2. REDUX FORM SUBMISSION LOGIC
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmissionSuccess(false); // Clear previous success before new submission

        // The helper expects fields: name, email, phone, message
        const payload = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone, // contactNumber on backend
            message: formData.message, // message on backend
        };

        try {
            await dispatch(createStartProject(payload));
            setSubmissionSuccess(true);
            setFormData(initialFormState); // Clear form fields

            // Optionally close the modal after a delay
            setTimeout(() => {
                handleClose();
            }, 3000);

        } catch (err) {
            // Error is handled by the Redux reducer and useSelector, 
            // but the catch block prevents uncaught promise rejection.
            console.error("Project submission failed:", err);
        }
    };

    const modalStyle = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: { xs: '90%', sm: 400, md: 500 },
        bgcolor: 'background.paper',
        borderRadius: '12px',
        boxShadow: 24,
        p: 4,
        outline: 'none',
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

            <CardsSearch /><br /><br /><br />

            <Container maxWidth="xl" sx={{ padding: { xs: 0, sm: '20px' } }}>
                <Box
                    sx={{
                        backgroundImage: `linear-gradient(to right, ${darkOrange} 45%, rgba(230, 81, 0, 0.7) 100%), url(${EnquiryImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        minHeight: { xs: 450, md: 500 },
                        display: 'flex',
                        alignItems: 'center',
                        color: 'white',
                        padding: { xs: 4, md: 8 },
                        marginBottom: { xs: 6, md: 10 },
                    }}
                >
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography
                                variant="h1"
                                sx={{
                                    fontFamily: 'Montserrat, sans-serif',
                                    fontSize: { xs: '2.5rem', md: '3.8rem' },
                                    fontWeight: 800,
                                    lineHeight: 1.1,
                                    marginBottom: 2
                                }}
                            >
                                Elevate Your Presence with Web Design & Development
                            </Typography>
                            <Typography
                                variant="body1"
                                sx={{
                                    fontSize: { xs: '1rem', md: '1.15rem' },
                                    lineHeight: 1.7,
                                    marginBottom: 4,
                                    color: 'rgba(255, 255, 255, 0.95)'
                                }}
                            >
                                We are passionate about creating stunning and functional websites that make a lasting impression. A well-designed digital presence is the key to success in today's market. Partner with our creative experts for exceptional, results-driven solutions.
                            </Typography>
                            {/* ATTACHING THE ONCLICK HANDLER HERE */}
                            <Button
                                variant="contained"
                                onClick={handleOpen}
                                sx={{
                                    backgroundColor: 'white',
                                    color: darkOrange,
                                    padding: '16px 40px',
                                    borderRadius: '50px',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    '&:hover': {
                                        backgroundColor: primaryOrange,
                                        color: 'white',
                                        transform: 'translateY(-3px)',
                                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3)',
                                    }
                                }}
                            >
                                Start Your Project Today
                            </Button>
                        </Grid>
                        <Grid item md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
                            {/* Placeholder for the large image */}
                        </Grid>
                    </Grid>
                </Box>
                {/* --- */}
                {/* 2. FEATURES SECTION (omitted for brevity) */}
                <Box sx={{ padding: { xs: 2, md: 5 } }}>
                    <Typography
                        variant="h2"
                        align="center"
                        sx={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: { xs: '1.8rem', md: '2.2rem' },
                            fontWeight: 700,
                            marginBottom: 6,
                            color: '#1f1f1f'
                        }}
                    >
                        Our Core Design Philosophy
                    </Typography>

                    <Grid container spacing={4}>
                        {featuresData.map((feature, index) => {
                            const IconComponent = feature.icon;
                            return (
                                <Grid item xs={12} sm={6} md={4} key={index}>
                                    <Card
                                        elevation={3}
                                        sx={{
                                            height: '100%',
                                            borderRadius: '12px',
                                            borderLeft: `5px solid ${primaryOrange}`,
                                            transition: 'transform 0.3s, box-shadow 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: `0 15px 35px rgba(0, 0, 0, 0.15)`,
                                            },
                                        }}
                                    >
                                        <CardContent>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: { xs: 2, sm: 3 },
                                                    flexDirection: { xs: 'column', sm: 'row' }
                                                }}
                                            >
                                                <Box sx={{
                                                    flexShrink: 0,
                                                    width: { xs: '100%', sm: '50px' },
                                                    textAlign: { xs: 'center', sm: 'left' }
                                                }}>
                                                    <IconComponent sx={{ fontSize: { xs: 35, sm: 40 }, color: darkOrange }} />
                                                </Box>

                                                <Box sx={{ flexGrow: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontFamily: 'Montserrat, sans-serif',
                                                            fontWeight: 700,
                                                            color: '#1f1f1f',
                                                            marginBottom: 1,
                                                            textAlign: { xs: 'center', sm: 'left' }
                                                        }}
                                                    >
                                                        {feature.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{
                                                            lineHeight: 1.7,
                                                            fontSize: '0.9rem',
                                                            textAlign: { xs: 'center', sm: 'left' }
                                                        }}
                                                    >
                                                        {feature.description}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
                {/* --- */}
                {/* 3. CALL TO ACTION SECTION (CTA) */}
                <Box
                    sx={{
                        backgroundImage: `linear-gradient(rgba(230,81,0,0.9), rgba(230,81,0,0.9)), url(${EnquiryImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: 'white',
                        padding: { xs: 6, md: 12 },
                        textAlign: 'center',
                        marginTop: 5,
                        boxShadow: '0 -5px 15px rgba(0, 0, 0, 0.05)',
                    }}
                >
                    <Container maxWidth="md">
                        <Typography
                            variant="h3"
                            sx={{
                                fontFamily: 'Montserrat, sans-serif',
                                fontWeight: 800,
                                lineHeight: 1.2,
                                marginBottom: 2,
                                fontSize: { xs: '2rem', md: '3.2rem' }
                            }}
                        >
                            Ready to take your online presence to new heights?
                        </Typography>
                        <Typography
                            variant="body1"
                            sx={{
                                fontSize: { xs: '1rem', md: '1.15rem' },
                                marginBottom: 5,
                                color: 'rgba(255, 255, 255, 0.9)'
                            }}
                        >
                            Elevate your digital presence and drive business growth. Contact us today to discuss how our digital solutions can help you achieve your goals. Let's start the digital journey together!
                        </Typography>
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
                    </Container>
                </Box>
            </Container>

            <Footer />

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

                        {/* 4. Project Message Textarea */}
                        <textarea
                            required
                            className="custom-form-textarea" // Custom class for styling
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
};

export default WebDevSection;