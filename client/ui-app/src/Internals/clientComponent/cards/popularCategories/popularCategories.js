import React, { useEffect, useState, useMemo, useCallback } from "react";
import "./popularCategories.css";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import Drawer from "@mui/material/Drawer";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

import { logSearchActivity } from "../../../../redux/actions/businessListAction";
import { iconMap } from "../../../../utils/iconMap";



export const STATIC_CATEGORIES = [
  { icon: "astrologers", label: "Astrology", path: "/astrologers" },
  { icon: "vastu-consultant", label: "Vastu Consultant", path: "/vastu-consultants" },
  { icon: "numerology", label: "Numerology", path: "/numerology" },
  { icon: "geologist", label: "Geologist", path: "/geologist" },

  { icon: "accountant", label: "Chartered Accountant", path: "/chartered-accountant" },
  { icon: "computer-course", label: "Computer Training Institutes", path: "/computer-training" },
  { icon: "coaching", label: "Coaching", path: "/coaching" },
  { icon: "vocational-training", label: "Vocational training", path: "/vocational-training" },

  { icon: "lawyer", label: "Lawyer", path: "/lawyers" },
  { icon: "registration", label: "Registration Consultant", path: "/registration-consultants" },
  { icon: "hiring", label: "Placement Service", path: "/placement" },
  { icon: "kids-school", label: "Kids School", path: "/kids-school" },

  { icon: "beauty-parlour", label: "Beauty Parlour", path: "/beauty-spa" },
  { icon: "bodymassage", label: "Body Massage", path: "/beauty/spa-massages" },
  { icon: "barbershop", label: "Salon", path: "/salon" },
  { icon: "spa", label: "Beauty Spa", path: "/beauty-spa" },

  { icon: "carhired", label: "Car Hire", path: "/car-hire" },
  { icon: "electrician", label: "Electrician Services", path: "/electrician-service" },
  { icon: "eventorgan", label: "Event Organisers", path: "/event-organisers" },
  { icon: "real-estates", label: "Real Estate", path: "/real-estate" },

  { icon: "textile", label: "Textile", path: "/textile" },
  { icon: "fabricator", label: "Fabricators", path: "/fabricators" },
  { icon: "jewelry", label: "Jewellery Showroom", path: "/jewellery" },
  { icon: "tailoring", label: "Tailoring", path: "/tailoring" },

  { icon: "paint-services", label: "Painting Contractor", path: "/painting-contractor" },
  { icon: "nurse-service", label: "Nursing Service", path: "/nursing-services" },
  { icon: "delivery", label: "Courier Services", path: "/courier-service" },
  { icon: "printer", label: "Printing & Publishing Service", path: "/printing-publishing-service" },

  { icon: "hobby", label: "Hobbies", path: "/hobbies" },
  { icon: "internet-web", label: "Internet Website Designer", path: "/web-designers" },
  { icon: "opticals", label: "Opticals", path: "/opticals" },
  { icon: "organics", label: "Organic Shop", path: "/organic-shop" },

  { icon: "scrap", label: "Scrap Dealer", path: "/scrap-dealers" },
  { icon: "auto-mobiles", label: "Automobiles", path: "/automobiles" },
  { icon: "import-export", label: "Export & Import", path: "/export-import" },
  { icon: "loans", label: "Loans", path: "/loans" },

  { icon: "physiotherapy", label: "Physiotherapy", path: "/physiotherapy" },
  { icon: "clinical-lab", label: "Clinical Lab", path: "/clinical-lab" },
  { icon: "homieo", label: "Homeo Clinic", path: "/homeo-clinic" },
  { icon: "cosmetics", label: "Cosmetics", path: "/cosmetics" },

  { icon: "architech", label: "Architect", path: "/architect" },
  { icon: "sports", label: "Sports", path: "/sports" },
  { icon: "tiles", label: "Ceramic", path: "/ceramic" },
  { icon: "book-shop", label: "Book Shop", path: "/book-shop" },

  { icon: "fancy-store", label: "Fancy Shop", path: "/fancy-shop" },
  { icon: "tatoo", label: "Tattoo Artist", path: "/tattoo-artists" },
  { icon: "boutique", label: "Boutique", path: "/boutique" },
  { icon: "footwear-shop", label: "Footwear Shop", path: "/footwear-shop" },

  { icon: "nursery", label: "Nursery Garden", path: "/nursery-garden" },
  { icon: "special-school", label: "Special School", path: "/special-school" },
  { icon: "mosquito-net", label: "Mosquito Net", path: "/mosquito-net" },
  { icon: "hearing-aid", label: "Hearing Aid", path: "/hearing-aid" },
];


const slugify = (text) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const generateAltText = (label, districtSlug) =>
  `${label} services in ${districtSlug}`;


const PopularCategoriesDrawer = ({ openFromHome = false, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [drawerOpen, setDrawerOpen] = useState(openFromHome);
  const [search, setSearch] = useState("");

  const { selectedDistrict } = useSelector(
    (state) => state.locationReducer
  );

  useEffect(() => {
    if (openFromHome) setDrawerOpen(true);
  }, [openFromHome]);

  const districtSlug = useMemo(
    () => slugify(selectedDistrict || "india"),
    [selectedDistrict]
  );

  /* ✅ OPTIMIZED FILTER */
 const filtered = useMemo(() => {
  return STATIC_CATEGORIES.filter((cat) =>
    cat.label.toLowerCase().includes(search.toLowerCase())
  );
}, [search]);

  /* ✅ CLICK HANDLER MEMO */
  const handleClick = useCallback((cat) => {
    const categorySlug = cat.path.replace("/", "");

    setTimeout(() => {
      dispatch(
        logSearchActivity(cat.label, selectedDistrict || "Global", {}, cat.label)
      );
    }, 0);

    navigate(`/${districtSlug}/${categorySlug}`);
    setDrawerOpen(false);
  }, [dispatch, navigate, selectedDistrict, districtSlug]);

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{
        sx: { width: "70%", maxWidth: "900px", padding: "20px" },
      }}
    >
      <header className="pc-header">
        <h2>Popular Categories</h2>
        <CloseIcon className="pc-close" onClick={() => setDrawerOpen(false)} />
      </header>

      <div className="pc-search">
        <SearchIcon />
        <input
          placeholder="Search categories"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="pc-grid">
        {filtered.map((cat) => {
          const altText = generateAltText(cat.label, districtSlug);

          return (
            <article
              key={cat.label}
              className="pc-item"
              onClick={() => handleClick(cat)}
            >
              <img
                src={iconMap[cat.icon]}
                alt={altText}
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = iconMap["astrologers"]; 
                }}
              />
              <span>{cat.label}</span>
            </article>
          );
        })}
      </section>
    </Drawer>
  );
};

export default PopularCategoriesDrawer;