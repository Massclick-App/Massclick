import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import styles from "./popularCategories.module.css";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getPlaceholderImage, handleImageError } from "../../../../utils/placeholderImage";
import Drawer from "@mui/material/Drawer";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { fetchPopularCategories } from "../../../../redux/actions/categoryAction";
import { navigateToSearchResult } from "../../../../utils/searchResultNavigation";

// Order is controlled via admin Category Display Settings → Popular tab.
// The v2 API returns items pre-sorted; no client-side reorder needed.
const cx = createScopedClassNames(styles);
const slugify = (text = "") => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const formatUiName = name => {
  if (!name) return "";
  return name.replace(/[-_]/g, " ").replace(/\b\w/g, char => char.toUpperCase()).trim();
};
const generateAltText = (label, districtSlug) => `${label} services in ${districtSlug}`;
const PopularCategoriesDrawer = ({
  openFromHome = false,
  onClose
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [drawerOpen, setDrawerOpen] = useState(openFromHome);
  const [search, setSearch] = useState("");
  const {
    selectedDistrict
  } = useSelector(state => state.locationReducer);
  const {
    popularCategories = [],
    loading
  } = useSelector(state => state.categoryReducer);
  useEffect(() => {
    dispatch(fetchPopularCategories());
  }, [dispatch]);
  useEffect(() => {
    setDrawerOpen(openFromHome);
  }, [openFromHome]);
  const districtSlug = useMemo(() => slugify(selectedDistrict || "india"), [selectedDistrict]);
  useEffect(() => {
    if (!popularCategories.length) return;
    const popularCategoryUrls = popularCategories.map(cat => {
      const categorySlug = cat.slug || slugify(cat.name);
      return `/${districtSlug}/${categorySlug}`;
    });
    }, [popularCategories, districtSlug]);

  // v2 API returns categories in admin-configured order — use directly.
  const orderedCategories = useMemo(() => popularCategories, [popularCategories]);
  const filtered = useMemo(() => {
    return orderedCategories.filter(cat => cat.name.toLowerCase().includes(search.toLowerCase()));
  }, [search, orderedCategories]);
  const handleClick = useCallback(cat => {
    const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
    const userDetails = {
      userName: authUser?.userName,
      mobileNumber1: authUser?.mobileNumber1,
      mobileNumber2: authUser?.mobileNumber2,
      email: authUser?.email
    };
    navigateToSearchResult({
      searchTerm: cat.name,
      location: selectedDistrict || "Global",
      navigate,
      dispatch,
      isKnownCategory: true,
      // Popular category drawer - known category
      logAlreadySent: false,
      userDetails
    });
    setDrawerOpen(false);
    onClose?.();
  }, [dispatch, navigate, selectedDistrict, onClose]);
  const handleClose = () => {
    setDrawerOpen(false);
    onClose?.();
  };
  return <Drawer anchor="right" open={drawerOpen} onClose={handleClose} PaperProps={{
    sx: {
      width: {
        xs: "100%",
        sm: "70%",
        md: "70%"
      },
      maxWidth: "900px",
      padding: {
        xs: "12px",
        sm: "20px"
      }
    }
  }}>
      <header className={cx("pc-header")}>
        <h2>Popular Categories</h2>
        <CloseIcon className={cx("pc-close")} onClick={handleClose} />
      </header>

      <div className={cx("pc-search")}>
        <SearchIcon />
        <input placeholder="Search categories" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <section className={cx("pc-grid")}>

        {!loading && filtered.length === 0 && <p style={{
        textAlign: "center"
      }}>No categories found</p>}

        {filtered.map((cat, index) => {
        const altText = generateAltText(cat.name, districtSlug);
        return <article key={cat._id || cat.slug || `${cat.name}-${index}`} className={cx("pc-item")} onClick={() => handleClick(cat)}>
              <img src={cat.icon || getPlaceholderImage()} className={cx("popular-icons")} alt={altText} width="70" height="70" loading="lazy" decoding="async" style={{
            objectFit: "contain"
          }} onError={e => {
            e.target.onerror = null;
            handleImageError(e);
          }} />
              <span>{formatUiName(cat.name)}</span>
            </article>;
      })}

      </section>
    </Drawer>;
};
export default PopularCategoriesDrawer;
