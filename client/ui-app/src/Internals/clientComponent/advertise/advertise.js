import "./advertise.css";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { businessCategorySearch } from "../../../redux/actions/categoryAction.js";

export default function AdvertisePage() {
  const dispatch = useDispatch();

  const { searchCategory = [] } = useSelector(
    (state) => state.categoryReducer || {}
  );

  const [showCategorySuggest, setShowCategorySuggest] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    mobile: "",
    pincode: "",
    category: "",
    city: "",
    address: "",
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    let err = {};
    if (!formData.category) err.category = "Category is required";
    setErrors(err);

    if (Object.keys(err).length === 0) {
      console.log("FORM DATA 👉", formData);
      // API call later
    }
  };

  return (
    <div className="advertise-wrapper">
      <div className="advertise-card">

        <div className="advertise-left">
          <h1>Publicize Your Business</h1>
          <p>
            Reach local customers, build trust, and grow faster with premium
            business listings.
          </p>

          <ul>
            <li>✔ Higher local visibility</li>
            <li>✔ Verified customer leads</li>
            <li>✔ Trusted business profile</li>
            <li>✔ Pay-per-performance model</li>
          </ul>
        </div>

        <div className="advertise-right">
          <h2>Enter Your Business Details</h2>
          <p className="subtext">
            Start advertising in just a few simple steps
          </p>

          <form className="advertise-form" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Business Name"
              value={formData.businessName}
              onChange={(e) =>
                setFormData((p) => ({ ...p, businessName: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Mobile Number"
              value={formData.mobile}
              onChange={(e) =>
                setFormData((p) => ({ ...p, mobile: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Pincode"
              value={formData.pincode}
              onChange={(e) =>
                setFormData((p) => ({ ...p, pincode: e.target.value }))
              }
            />

            {/* CATEGORY SEARCH (same logic as AdvertisementPage) */}
            <div className="form-field" style={{ position: "relative" }}>
              <label>Category</label>

              <input
                type="text"
                value={formData.category}
                placeholder="Search category..."
                onChange={(e) => {
                  const value = e.target.value;

                  setFormData((prev) => ({
                    ...prev,
                    category: value,
                  }));

                  if (value.length >= 2) {
                    dispatch(businessCategorySearch(value));
                    setShowCategorySuggest(true);
                  } else {
                    setShowCategorySuggest(false);
                  }
                }}
                onFocus={() => {
                  if (formData.category.length >= 2) {
                    setShowCategorySuggest(true);
                  }
                }}
                onBlur={() =>
                  setTimeout(() => setShowCategorySuggest(false), 200)
                }
              />

              {showCategorySuggest && searchCategory.length > 0 && (
                <ul className="category-suggest">
                  {searchCategory.map((cat) => (
                    <li
                      key={cat._id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          category: cat.category,
                        }));
                        setShowCategorySuggest(false);
                      }}
                    >
                      {cat.category}
                    </li>
                  ))}
                </ul>
              )}

              {errors.category && (
                <span className="error">{errors.category}</span>
              )}
            </div>

            <input
              type="text"
              placeholder="City"
              value={formData.city}
              onChange={(e) =>
                setFormData((p) => ({ ...p, city: e.target.value }))
              }
            />

            <input
              type="text"
              placeholder="Business Address"
              value={formData.address}
              onChange={(e) =>
                setFormData((p) => ({ ...p, address: e.target.value }))
              }
            />

            <button type="submit">Save & Continue</button>
          </form>
        </div>

      </div>
    </div>
  );
}
