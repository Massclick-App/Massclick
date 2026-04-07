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
        name: "Sivakumar Veerabathiran",
        company: "Seven Hills Technologies",
        source: "Professional Services",
        quote: "Seven Hills Technologies work are very professional & User friendly. His dedication and determination towards his profession is awesome. Congratulations 🥳",
    },
    {
        id: 2,
        name: "Stephen",
        company: "Construction Business Owner",
        source: "Digital Marketing Client",
        quote: "Hello everyone I am doing construction business and I want to advertise because my business is not progressing enough and I want to advertise with this company called seven hills digital market. Advertised through digital marketing and within a very short few days I started getting more clients and they were very patient with all our queries. We are thankful for where they have been as a huge pillar for them now moving towards the next phase and also I am suggest to my friends....",
    },
    {
        id: 3,
        name: "Muthuraman M",
        company: "Seven Hills Technologies",
        source: "Web development company in South Tamil Nadu.",
        quote: "Reasonable price and user friendly design. Seven Hills Technologies is one of the best web site development company in South Tamil Nadu.",
    },
    {
        id: 4,
        name: "A.Ashif Raja",
        company: "Private Client",
        source: "Personal Website/Business",
        quote: "The service provided by the company is highly professional and ethical. They have designed my website to my expectations. Highly recommended. Every nook and corner of the website was carefully designed ensuring my utmost satisfaction. Staff members were helpful and friendly too. They were always in touch and very much easy to approach and contact.",
    },
    {
        id: 5,
        name: "Jeganath R",
        company: "Freelance Client",
        source: "Professional Services",
        quote: "As per the customer requirements they are providing very flexible solutions and maintaining the professional services. Really we are very satisfied to work with you. Keep continue your good work. All the best :)",
    },
    {
        id: 6,
        name: "Priya S.",
        company: "Global E-Commerce",
        source: "E-Commerce Strategy",
        quote: "MassClick provided exceptional market insights that helped us scale our global operations faster than anticipated. Their strategy was smart, aggressive, and highly effective. A truly professional service.",
    },
    {
        id: 7,
        name: "Vishal K.",
        company: "Local Retail Chain",
        source: "Business Listing Management",
        quote: "We saw an immediate boost in local traffic and customer inquiries after using MassClick. The listing management is seamless and the transparency is appreciated. Highly recommend for any business looking to grow their local presence.",
    }
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