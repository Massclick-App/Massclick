import React, { useState } from "react";
import "./searchBar.css";
import MI from "../../../assets/Mi.png";
import AddBusinessModel from "../AddBusinessModel.js";
import {
    Box,
    Button, // Using Material-UI Button
    Typography,
} from "@mui/material";
import {
    Add as AddIcon,
} from "@mui/icons-material";
import MicIcon from "@mui/icons-material/Mic";

const SearchBar = ({
    searchTerm,
    setSearchTerm,
    locationName,
    setLocationName,
    handleSearch,
    locationOptions = [],
    isScrolled = false,
    isSearching = false,
}) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    // Keep the visibility logic
    const isVisible = isScrolled || isSearching;

    return (
        <header
            className={`search-header ${isVisible ? "visible" : ""}`}
            style={{ backdropFilter: isVisible ? "blur(8px)" : "none" }}
        >
            <div className="search-header-content">

                {/* Logo Section - No change to structure */}
                <div className="logo-section">
                    <div className="logo-circle">
                        <img src={MI} alt="Logo" className="logo-image" />
                    </div>
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: "1.2rem", sm: "1.5rem", md: "1.8rem" },
                                letterSpacing: "0.5px",
                                lineHeight: 1.1,
                                background: "linear-gradient(45deg, #FF8C00, #FFA500)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}
                        >
                            Mass<Box component="span">click</Box>
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: { xs: "0.75rem", sm: "0.9rem" },
                                color: "text.secondary",
                                fontWeight: 400,
                                mt: 0.5,
                            }}
                        >
                            India's Leading Local Search Engine
                        </Typography>
                    </Box>
                </div>


                <div className="search-area">
                    <div className="search-input location">
                        <i className="fa-solid fa-location-dot icon start-icon"></i> 
                        <input
                            type="text"
                            placeholder="Location"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            list="locationOptions"
                        />
                        <datalist id="locationOptions">
                            {locationOptions.map((opt, i) => (
                                <option key={i} value={opt.label} />
                            ))}
                        </datalist>
                    </div>

                    <div className="search-input main">
                        <input
                            type="text"
                            placeholder="Search for ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <MicIcon className="input-adornment end" />
                    </div>


                    <button className="search-btn" onClick={handleSearch}>
                        <span>Search</span> <i className="fa-solid fa-magnifying-glass"></i>
                    </button>

                </div>

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenModal}
                    // Apply desktop-only logic
                    sx={{
                        display: { xs: 'none', md: 'flex' }, // HIDE on XS, SM, SHOW on MD and up
                        background: "linear-gradient(45deg, #FF6F00, #F7941D)",
                        color: "white",
                        textTransform: "none",
                        fontSize: { xs: "0.9rem", sm: "1rem" },
                        borderRadius: "30px",
                        px: { xs: 2.5, sm: 3.5 },
                        py: { xs: 1, sm: 1.2 },
                        whiteSpace: "nowrap",
                        boxShadow: "0 10px 30px rgba(255, 123, 0, 0.4)",
                        transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
                        "&:hover": {
                            background: "linear-gradient(45deg, #cc5a0f, #ff8a2d)",
                            boxShadow: "0 15px 40px rgba(255, 123, 0, 0.5)",
                        },
                    }}
                >
                    Add Your Business
                </Button>
            </div>

            {/* Modal - No change */}
            <AddBusinessModel open={isModalOpen} handleClose={handleCloseModal} />
        </header>
    );
};

export default SearchBar;