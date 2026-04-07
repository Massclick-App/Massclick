import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import './graphicDesign.css';
import graphic1 from '../../../../assets/graphic.jpg';
import graphic2 from '../../../../assets/graphic1.jpg';
import Footer from '../footer';
import CardsSearch from '../../CardsSearch/CardsSearch';
import height from '../../../../assets/height.jpg'
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";


const GraphicDesign = () => {
  const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "graphic" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "Graphic Design - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "graphic design, business directory, local search",
        canonical: "https://massclick.in/graphic",
        robots: "index, follow",
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch /><br /><br /><br />
            <div className="graphic-design-container">
                {/* 1. Graphic Design Hero/Intro Section */}
                <div className="graphic-design-intro-section">
                    <div className="intro-text-block">
                        <h1>Graphic Design</h1>
                        <p>
                            We understand the importance of visually captivating and effective marketing materials in promoting your brand
                            and making a lasting impression. Our comprehensive range of design services is geared towards creating
                            stunning and impactful marketing collateral that helps your business stand out from the competition.
                        </p>
                    </div>
                    <div className="intro-image-block">
                        <img src={graphic1} alt="Graphic Design on Tablet" className="intro-image" />
                    </div>
                </div>

                {/* 2. Portfolio/Benefits Section */}
                <div className="portfolio-section">
                    <h2>Portfolio</h2>
                    <div className="portfolio-content">
                        <div className="portfolio-image-block">
                            <img src={graphic2} alt="Creative Design Workspace" className="portfolio-image" />
                        </div>
                        <div className="portfolio-benefits">
                            <div className="benefit-item">
                                <h3>Creative Expertise:</h3>
                                <p>Our team of experienced designers possesses a wealth of creative expertise in crafting compelling marketing materials.</p>
                            </div>
                            <div className="benefit-item">
                                <h3>Customization:</h3>
                                <p>We take the time to understand your brand, target audience, and objectives to create custom designs that align with your vision and goals.</p>
                            </div>
                            <div className="benefit-item">
                                <h3>Attention to Detail:</h3>
                                <p>We pay meticulous attention to every detail, from visual elements and typography to color schemes and overall aesthetics.</p>
                            </div>
                            <div className="benefit-item">
                                <h3>Timely Delivery:</h3>
                                <p>Our efficient design process ensures that your marketing materials are ready when you need them, allowing you to execute your marketing campaigns seamlessly.</p>
                            </div>
                            <div className="benefit-item">
                                <h3>Client Satisfaction:</h3>
                                <p>We strive to exceed your expectations and deliver designs that truly reflect your brand identity.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="cta-section">
                    <div className="cta-content"> {/* This will now act as the left half for text */}
                        <h2>Ready to take your online presence to new heights?</h2>
                        <p>Get in touch with us today, and let's discuss how our web design and development services can help you achieve your business objectives. Our team is excited to collaborate with you and create a website that drives growth and success.</p>
                    </div>
                    <div className="cta-image-block"> {/* New div for the image */}
                        <img src={height} alt="Achieve New Heights" className="cta-image" />
                    </div>
                </div>
            </div>
            <br />
            <Footer /></>

    );
}

export default GraphicDesign;