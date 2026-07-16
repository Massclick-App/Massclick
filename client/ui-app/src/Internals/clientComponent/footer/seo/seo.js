import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import styles from "./seo.module.css";
import SeoImage from '../../../../assets/seo1.webp';
import searchGraphic from '../../../../assets/seo.webp';
import Footer from '../footer';
import StickySearchBar from '../../StickySearchBar/StickySearchBar';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";
import { generateServiceSchema, generateBreadcrumbSchema } from "../../../../utils/seoSchemaGenerators";
const cx = createScopedClassNames(styles);
const Seo = () => {
  const dispatch = useDispatch();
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer);
  useEffect(() => {
    dispatch(fetchSeoMeta({
      pageType: "seo"
    }));
  }, [dispatch]);
  const fallbackSeo = {
    title: "Search Engine Optimization - Massclick",
    description: "Massclick is a leading local search platform helping users discover trusted businesses and services.",
    keywords: "about massclick, business directory, local search",
    canonical: "https://massclick.in/seo",
    robots: "index, follow"
  };
  const serviceSchema = generateServiceSchema({
    name: "Search Engine Optimization",
    title: "SEO Services for Local Businesses",
    description: "Improve your online visibility with professional SEO services including keyword optimization, technical SEO, link building, and content strategy.",
    location: "India",
    category: "Search Engine Optimization"
  });
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://massclick.in"
  }, {
    name: "SEO",
    url: "https://massclick.in/seo"
  }]);
  return <>
            <Helmet>
                {serviceSchema && <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>}
                {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
            </Helmet>

            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

            <StickySearchBar /><br /><br /><br />
            <div className={cx("seo-container")}>

                {/* 1. Hero Section */}
                <header className={cx("seo-hero-section")} style={{
        backgroundImage: `url(${SeoImage})`
      }}>
                    <div className={cx("hero-overlay")}>
                        <h1 className={cx("hero-title")}>Search Engine Optimization</h1>
                        <p className={cx("hero-breadcrumb")}>Home / SEO</p>
                    </div>
                </header>

                {/* 2. Intro/Content Section */}
                <section className={cx("seo-intro-section")}>
                    <div className={cx("intro-image-area")}>
                        <img src={searchGraphic} alt="Search Engine Optimization Visual" className={cx("search-graphic")} />
                    </div>
                    <div className={cx("intro-text-content")}>
                        <h2 className={cx("section-heading")}>Search Engine Optimization</h2>
                        <p>
                            As one of Tamil Nadu's top providers of digital marketing in Karaikudi, we provide the most trustworthy SEO
                            Services to our customers. To raise the position of your website in search engine results pages (SERPs) and
                            increase your online presence, our team of SEO experts have contributed their skills and knowledge. The most
                            effective SEO services we offer are economical, natural, and result-oriented.
                        </p>
                        <p>
                            Our team of specialists matches you with the ideal SEO approach after carefully examining your objectives and
                            target markets. This increases website traffic and sales for your business. For the benefit of our clients, we
                            employ the most effective SEO strategy. We can deliver reliable campaign results thanks to this platform.
                        </p>
                    </div>
                </section>

                {/* 3. Services/Cards Section - UPDATED CLASS NAMES */}
                <section className={cx("seo-services-section")}>
                    <h2 className={cx("seo-section-heading")}>Our Expertise</h2>
                    <div className={cx("seo-services-grid")}>

                        {/* Card 1: Regional/Local */}
                        <div className={cx("seo-service-card")}>
                            <i className={cx("fas fa-map-marker-alt seo-card-icon")}></i> {/* Font Awesome Icon */}
                            <h3 className={cx("seo-service-heading")}>For regional/local businesses</h3>
                            <ul className={cx("seo-service-list")}>
                                <li>SEO services to optimize local presence.</li>
                                <li>Allows your website to be found locally in your area.</li>
                                <li>Results in improvement in locally targeted website traffic providing significant new business.</li>
                                <li>Ideal for businesses with a physical location.</li>
                            </ul>
                        </div>

                        {/* Card 2: National & International */}
                        <div className={cx("seo-service-card primary-card")}>
                            <i className={cx("fas fa-globe seo-card-icon")}></i> {/* Font Awesome Icon */}
                            <h3 className={cx("seo-service-heading")}>National & International SEO</h3>
                            <ul className={cx("seo-service-list")}>
                                <li>Sell products or services to a larger audience.</li>
                                <li>Reach customers outside your city, state or country.</li>
                                <li>Custom SEO campaign to reach national or international customers.</li>
                                <li>Dominate search engine results through our SEO strategies.</li>
                                <li>Earn more leads and conversions.</li>
                            </ul>
                        </div>

                        {/* Card 3: Ecommerce SEO */}
                        <div className={cx("seo-service-card")}>
                            <i className={cx("fas fa-shopping-cart seo-card-icon")}></i> {/* Font Awesome Icon */}
                            <h3 className={cx("seo-service-heading")}>Ecommerce SEO</h3>
                            <ul className={cx("seo-service-list")}>
                                <li>Get new buyers for your online shop.</li>
                                <li>Expert SEO services to boost your ecommerce website.</li>
                                <li>Works for ecommerce website in any category or niche.</li>
                                <li>Results in targeted customers looking to buy your products.</li>
                                <li>Ideal for businesses selling products online.</li>
                                <li>Earn more leads and conversions.</li>
                            </ul>
                        </div>

                    </div>
                </section>
            </div>
            <br />
            <Footer />
        </>;
};
export default Seo;
