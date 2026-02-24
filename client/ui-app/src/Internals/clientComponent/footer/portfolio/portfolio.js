import React, { useState, useMemo } from 'react';
import './portfolio.css';
import LaunchIcon from '@mui/icons-material/Launch';
import CardsSearch from '../../CardsSearch/CardsSearch';
import Footer from '../footer';
import geoPark from "../../../../assets/portfolio/geopark.webp"
import ginfraBricks from "../../../../assets/portfolio/ginfraBricks.webp"
import vestleySchool from "../../../../assets/portfolio/vestleySchool.webp"
import royalSathyam from "../../../../assets/portfolio/royalSathyam.webp"
import varahaBoutique from "../../../../assets/portfolio/varahaBoutique.webp"
import meinfotech from "../../../../assets/portfolio/meinfotech.webp"
import armSons from "../../../../assets/portfolio/arm-sons.webp"
import abiramiTimbers from "../../../../assets/portfolio/abiramitimber.webp"



const projectData = [
    {
        id: 1,
        title: "Geo Park Hotel", 
        category: "Web Design",
        description: "Full-stack development of a scalable, multi-region e-commerce solution with custom payment gateways.",
        tags: ["React", "Node.js", "Booking Engine"],
        image: geoPark,
        link: "https://geopark.in/"
    },
    {
        id: 2,
        title: "ME Infotech", 
        category: "Web Design",
        description: "High-performance Google Ads and Facebook campaign resulting in a 40% increase in qualified construction leads.",
        tags: ["Data Annotation", "Tech Services"],
        image: meinfotech,
        link: "https://meinfotech.com/"
    },
    {
        id: 3,
        title: "Westley School", // Matches 'https://westleyschool.com/'
        category: "Web Design",
        description: "Comprehensive local SEO strategy boosting client to the #1 position in the Google 3-pack for all primary keywords.",
        tags: ["School Website", "Events"],
        image: vestleySchool,
        link: "https://westleyschool.com/"
    },
    {
        id: 4,
        title: "Jinfa Bricks", // Matches 'https://jinfabricks.com/'
        category: "Web Design",
        description: "Complete redesign and branding of a B2B company's corporate website and visual assets.",
        tags: ["B2B", "Materials"],
        image: ginfraBricks,
        link: "https://jinfabricks.com/"
    },
    {
        id: 5,
        title: "Hotel Sam Group", // Matches 'https://lsngrouphotels.in/'
        category: "Web Design",
        description: "Developed and executed a content strategy leading to a 300% growth in organic social media engagement.",
        tags: ["Hospitality", "Booking"],
        image: royalSathyam,
        link: "https://lsngrouphotels.in/"
    },
    {
        id: 6,
        title: "RMSons", // Matches 'https://rmsons.in/'
        category: "Web Design",
        description: "In-depth technical audit to resolve crawling issues, resulting in a 25% improvement in indexation rate.",
        tags: ["B2C", "Home Goods"],
        image: armSons,
        link: "https://rmsons.in/"
    },
    {
        id: 7,
        title: "Sri Abirami Trailer Dealer", // Matches 'https://sriabiramitrailerdealer.com/'
        category: "Web Design",
        description: "Website showcasing heavy vehicle sales and dealership information.",
        tags: ["Automotive", "Dealership"],
        image: abiramiTimbers,
        link: "https://armbuildmart.in/"
    },
    {
        id: 8,
        title: "Varaha Boutique", // Matches 'https://varahaboutique.com/'
        category: "Web Design",
        description: "E-commerce platform for a boutique with focus on high-quality visuals and user experience.",
        tags: ["E-commerce", "Boutique", "Fashion"],
        image: varahaBoutique,
        link: "https://varahaboutique.com/"
    },
];

const categories = ["All", "Web Design", "Digital Marketing", "SEO"];

const PortfolioCard = ({ project }) => (
  <div className="portfolio-card">
    <img src={project.image} alt={project.title} className="card-image-actual" />

    <div className="card-overlay">
      <h3 className="overlay-title">{project.title}</h3>
      <p className="overlay-category">{project.category}</p>
      <a
        href={project.link}
        className="overlay-button"
        aria-label={`View ${project.title} project`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <LaunchIcon />
      </a>
    </div>
  </div>
);


const Portfolio = () => {
    const [activeFilter, setActiveFilter] = useState("All");

    const filteredProjects = useMemo(() => {
        if (activeFilter === "All") {
            return projectData;
        }
        return projectData.filter(project => project.category === activeFilter);
    }, [activeFilter]);

    return (
        <>
            <CardsSearch /><br /><br /><br />
            <section className="section-portfolio">
                <div className="portfolio-header-wrapper">
                    <h2 className="section-title-portfolio">Our <span className="highlight-text-portfolio">Successful</span> Projects</h2>
                    <p className="section-subtitle-portfolio">
                        Explore the work that delivers results. From high-conversion design to top-ranking digital strategy, see what we've accomplished.
                    </p>
                </div>

                {/* Filter Tabs/Buttons */}
                <div className="portfolio-filter-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`filter-tab-button ${activeFilter === cat ? 'active' : ''}`}
                            onClick={() => setActiveFilter(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Project Grid */}
                <div className="portfolio-grid">
                    {filteredProjects.map(project => (
                        <PortfolioCard key={project.id} project={project} />
                    ))}
                </div>

                {/* Optional: Load More Button */}
                <div className="load-more-wrapper">
                    <button className="load-more-button">Load More Work</button>
                </div>
            </section>
            <Footer />
        </>
    );
};

export default Portfolio;