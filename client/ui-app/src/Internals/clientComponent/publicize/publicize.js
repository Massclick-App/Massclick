import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe2,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import { businessCategorySearch } from "../../../redux/actions/categoryAction.js";
import { createPublicize } from "../../../redux/actions/publicizeAction.js";
import styles from "./publicize.module.css";

const cx = createScopedClassNames(styles);

const steps = [
  "Mobile",
  "Business details",
  "Categories",
  "Growth plan",
];

const defaultSuggestions = [
  "Digital Marketing Agencies",
  "Website Development",
  "Restaurant",
  "Real Estate Consultants",
  "Home Cleaning Services",
  "Education Consultants",
  "Salon",
  "Event Management",
];

const plans = [
  {
    id: "standard",
    label: "Standard",
    tenure: "1 Year Plan",
    price: "117",
    discount: "25% OFF",
    save: "Save 20% more",
    description: "Reliable visibility for new businesses starting online.",
  },
  {
    id: "growth",
    label: "Growth",
    tenure: "2 Year Plan",
    price: "88",
    discount: "44% OFF",
    save: "Save 25% more",
    description: "Higher exposure, lead support, and catalogue priority.",
  },
  {
    id: "premium",
    label: "Premium",
    tenure: "3 Year Plan",
    price: "78",
    discount: "50% OFF",
    save: "Save 33% more",
    description: "Best value for long-term market presence.",
    recommended: true,
  },
  {
    id: "top-five",
    label: "Top 5",
    tenure: "Recommended",
    price: "Custom",
    discount: "Max exposure",
    save: "Guaranteed top visibility",
    description: "Premium lead acceleration for competitive categories.",
  },
];

const planFeatures = [
  "Search visibility",
  "Guaranteed leads",
  "Online catalogue",
  "Payment-ready profile",
  "Smart lead system",
  "Competitor insights",
  "Premium support",
  "Trust stamp",
  "Verified seal",
];

const initialFormData = {
  businessName: "",
  mobileNumber: "",
  pincode: "",
  category: "",
  city: "",
  state: "",
  businessAddress: "",
};

const getStoredMobileNumber = () => {
  if (typeof window === "undefined") return "";

  const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const possibleNumber =
    localStorage.getItem("mobileNumber") ||
    storedUser?.mobileNumber1 ||
    storedUser?.mobileNumber2 ||
    storedUser?.contact ||
    "";

  return String(possibleNumber).replace(/\D/g, "").slice(-10);
};

const normalizeKeywords = (keywords) => {
  if (Array.isArray(keywords)) return keywords;
  if (!keywords) return [];
  return String(keywords).split(",");
};

const buildFallbackKeywords = (category) => {
  const label = String(category || "").trim();
  if (!label) return [];

  return [
    label,
    `${label} near me`,
    `Best ${label}`,
    `${label} services`,
    `${label} in your city`,
  ];
};

export default function PublicizePage() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { searchCategory = [] } = useSelector(
    (state) => state.categoryReducer || {}
  );
  const { loading } = useSelector((state) => state.publicize || {});

  const [activeStep, setActiveStep] = useState(0);
  const [showCategorySuggest, setShowCategorySuggest] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    mobileNumber: getStoredMobileNumber(),
  }));
  const [errors, setErrors] = useState({});

  const categoryOptions = useMemo(() => {
    const apiCategories = searchCategory
      .map((cat) => cat.category)
      .filter(Boolean);
    return [...new Set([...apiCategories, ...defaultSuggestions])];
  }, [searchCategory]);

  const selectedPlanDetails =
    plans.find((plan) => plan.id === selectedPlan) || plans[2];

  const selectedCategoryKeywords = useMemo(() => {
    const keywordMap = new Map();

    selectedCategories.forEach((category) => {
      const matchedCategory = searchCategory.find(
        (item) =>
          String(item.category || "").toLowerCase() ===
          String(category).toLowerCase()
      );

      [
        ...normalizeKeywords(matchedCategory?.keywords),
        ...buildFallbackKeywords(category),
      ].forEach((keyword) => {
        const cleanKeyword = String(keyword).trim();
        if (cleanKeyword) keywordMap.set(cleanKeyword.toLowerCase(), cleanKeyword);
      });
    });

    return Array.from(keywordMap.values()).slice(0, 14);
  }, [searchCategory, selectedCategories]);

  useEffect(() => {
    const storedMobileNumber = getStoredMobileNumber();
    if (!storedMobileNumber) return;

    setFormData((prev) =>
      prev.mobileNumber ? prev : { ...prev, mobileNumber: storedMobileNumber }
    );
  }, []);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = (step = activeStep) => {
    const err = {};

    if (step === 0 && !/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      err.mobileNumber = "Enter a valid 10 digit mobile number";
    }

    if (step === 1) {
      if (!formData.businessName.trim()) {
        err.businessName = "Business name required";
      }
      if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
        err.pincode = "Enter a valid 6 digit pincode";
      }
      if (!formData.city.trim()) {
        err.city = "City required";
      }
      if (!formData.businessAddress.trim()) {
        err.businessAddress = "Address required";
      }
    }

    if (step === 2 && selectedCategories.length === 0) {
      err.category = "Select at least one category";
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const goBack = () => {
    setActiveStep((step) => Math.max(step - 1, 0));
  };

  const addCategory = (categoryItem) => {
    const cleanCategory =
      typeof categoryItem === "string"
        ? categoryItem.trim()
        : String(categoryItem?.category || "").trim();
    if (!cleanCategory) return;

    setSelectedCategories((prev) =>
      prev.includes(cleanCategory) ? prev : [...prev, cleanCategory]
    );
    setFormData((prev) => ({ ...prev, category: cleanCategory }));
    setErrors((prev) => ({ ...prev, category: "" }));
    setShowCategorySuggest(false);
  };

  const removeCategory = (category) => {
    setSelectedCategories((prev) => {
      const next = prev.filter((item) => item !== category);
      setFormData((current) => ({ ...current, category: next[0] || "" }));
      return next;
    });
  };

  const resetFlow = () => {
    setFormData({
      ...initialFormData,
      mobileNumber: getStoredMobileNumber(),
    });
    setSelectedCategories([]);
    setSelectedPlan("premium");
    setActiveStep(0);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;

    try {
      await dispatch(
        createPublicize({
          businessName: formData.businessName.trim(),
          mobileNumber: formData.mobileNumber.trim(),
          pincode: formData.pincode.trim(),
          category: selectedCategories[0],
          city: formData.city.trim(),
          businessAddress: formData.businessAddress.trim(),
        })
      );

      enqueueSnackbar(
        `${formData.businessName} is ready for Massclick review.`,
        { variant: "success" }
      );
      resetFlow();
    } catch (error) {
      enqueueSnackbar("Something went wrong. Please try again.", {
        variant: "error",
      });
    }
  };

  const renderBusinessPreview = () => (
    <div className={cx("preview-shell")}>
      <div className={cx("phone-frame")}>
        <div className={cx("phone-top")} />
        <div className={cx("search-preview")}>
          <span className={cx("brand-mark")}>M</span>
          <span>{formData.category || "Your business category"}</span>
        </div>
        <div className={cx("listing-card")}>
          <div className={cx("image-strip")} />
          <div>
            <div className={cx("listing-name")}>
              {formData.businessName || "Your Business"}
              <BadgeCheck size={16} />
            </div>
            <div className={cx("rating-row")}>
              <span>4.8</span>
              <Star size={14} fill="currentColor" />
              <small>Verified profile</small>
            </div>
          </div>
          <div className={cx("preview-actions")}>
            <span>Call</span>
            <span>Enquiry</span>
            <span>Chat</span>
          </div>
        </div>
        <div className={cx("mini-section")}>
          <strong>Address</strong>
          <p>
            {formData.businessAddress ||
              "Building name, street, landmark and area"}
          </p>
          <small>{formData.city || "City"} {formData.pincode}</small>
        </div>
      </div>

      <div className={cx("floating-card", "floating-card-top")}>
        <TrendingUp size={20} />
        <span>Rank above competitors</span>
      </div>
      <div className={cx("floating-card", "floating-card-bottom")}>
        <ShieldCheck size={20} />
        <span>Trusted Massclick listing</span>
      </div>
    </div>
  );

  return (
    <main className={cx("publicize-wrapper")}>
      <header className={cx("topbar")}>
        <div className={cx("logo")}>
          Mass<span>click</span>
        </div>
        <nav className={cx("nav-links")} aria-label="Publicize sections">
          <a href="#publicize-start">Start</a>
          <a href="#benefits">Benefits</a>
          <a href="#plans">Plans</a>
          <a href="#benefits">Features</a>
        </nav>
        <a className={cx("talk-button")} href="tel:+919342328981">
          <Phone size={18} />
          Talk to us
        </a>
      </header>

      <section
        id="publicize-start"
        className={cx("hero", activeStep === 3 ? "hero-plan-mode" : "")}
      >
        <div className={cx("hero-content")}>
          <div className={cx("breadcrumb")}>Home <ChevronRight size={14} /> Publicize your Business</div>
          <h1>
            <span>Grow</span> your business with Massclick
          </h1>
          <p className={cx("hero-copy")}>
            Build a verified business profile, capture ready-to-buy leads, and
            increase visibility across the Massclick marketplace.
          </p>

          <div className={cx("hero-stats")}>
            <div>
              <strong>10L+</strong>
              <span>buyer searches</span>
            </div>
            <div>
              <strong>1L+</strong>
              <span>happy customers</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>lead discovery</span>
            </div>
          </div>

          <ul className={cx("benefit-list")}>
            <li><CheckCircle2 size={22} /> Rank ahead of your competition</li>
            <li><CheckCircle2 size={22} /> Find ready-to-buy customers instantly</li>
            <li><CheckCircle2 size={22} /> Track leads and growth opportunities</li>
          </ul>
        </div>

        <div className={cx("journey-card", activeStep === 3 ? "journey-card-plan" : "")}>
          <div className={cx("stepper")}>
            {steps.map((step, index) => (
              <button
                key={step}
                type="button"
                className={cx(
                  "step-item",
                  index === activeStep ? "step-active" : "",
                  index < activeStep ? "step-complete" : ""
                )}
                onClick={() => index < activeStep && setActiveStep(index)}
              >
                <span>{index < activeStep ? <Check size={16} /> : index + 1}</span>
                {step}
              </button>
            ))}
          </div>

          <form className={cx("publicize-form")} onSubmit={handleSubmit}>
            {activeStep === 0 && (
              <section className={cx("form-panel")}>
                <div className={cx("panel-heading")}>
                  <span><Phone size={18} /></span>
                  <div>
                    <h2>Enter mobile number</h2>
                    <p>Start your Massclick publicizing setup securely.</p>
                  </div>
                </div>

                <label className={cx("field", errors.mobileNumber ? "field-error" : "")}>
                  <span>Mobile Number</span>
                  <div className={cx("phone-input")}>
                    <strong>+91</strong>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="9342328981"
                      value={formData.mobileNumber}
                      onChange={(e) =>
                        updateField("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                    />
                  </div>
                  {errors.mobileNumber && <small>{errors.mobileNumber}</small>}
                </label>

                <button className={cx("primary-button")} type="button" onClick={goNext}>
                  Get started <ArrowRight size={20} />
                </button>
              </section>
            )}

            {activeStep === 1 && (
              <section className={cx("form-panel")}>
                <div className={cx("panel-heading")}>
                  <span><Building2 size={18} /></span>
                  <div>
                    <h2>Enter your business details</h2>
                    <p>Your place details power the public Massclick profile.</p>
                  </div>
                </div>

                <div className={cx("grid-fields")}>
                  <label className={cx("field", "field-wide", errors.businessName ? "field-error" : "")}>
                    <span>Business Name</span>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => updateField("businessName", e.target.value)}
                      placeholder="Example: Massclick Technologies"
                    />
                    {errors.businessName && <small>{errors.businessName}</small>}
                  </label>

                  <label className={cx("field", errors.pincode ? "field-error" : "")}>
                    <span>Pincode</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.pincode}
                      onChange={(e) => updateField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="620010"
                    />
                    {errors.pincode && <small>{errors.pincode}</small>}
                  </label>

                  <label className={cx("field", errors.city ? "field-error" : "")}>
                    <span>City</span>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Trichy"
                    />
                    {errors.city && <small>{errors.city}</small>}
                  </label>

                  <label className={cx("field")}>
                    <span>State</span>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="Tamil Nadu"
                    />
                  </label>

                  <label className={cx("field", "field-wide", errors.businessAddress ? "field-error" : "")}>
                    <span>Building Name, Street & Area</span>
                    <input
                      type="text"
                      value={formData.businessAddress}
                      onChange={(e) => updateField("businessAddress", e.target.value)}
                      placeholder="Floor, building, street, landmark"
                    />
                    {errors.businessAddress && <small>{errors.businessAddress}</small>}
                  </label>
                </div>

                <div className={cx("button-row")}>
                  <button type="button" className={cx("secondary-button")} onClick={goBack}>
                    Back
                  </button>
                  <button type="button" className={cx("primary-button")} onClick={goNext}>
                    Save and continue <ArrowRight size={20} />
                  </button>
                </div>
              </section>
            )}

            {activeStep === 2 && (
              <section className={cx("form-panel")}>
                <div className={cx("panel-heading")}>
                  <span><Search size={18} /></span>
                  <div>
                    <h2>Add business category</h2>
                    <p>Choose categories so customers can easily find you.</p>
                  </div>
                </div>

                <div className={cx("category-field")}>
                  <label className={cx("field", errors.category ? "field-error" : "")}>
                    <span>Type Business Category</span>
                    <div className={cx("search-input")}>
                      <Search size={20} />
                      <input
                        type="text"
                        value={formData.category}
                        placeholder="Search category"
                        onChange={(e) => {
                          const value = e.target.value;
                          updateField("category", value);
                          if (value.length >= 2) {
                            dispatch(businessCategorySearch(value));
                            setShowCategorySuggest(true);
                          } else {
                            setShowCategorySuggest(false);
                          }
                        }}
                        onFocus={() => setShowCategorySuggest(true)}
                      />
                    </div>
                    {errors.category && <small>{errors.category}</small>}
                  </label>

                  {showCategorySuggest && (
                    <ul className={cx("category-suggest")}>
                      {categoryOptions
                        .filter((category) =>
                          category
                            .toLowerCase()
                            .includes(formData.category.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((category) => (
                          <li key={category}>
                            <button type="button" onClick={() => addCategory(category)}>
                              {category}
                              <span>+</span>
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <div className={cx("selected-area")}>
                  <h3>Selected Categories</h3>
                  <div className={cx("chip-row")}>
                    {selectedCategories.length === 0 ? (
                      <span className={cx("empty-chip")}>No category selected yet</span>
                    ) : (
                      selectedCategories.map((category) => (
                        <button
                          type="button"
                          className={cx("category-chip")}
                          key={category}
                          onClick={() => removeCategory(category)}
                        >
                          {category} <X size={16} />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className={cx("keyword-area")}>
                  <h3>Category Keywords</h3>
                  <div className={cx("keyword-box")}>
                    {selectedCategoryKeywords.length === 0 ? (
                      <span className={cx("empty-chip")}>
                        Select a category to view related search keywords
                      </span>
                    ) : (
                      selectedCategoryKeywords.map((keyword) => (
                        <span className={cx("keyword-chip")} key={keyword}>
                          {keyword}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className={cx("suggested-area")}>
                  <h3>Suggested Categories</h3>
                  <div className={cx("suggestion-stack")}>
                    {categoryOptions.slice(0, 6).map((category) => (
                      <button
                        type="button"
                        key={category}
                        onClick={() => addCategory(category)}
                      >
                        {category}
                        <span>+</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cx("button-row")}>
                  <button type="button" className={cx("secondary-button")} onClick={goBack}>
                    Back
                  </button>
                  <button type="button" className={cx("primary-button")} onClick={goNext}>
                    Save and continue <ArrowRight size={20} />
                  </button>
                </div>
              </section>
            )}

            {activeStep === 3 && (
              <section id="plans" className={cx("form-panel", "plans-panel")}>
                <div className={cx("panel-heading")}>
                  <span><Sparkles size={18} /></span>
                  <div>
                    <h2>Select your growth plan</h2>
                    <p>Pick a plan and start growing your Massclick presence.</p>
                  </div>
                </div>

                <div className={cx("plans-grid")}>
                  {plans.map((plan) => (
                    <button
                      type="button"
                      key={plan.id}
                      className={cx(
                        "plan-card",
                        selectedPlan === plan.id ? "plan-selected" : "",
                        plan.recommended ? "plan-recommended" : ""
                      )}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      <span className={cx("plan-badge")}>{plan.tenure}</span>
                      <strong>{plan.label}</strong>
                      <small>{plan.discount}</small>
                      <div className={cx("plan-price")}>
                        {plan.price === "Custom" ? (
                          <span>Custom</span>
                        ) : (
                          <>
                            <span>Rs {plan.price}</span>
                            <small>/Day</small>
                          </>
                        )}
                      </div>
                      <em>{plan.save}</em>
                      <p>{plan.description}</p>
                    </button>
                  ))}
                </div>

                <div className={cx("feature-table")}>
                  <div className={cx("feature-head")}>
                    <strong>Features</strong>
                    <span>{selectedPlanDetails.label}</span>
                  </div>
                  {planFeatures.map((feature, index) => (
                    <div className={cx("feature-row")} key={feature}>
                      <span>{feature}</span>
                      {selectedPlan === "top-five" && index > 6 ? (
                        <X className={cx("feature-unavailable")} size={20} />
                      ) : (
                        <Check size={20} />
                      )}
                    </div>
                  ))}
                </div>

                <div className={cx("button-row", "sticky-actions")}>
                  <button type="button" className={cx("secondary-button")} onClick={goBack}>
                    Back
                  </button>
                  <button className={cx("primary-button")} type="submit" disabled={loading}>
                    {loading ? "Submitting..." : "Submit and continue"}
                    {!loading && <ArrowRight size={20} />}
                  </button>
                </div>
              </section>
            )}
          </form>
        </div>

        <aside
          className={cx("visual-panel", activeStep === 3 ? "visual-panel-plan" : "")}
          aria-label="Massclick business profile preview"
        >
          {renderBusinessPreview()}
        </aside>
      </section>

      <section id="benefits" className={cx("brand-band")}>
        <div>
          <Zap size={24} />
          <strong>Faster discovery</strong>
          <span>Premium placement for high-intent customer searches.</span>
        </div>
        <div>
          <Globe2 size={24} />
          <strong>Modern market reach</strong>
          <span>Built for local businesses with global-grade presentation.</span>
        </div>
        <div>
          <MapPin size={24} />
          <strong>Place-first profile</strong>
          <span>Address, category, contact, and trust signals in one journey.</span>
        </div>
      </section>
    </main>
  );
}
