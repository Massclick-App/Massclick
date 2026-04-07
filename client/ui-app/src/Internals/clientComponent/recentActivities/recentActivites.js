import React, { useRef } from 'react';
import './recentActivities.css'; // Make sure this path is correct

import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import WhatsAppIcon from '@mui/icons-material/WhatsApp'; // Added WhatsApp icon

// Dummy image assets (replace with your actual paths or imports)
// import MooseImage from "../../../assets/Activities/MatshnHotel.jpg"; // Placeholder for Matshn hotel
// import StudioShopImage from "../../../assets/Activities/StudioShopPhotography.png"; // Placeholder for Studio Shop
// import PestControlImage from "../../../assets/Activities/ZaraPestControl.jpg"; // Placeholder for Zara Pest Control

import MooseImage from "../../../assets/Popular/CCTV.png"
import PestControlImage from "../../../assets/Popular/HotelRoom.png"
import StudioShopImage from "../../../assets/Popular/Photography.png"


// Use data that matches the image structure (Title, Location, City, Image)
const cardsData = [
    {
        title: 'Matahn hotel',
        location: 'woralaiyur',
        city: 'Tichy',
        image: MooseImage,
        alt: 'Matshn hotel surrounded by nature',
        type: 'hotel'
    },
    {
        title: 'Studio Shop Photography',
        location: 'Srirangam',
        city: 'Tichy',
        image: StudioShopImage,
        alt: 'Studio Shop Photography logo',
        type: 'photography'
    },
    {
        title: 'Zara Pest Control',
        location: 'chennai',
        city: '',
        image: PestControlImage,
        alt: 'Person in protective suit spraying for pest control',
        type: 'pest-control'
    },
    // Adding more data to ensure horizontal scrolling works well
    {
        title: 'Tech Repair Hub',
        location: 'karanai',
        city: 'Tichy',
        image: MooseImage,
        alt: 'Computer repair service',
        type: 'repair'
    },
    {
        title: 'The Organic Market',
        location: 'velachery',
        city: 'chennai',
        image: StudioShopImage,
        alt: 'Fresh organic produce',
        type: 'market'
    },
];

const RecentActivities = () => {
    const containerRef = useRef(null);

    // Functionality for left/right scroll remains the same
    const scroll = (direction) => {
        if (containerRef.current) {
            // Find the width of the card element and a gap
            const cardElement = containerRef.current.querySelector('.activity-card');
            const cardWidth = cardElement ? cardElement.offsetWidth : 350;
            const gap = 20; // Matches the CSS gap
            const scrollAmount = cardWidth + gap;

            containerRef.current.scrollBy({
                left: direction === 'right' ? scrollAmount : -scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="recent-activities-section">
            <h1
                className="section-title text-3xl font-bold text-gray-800 mb-6"
                style={{ color: '#E67E22', textAlign: 'start' }}
            >Recent Activities</h1>

            <div className="carousel-container-v2">

                {/* Scroll Buttons */}
                <button className="nav-arrow left" onClick={() => scroll('left')}>
                    <KeyboardDoubleArrowLeftIcon />
                </button>

                {/* Cards Wrapper (The Scrollable Area) */}
                <div className="cards-wrapper-v2" ref={containerRef}>
                    {cardsData.map((card, index) => (
                        <div className="activity-card" key={index}>

                            {/* Card Header (Details) */}
                            <div className="card-header">
                                <h3 className="card-title">{card.title}</h3>
                                <p className="card-location">{card.location} - {card.city}</p>
                            </div>

                            {/* Image Section */}
                            <div className="card-image-wrapper-v2">
                                <img src={card.image} alt={card.alt} className="card-image-v2" />
                            </div>

                            {/* WhatsApp Button */}
                            <div className="card-actions">
                                <button className="whatsapp-button">
                                    <WhatsAppIcon sx={{ mr: 1 }} />
                                    WhatsApp
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button className="nav-arrow right" onClick={() => scroll('right')}>
                    <KeyboardDoubleArrowRightIcon />
                </button>
            </div>
        </div>
    );
};

export default RecentActivities;