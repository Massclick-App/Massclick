import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet-async";
import styles from "./graphicDesign.module.css";
import graphic1 from '../../../../assets/graphic.webp';
import graphic2 from '../../../../assets/graphic1.webp';
import Footer from '../footer';
import StickySearchBar from '../../../clientComponent/StickySearchBar/StickySearchBar';
import height from '../../../../assets/height.webp';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { generateServiceSchema, generateBreadcrumbSchema } from "../../../../utils/seoSchemaGenerators";
const cx = createScopedClassNames(styles);
const GraphicDesign = () => {
  const dispatch = useDispatch();
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer);
  useEffect(() => {
    dispatch(fetchSeoMeta({
      pageType: "graphic"
    }));
  }, [dispatch]);
  const fallbackSeo = {
    title: "Graphic Design - Massclick",
    description: "Massclick is a leading local search platform helping users discover trusted businesses and services.",
    keywords: "graphic design, business directory, local search",
    canonical: "https://massclick.in/graphic",
    robots: "index, follow"
  };
  const serviceSchema = generateServiceSchema({
    name: "Graphic Design",
    title: "Professional Graphic Design Services",
    description: "Create stunning visual designs for your brand including logos, marketing materials, branding, and creative collateral.",
    location: "India",
    category: "Graphic Design"
  });
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://massclick.in"
  }, {
    name: "Graphic Design",
    url: "https://massclick.in/graphic"
  }]);
  return <>
            <Helmet>
                {serviceSchema && <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>}
                {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
            </Helmet>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <StickySearchBar /><br /><br /><br />
            <div className={cx("graphic-design-container")}>
                {/* 1. Graphic Design Hero/Intro Section */}
                <div className={cx("graphic-design-intro-section")}>
                    <div className={cx("intro-text-block")}>
                        <h1>Graphic Design</h1>
                        <p>
                            We understand the importance of visually captivating and effective marketing materials in promoting your brand
                            and making a lasting impression. Our comprehensive range of design services is geared towards creating
                            stunning and impactful marketing collateral that helps your business stand out from the competition.
                        </p>
                    </div>
                    <div className={cx("intro-image-block")}>
                        <img src={graphic1} alt="Graphic Design on Tablet" className={cx("intro-image")} />
                    </div>
                </div>

                {/* 2. Portfolio/Benefits Section */}
                <div className={cx("portfolio-section")}>
                    <h2>Portfolio</h2>
                    <div className={cx("portfolio-content")}>
                        <div className={cx("portfolio-image-block")}>
                            <img src={graphic2} alt="Creative Design Workspace" className={cx("portfolio-image")} />
                        </div>
                        <div className={cx("portfolio-benefits")}>
                            <div className={cx("benefit-item")}>
                                <h3>Creative Expertise:</h3>
                                <p>Our team of experienced designers possesses a wealth of creative expertise in crafting compelling marketing materials.</p>
                            </div>
                            <div className={cx("benefit-item")}>
                                <h3>Customization:</h3>
                                <p>We take the time to understand your brand, target audience, and objectives to create custom designs that align with your vision and goals.</p>
                            </div>
                            <div className={cx("benefit-item")}>
                                <h3>Attention to Detail:</h3>
                                <p>We pay meticulous attention to every detail, from visual elements and typography to color schemes and overall aesthetics.</p>
                            </div>
                            <div className={cx("benefit-item")}>
                                <h3>Timely Delivery:</h3>
                                <p>Our efficient design process ensures that your marketing materials are ready when you need them, allowing you to execute your marketing campaigns seamlessly.</p>
                            </div>
                            <div className={cx("benefit-item")}>
                                <h3>Client Satisfaction:</h3>
                                <p>We strive to exceed your expectations and deliver designs that truly reflect your brand identity.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cx("cta-section")}>
                    <div className={cx("cta-content")}> {/* This will now act as the left half for text */}
                        <h2>Ready to take your online presence to new heights?</h2>
                        <p>Get in touch with us today, and let's discuss how our web design and development services can help you achieve your business objectives. Our team is excited to collaborate with you and create a website that drives growth and success.</p>
                    </div>
                    <div className={cx("cta-image-block")}> {/* New div for the image */}
                        <img src={height} alt="Achieve New Heights" className={cx("cta-image")} />
                    </div>
                </div>
            </div>
            <br />
            <Footer /></>;
};
export default GraphicDesign;
