import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import './feedback.css';
import StarIcon from '@mui/icons-material/Star';
import Footer from '../footer';
import CardsSearch from '../../CardsSearch/CardsSearch';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";


const highImpactFeedback = [
    {
        id: 1,
        name: "Jessica L.",
        role: "Head of Marketing, Tech Solutions",
        quote: "The personalized support and market depth MassClick provides is unmatched. They don't just solve problems; they anticipate them. Truly world-class.",
        rating: 5,
        length: 'short'
    },
    {
        id: 2,
        name: "Dr. Ahmed H.",
        role: "Founder, Global Pharma",
        quote: "Our experience was transformative. We achieved 150% growth in online visibility within six months. The implementation was seamless and highly professional.",
        rating: 4.5,
        length: 'medium'
    },
    {
        id: 3,
        name: "Sanjay R.",
        role: "Local Business Owner",
        quote: "I highly recommend MassClick for anyone serious about local presence. The transparency and results exceeded our expectations.",
        rating: 5,
        length: 'short'
    },
    {
        id: 4,
        name: "Priya S.",
        role: "E-Commerce Strategy",
        quote: "MassClick’s innovative strategy helped us scale our global operations faster than anticipated. Their team is smart, aggressive, and highly effective. A truly professional service.",
        rating: 5,
        length: 'long'
    },
    {
        id: 5,
        name: "Michael B.",
        role: "International Services",
        quote: "We needed a partner with global reach and local understanding. MassClick delivered on both fronts, providing tailored solutions that truly hit the mark.",
        rating: 4,
        length: 'medium'
    },
];

const RatingStars = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
        stars.push(<StarIcon key={i} className="star-icon full" />);
    }
    if (hasHalfStar) {
        stars.push(<StarIcon key="half" className="star-icon half" />);
    }
    return <div className="rating-stars">{stars}</div>;
};

const FeedbackCard = ({ feedback }) => (
    <div className={`feedback-card feedback-card--${feedback.length}`}>
        <RatingStars rating={feedback.rating} />
        <p className="feedback-quote">
            "{feedback.quote}"
        </p>
        <div className="feedback-author-info">
            <h4 className="author-name-feedback">{feedback.name}</h4>
            <p className="author-role-feedback">{feedback.role}</p>
        </div>
    </div>
);

const FeedbackComponent = () => {

    const dispatch = useDispatch();

    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "feedback" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "User Feedback - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "about massclick, business directory, local search",
        canonical: "https://massclick.in/feedback",
        robots: "index, follow",
    };

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />

            <CardsSearch /><br /><br /><br />

            <section className="section-feedback-grid">
                <div className="feedback-header-wrapper">
                    <h2 className="section-title-feedback-grid">Client Success Stories: Unfiltered Feedback</h2>
                    <p className="section-subtitle-feedback-grid">
                        Discover why international enterprises and savvy entrepreneurs choose MassClick for growth and digital excellence.
                    </p>
                </div>

                <div className="feedback-grid-masonry">
                    {highImpactFeedback.map((feedback) => (
                        <FeedbackCard key={feedback.id} feedback={feedback} />
                    ))}
                </div>
            </section>
            <Footer />
        </>
    );
}

export default FeedbackComponent;