import React, { useState } from "react";
import "./relatedBlogNavbar.css";
import { Link } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import FlightTakeoffIcon from "@mui/icons-material/FlightTakeoff";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import SchoolIcon from "@mui/icons-material/School";

const categories = [
  { label: "Food & Beverage", Icon: RestaurantIcon },
  { label: "Travel & Tourism", Icon: FlightTakeoffIcon },
  { label: "Beauty & Fashion", Icon: CheckroomIcon },
  { label: "Health & Fitness", Icon: FitnessCenterIcon },
  { label: "Recreation", Icon: SportsEsportsIcon },
  { label: "Education & Career", Icon: SchoolIcon },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((open) => !open);

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
            <input placeholder="Search listicles..." />
            <SearchIcon className="search-icon" />
          </div>
        </div>

        <div className={`nav-right ${menuOpen ? "open" : ""}`}>
          <Link to="/" className="nav-link">
            Home
          </Link>
          <Link to="/discover" className="nav-link">
            Discover
          </Link>

          <Link to="/login" className="login-btn">
            Login / Sign Up
          </Link>
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
        {categories.map(({ label, Icon }) => (
          <div key={label} className="category-pill">
            <Icon className="category-icon" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default Navbar;
