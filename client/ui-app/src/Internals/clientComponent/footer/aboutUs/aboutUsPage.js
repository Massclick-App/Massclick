import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import styles from "./aboutUspage.module.css";
import { useDispatch, useSelector } from "react-redux";
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import GavelIcon from '@mui/icons-material/Gavel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckIcon from '@mui/icons-material/Check';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import Footer from '../footer';
import AboutUs from '../../../../assets/aboutus.jpg';
import CardsSearch from '../../CardsSearch/CardsSearch';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { generateAboutPageSchema, generateBreadcrumbSchema } from "../../../../utils/seoSchemaGenerators";
const cx = createScopedClassNames(styles);
const Card = ({
  Icon,
  title,
  description
}) => <div className={cx("card-item")}>
        <div className={cx("about-card-icon-wrapper")}>
            <Icon className={cx("about-card-icon")} />
        </div>
        <h4 className={cx("card-title")}>{title}</h4>
        <p className={cx("card-description")}>{description}</p>
    </div>;
const FeatureList = ({
  features
}) => <div className={cx("feature-grid")}>
        {features.map((feature, index) => <div key={index} className={cx("feature-item")}>
                <CheckIcon className={cx("feature-check-icon")} />
                <span className={cx("feature-text")}>{feature}</span>
            </div>)}
    </div>;
const AboutUsPage = () => {
  const dispatch = useDispatch();
  const {
    meta: seoMetaData
  } = useSelector(state => state.seoReducer);
  useEffect(() => {
    dispatch(fetchSeoMeta({
      pageType: "about"
    }));
  }, [dispatch]);
  const fallbackSeo = {
    title: "About Us - Massclick",
    description: "Massclick is a leading local search platform helping users discover trusted businesses and services.",
    keywords: "about massclick, business directory, local search",
    canonical: "https://massclick.in/about",
    robots: "index, follow"
  };
  const chooseCards = [{
    Icon: AccountCircleIcon,
    title: "Client-First Support",
    description: "Dedicated, responsive personalized assistance from experts committed to ensuring your ultimate success globally."
  }, {
    Icon: GavelIcon,
    title: "Unwavering Integrity",
    description: "Total business clarity with zero hidden costs, fostering a secure, long-term relationship built on trust and reliability."
  }, {
    Icon: TrendingUpIcon,
    title: "Industry Expertise",
    description: "Leverage our team of highly-skilled professionals to achieve outstanding, data-driven results and market leadership."
  }];
  const platformFeatures = ["Domain Expertise", "Commitment to Quality", "Global Customer Satisfaction", "Continuous Improvement", "Scalable Business Solutions", "Dedicated Business Support"];
  const statsData = [{
    Icon: AccessTimeIcon,
    number: "7+",
    label: "Years Experience"
  }, {
    Icon: PeopleIcon,
    number: "5000+",
    label: "Clients Globally"
  }, {
    Icon: BusinessCenterIcon,
    number: "15+",
    label: "Talented Employees"
  }];
  const aboutPageSchema = generateAboutPageSchema({
    title: "About Massclick",
    description: "Learn about Massclick - your trusted platform for discovering local businesses with verified reviews and ratings."
  });
  const breadcrumbSchema = generateBreadcrumbSchema([{
    name: "Home",
    url: "https://massclick.in"
  }, {
    name: "About Us",
    url: "https://massclick.in/aboutus"
  }]);
  return <>
            <Helmet>
                {aboutPageSchema && <script type="application/ld+json">{JSON.stringify(aboutPageSchema)}</script>}
                {breadcrumbSchema && <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>}
            </Helmet>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch /><br /><br /><br />

            <div className={cx("about-us-page-container")}>

                <section className={cx("section-why-choose")}>
                    <h2 className={cx("section-title")}>Why Choose Massclick</h2>
                    <p className={cx("section-subtitle")}>
                        We're driven by experience, transparency, and a relentless focus on client success in a dynamic digital market.
                    </p>

                    <div className={cx("stats-bar")}>
                        {statsData.map((stat, index) => <div key={index} className={cx("stat-item")}>
                                <stat.Icon className={cx("stat-icon")} />
                                <div className={cx("stat-text-wrapper")}>
                                    <div className={cx("stat-number")}>{stat.number}</div>
                                    <div className={cx("stat-label")}>{stat.label}</div>
                                </div>
                            </div>)}
                    </div>

                    <div className={cx("cards-grid")}>
                        {chooseCards.map((card, index) => <Card key={index} {...card} />)}
                    </div>
                </section>

                <section className={cx("section-platform-meets")}>
                    <div className={cx("platform-content-wrapper")}>

                        <div className={cx("platform-image-column")}>
                            <img src={AboutUs} alt="Business Chart for Massclick Platform" className={cx("platform-image")} />
                        </div>

                        <div className={cx("platform-text-column")}>
                            <h2 className={cx("platform-title")}>
                                A Global Platform that Meets the Needs of both <span className={cx("highlight-text")}>Businesses and Users</span>
                            </h2>
                            <p className={cx("platform-description")}>
                                Welcome to MassClick – the ultimate global hub for discovering and connecting with top-notch, verified businesses worldwide. Whether you're a savvy shopper searching for premier local services or a thriving entrepreneur looking to boost your international brand visibility, our scalable platform provides reliable and efficient solutions.
                            </p>

                            <FeatureList features={platformFeatures} />
                        </div>
                    </div>
                </section>
            </div>
            <Footer />
        </>;
};
export default AboutUsPage;
