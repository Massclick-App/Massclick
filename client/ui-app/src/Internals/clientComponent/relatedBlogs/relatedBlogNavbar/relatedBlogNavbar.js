import React, { useState } from "react";
import "./relatedBlogNavbar.css";
import { Link, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import SchoolIcon from "@mui/icons-material/School";

const iconMap = {
  food: RestaurantIcon,
  beverage: RestaurantIcon,
  travel: FlightTakeoffIcon,
  tourism: FlightTakeoffIcon,
  beauty: CheckroomIcon,
  fashion: CheckroomIcon,
  health: FitnessCenterIcon,
  fitness: FitnessCenterIcon,
  recreation: SportsEsportsIcon,
  education: SchoolIcon,
  career: SchoolIcon,
};

const getIcon = (tag) => {
  const lowerTag = tag.toLowerCase();
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (lowerTag.includes(key)) return Icon;
  }
  return RestaurantIcon;
};

const Navbar = ({ tags = [], location = "trichy" }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const navigate = useNavigate();

  const displayTags = Array.isArray(tags) && tags.length > 0 ? tags : [
    "Food & Beverage",
    "Travel & Tourism",
    "Beauty & Fashion",
    "Health & Fitness",
    "Recreation",
    "Education & Career",
  ];

  const handleTagClick = (tag) => {
    const locationSlug = (location || "trichy")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    const tagSlug = tag
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");

    window.location.href = `https://massclick.in/${locationSlug}/${tagSlug}`;
  };

  const toggleMenu = () => setMenuOpen((open) => !open);

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (value.trim()) {
      searchOnPage(value);
    }
  };

  const searchOnPage = (query) => {
    const lowerQuery = query.toLowerCase();

    // First try headings and sections
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const sections = document.querySelectorAll("section, .section, [role='region']");
    const allElements = [...headings, ...sections];

    for (let el of allElements) {
      if (el.textContent.toLowerCase().includes(lowerQuery)) {
        scrollToElement(el);
        return;
      }
    }

    // If no match in headings/sections, search all text content
    const allContent = document.querySelectorAll("p, div, span, li");
    for (let el of allContent) {
      if (el.textContent.toLowerCase().includes(lowerQuery)) {
        scrollToElement(el);
        return;
      }
    }
  };

  const scrollToElement = (el) => {
    const offset = 150;
    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: "smooth"
    });

    el.style.outline = "2px solid #ff6b00";
    setTimeout(() => {
      el.style.outline = "";
    }, 2000);
  };

  return (
    <>
      <div className="top-strip">
        <span>Looking to find the right option for you?</span>
        <button className="explore-btn">Explore</button>
      </div>

      <header className="navbar">
        <div className="nav-left">
          <div className="logo">
            MASSCLICK<span>Collections</span>
          </div>
        </div>

        <div className="nav-center">
          <div className="search-wrapper">
            <input
              placeholder="Search on page..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <SearchIcon className="search-icon" />
          </div>
        </div>

        <div className={`nav-right ${menuOpen ? "open" : ""}`}>
          <Link to="/" className="nav-link">
            Home
          </Link>
          {/* <Link to="/discover" className="nav-link">
            Discover
          </Link>

          <Link to="/login" className="login-btn">
            Login / Sign Up
          </Link> */}
        </div>

        <div
          className="menu-toggle"
          onClick={toggleMenu}
          role="button"
          tabIndex={0}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              toggleMenu();
            }
          }}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </div>
      </header>

      <div className="category-bar">
        {displayTags.map((tag) => {
          const Icon = getIcon(tag);
          return (
            <div
              key={tag}
              className="category-pill"
              onClick={() => handleTagClick(tag)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleTagClick(tag);
                }
              }}
            >
              <Icon className="category-icon" />
              <span>{tag}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Navbar;
