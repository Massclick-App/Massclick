import React, { useState, useEffect, useRef, useCallback } from 'react';
import './testimonials.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Footer from '../footer';
import CardsSearch from '../../CardsSearch/CardsSearch';
import SeoMeta from "../../seo/seoMeta";
import { fetchSeoMeta } from "../../../../redux/actions/seoAction";
import { useDispatch, useSelector } from "react-redux";

const clientTestimonials = [
    {
        id: 1,
        name: "Sri Balaji",
        quote: "Mr.Murugan and team have been very professional since day one, they answered all my queries. Every morning they share the report and the next plan to action without me following up shows their commitment and transparency. I wish him and his team all the best.",
    },
    {
        id: 2,
        name: "Raja Kumaran",
        quote: "Service is good & customer care quick response to any queries",
    },
    {
        id: 3,
        name: "Arifa Banu",
        quote: "I searched for a special school on Google and found the MassClick website on the first page. I visited their service page, and the process was very simple. I was able to call directly and complete the school admission easily.",
    },
    {
        id: 4,
        name: "Shiva G",
        quote: "We are very grateful to massclick. Because of them we have good customers and reaching more customers. Our business is expanding than we think. Thank you",
    },
    {
        id: 5,
        name: "Don VJ",
        quote: "Hi i am dr vijay karthick from HHH HERBAL HOSPITAL, THILLAINAGAR and kk nagar, Trichy.. We are getting gud reach to people because of mass click. Owner muruganantham brother and staffs are so cooperative and energetic 🙏",
    },
    {
        id: 6,
        name: "Jaiganesh B",
        quote: "Amazing nice excellent super support",
    },
];

const TestimonialCard = ({ testimonial }) => (
    <div className="testimonial-card">
        <p className="testimonial-quote">
            "{testimonial.quote}"
        </p>
        <div className="testimonial-author-info">
            <h4 className="author-name">{testimonial.name}</h4>
            <p className="author-source">
                <span className="author-company">{testimonial.company}</span>
                <span className="author-divider">|</span>
                {testimonial.source}
            </p>
        </div>
    </div>
);

const Testimonials = () => {
    const dispatch = useDispatch();
    const { meta: seoMetaData } = useSelector(
        (state) => state.seoReducer
    );

    useEffect(() => {
        dispatch(fetchSeoMeta({ pageType: "testimonial" }));
    }, [dispatch]);

    const fallbackSeo = {
        title: "Testimonials - Massclick",
        description:
            "Massclick is a leading local search platform helping users discover trusted businesses and services.",
        keywords: "testimonial massclick, business directory, local search",
        canonical: "https://massclick.in/testimonial",
        robots: "index, follow",
    };

    const [currentIndex, setCurrentIndex] = useState(0);
    const sliderRef = useRef(null);
    const autoScrollInterval = 20000;

    const handleNext = useCallback(() => {
        setCurrentIndex(prevIndex =>
            prevIndex === clientTestimonials.length - 1 ? 0 : prevIndex + 1
        );
    }, []);

    const handlePrev = useCallback(() => {
        setCurrentIndex(prevIndex =>
            prevIndex === 0 ? clientTestimonials.length - 1 : prevIndex - 1
        );
    }, []);

    useEffect(() => {
        const timer = setInterval(handleNext, autoScrollInterval);

        return () => clearInterval(timer);
    }, [handleNext, autoScrollInterval]);

    useEffect(() => {
        if (sliderRef.current) {
            const cardWidth = sliderRef.current.querySelector('.testimonial-card').offsetWidth;
            const gap = parseFloat(getComputedStyle(sliderRef.current).gap);


            const newTransformValue = `translateX(-${currentIndex * (cardWidth + gap)}px)`;

            sliderRef.current.style.transform = newTransformValue;
        }
    }, [currentIndex]);

    return (
        <>
            <SeoMeta seoData={seoMetaData} fallback={fallbackSeo} />
            <CardsSearch />
            <section className="section-testimonials">
                <h2 className="section-title-testimonials">Our Clients Say <span className="highlight-text-testimonials">About Us</span></h2>

                <div className="slider-container">
                    <div
                        className="slider-track"
                        ref={sliderRef}
                        style={{
                            transform: `translateX(0)`,
                            transition: 'transform 1s ease-in-out'
                        }}
                    >
                        {clientTestimonials.map((testimonial, index) => (
                            <TestimonialCard key={index} testimonial={testimonial} />
                        ))}
                    </div>

                    <button className="slider-control prev" onClick={handlePrev} aria-label="Previous Testimonial">
                        <ChevronLeftIcon className="control-icon" />
                    </button>
                    <button className="slider-control next" onClick={handleNext} aria-label="Next Testimonial">
                        <ChevronRightIcon className="control-icon" />
                    </button>
                </div>

                <div className="slider-indicators">
                    {clientTestimonials.map((_, index) => (
                        <button
                            key={index}
                            className={`indicator-dot ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => setCurrentIndex(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </section>
            <Footer />
        </>
    );
}

export default Testimonials;