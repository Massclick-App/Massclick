import React, { useState } from "react";
import "./relatedBlogNavbar.css";
import { Link } from "react-router-dom";

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            {/* TOP STRIP */}
            <div className="top-strip">
                <span>Looking to find the right option for you?</span>
                <button className="explore-btn">Explore</button>
            </div>

            {/* MAIN NAVBAR */}
            <header className="navbar">
                <div className="nav-left">
                    <div className="logo">
                        MASSCLICK<span>Collections</span>
                    </div>
                </div>

                <div className="nav-center">
                    <div className="search-wrapper">
                        <input placeholder="Search listicles..." />
                        <span className="search-icon">🔍</span>
                    </div>
                </div>

                <div className={`nav-right ${menuOpen ? "open" : ""}`}>
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/discover" className="nav-link">Discover</Link>

                    <Link to="/login" className="login-btn">
                        Login / Sign Up
                    </Link>
                </div>

                {/* MOBILE MENU BUTTON */}
                <div
                    className="menu-toggle"
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    ☰
                </div>
            </header>

            {/* CATEGORY BAR */}
            <div className="category-bar">
                {[
                    "🍔 Food & Beverage",
                    "✈️ Travel & Tourism",
                    "👗 Beauty & Fashion",
                    "💪 Health & Fitness",
                    "🎮 Recreation",
                    "🎓 Education & Career",
                ].map((item, index) => (
                    <div key={index} className="category-pill">
                        {item}
                    </div>
                ))}
            </div>
        </>
    );
};

export default Navbar;