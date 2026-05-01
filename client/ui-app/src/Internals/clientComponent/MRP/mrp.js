import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import BusinessIcon from "@mui/icons-material/Business";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import CategoryIcon from "@mui/icons-material/Category";
import './mrp.css';
import CardsSearch from '../CardsSearch/CardsSearch';
import {
  createMRP,
  searchMrpBusiness,
  searchMrpCategory,
  getAllMRP,
  sendMrpLeads
} from '../../../redux/actions/mrpAction';
import MRPInsights from './mrpInsights/mrpInsights';
import MRPCategoryChart from './mrpChart/mrpCategoryChart';
import MRPChartKPI from './mrpKpiChart/mrpChartKpi';

export default function MRPPage() {
  const dispatch = useDispatch();
  const timerRef = useRef(null);
  const { enqueueSnackbar } = useSnackbar();

  const { loading, error } = useSelector(state => state.mrp || {});
  const {
    businessSearchResults = [],
    categorySearchResults = []
  } = useSelector(state => state.mrp || {});
  const { mrpList = [] } = useSelector(state => state.mrp || {});

  const [businessQuery, setBusinessQuery] = useState('');
  const [categoryQuery, setCategoryQuery] = useState('');

  const [businessSelected, setBusinessSelected] = useState(false);
  const [categorySelected, setCategorySelected] = useState(false);

  const [formData, setFormData] = useState({
    organizationId: '',
    categoryId: '',
    location: '',
    contactDetails: '',
    details: ''
  });

  const totalRequirements = mrpList.length;
  const uniqueCategoryCount = new Set(
    mrpList.map(item => item?.categoryId).filter(Boolean)
  ).size;

  const topCategories = Object.entries(
    mrpList.reduce((acc, item) => {
      if (item?.categoryId) {
        acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("authUser");

      if (!storedUser) return;

      const authUser = JSON.parse(storedUser);

      setBusinessQuery(authUser.businessName || "");
      setBusinessSelected(true);

      setFormData(prev => ({
        ...prev,
        organizationId: authUser._id || "",
        contactDetails: authUser.mobileNumber1 || "",
        location: authUser.businessLocation || ""
      }));
    } catch (error) {
      console.error("Invalid authUser in localStorage:", error);
    }
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.organizationId) {
      enqueueSnackbar('Business not found', { variant: 'error' });
      return;
    }

    if (!categorySelected) {
      enqueueSnackbar('Please select category from suggestions', {
        variant: 'warning'
      });
      return;
    }

    try {
      const createdMRP = await dispatch(createMRP({
        categoryId: formData.categoryId,
        location: formData.location,
        description: formData.details,
        contactDetails: formData.contactDetails
      }));

      if (createdMRP?._id) {
        await dispatch(sendMrpLeads(createdMRP._id));
      }

      dispatch(getAllMRP());

      enqueueSnackbar('Requirement published and leads sent successfully', {
        variant: 'success'
      });

      setFormData({
        organizationId: '',
        categoryId: '',
        location: '',
        details: '',
        contactDetails: ''
      });

      setBusinessQuery('');
      setCategoryQuery('');
      setBusinessSelected(false);
      setCategorySelected(false);

    } catch (err) {
      console.error(err);

      enqueueSnackbar(
        typeof err === "string"
          ? err
          : err?.message || "Failed to publish requirement",
        { variant: "error" }
      );
    }
  };

  useEffect(() => {
    dispatch(getAllMRP());
  }, [dispatch]);

  const handleBusinessSearch = (value) => {
    setBusinessQuery(value);
    setBusinessSelected(false);
    setFormData(prev => ({ ...prev, organizationId: '' }));

    clearTimeout(timerRef.current);

    if (value.trim().length >= 2) {
      timerRef.current = setTimeout(() => {
        dispatch(searchMrpBusiness(value.trim()));
      }, 300);
    }
  };

  const handleCategorySearch = (value) => {
    setCategoryQuery(value);
    setCategorySelected(false);
    setFormData(prev => ({ ...prev, categoryId: '' }));

    clearTimeout(timerRef.current);

    if (value.trim().length >= 2) {
      timerRef.current = setTimeout(() => {
        dispatch(searchMrpCategory(value.trim()));
      }, 300);
    }
  };

  return (
    <>
      <CardsSearch />
      <div className="page-spacing-mrp" />

      <section className="mrp-container">
        <div className="mrp-layout-3">

          <div className="mrp-form-card mrp-card">
            <header className="mrp-header">
              <span className="mrp-badge">MRP Dashboard</span>
              <h1>Create a modern business requirement</h1>
              <p>
                Publish a clear requirement, get faster responses, and track demand
                across top categories with a polished interface.
              </p>
            </header>

            <form className="mrp-form" onSubmit={handleSubmit}>

              <div className="mrp-field async-search">
                <label>Requesting Organization</label>

                <div className="mrp-input">
                  <span className="icon">
                    <BusinessIcon fontSize="small" />
                  </span>

                  <input
                    value={businessQuery}
                    onChange={(e) => handleBusinessSearch(e.target.value)}
                    placeholder="Start typing to search organization"
                    required
                  />
                </div>

                {!businessSelected &&
                  businessQuery.length >= 2 &&
                  businessSearchResults.length > 0 && (
                    <ul className="async-dropdown">
                      {businessSearchResults.map(biz => (
                        <li
                          key={biz._id}
                          onClick={() => {
                            setBusinessQuery(biz.businessName);
                            setBusinessSelected(true);

                            setFormData(prev => ({
                              ...prev,
                              organizationId: biz._id
                            }));
                          }}
                        >
                          {biz.businessName}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              <div className="mrp-field">
                <label>Requirement Location</label>

                <div className="mrp-input">
                  <span className="icon">
                    <LocationOnIcon fontSize="small" />
                  </span>

                  <input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        location: e.target.value
                      }))
                    }
                    placeholder="City / Region"
                    required
                  />
                </div>
              </div>

              <div className="mrp-field">
                <label>Contact Details</label>

                <div className="mrp-input">
                  <span className="icon">
                    <PhoneIcon fontSize="small" />
                  </span>

                  <input
                    value={formData.contactDetails}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        contactDetails: e.target.value
                      }))
                    }
                    placeholder="Phone / WhatsApp / Email"
                    required
                  />
                </div>
              </div>

              <div className="mrp-field async-search">
                <label>Requirement Category</label>

                <div className="mrp-input">
                  <span className="icon">
                    <CategoryIcon fontSize="small" />
                  </span>

                  <input
                    value={categoryQuery}
                    placeholder="Search service category"
                    onChange={(e) => handleCategorySearch(e.target.value)}
                    required
                  />
                </div>

                {!categorySelected &&
                  categoryQuery.length >= 2 &&
                  categorySearchResults.length > 0 && (
                    <ul className="async-dropdown">
                      {categorySearchResults.map(cat => (
                        <li
                          key={cat}
                          onClick={() => {
                            setCategoryQuery(cat);
                            setCategorySelected(true);

                            setFormData(prev => ({
                              ...prev,
                              categoryId: cat
                            }));
                          }}
                        >
                          {cat}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              <div className="mrp-field mrp-full">
                <label>Requirement Details</label>

                <textarea
                  value={formData.details}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      details: e.target.value
                    }))
                  }
                  placeholder="Describe your requirement clearly and professionally"
                  required
                />
              </div>

              {error && (
                <div className="mrp-error">
                  {typeof error === "string"
                    ? error
                    : error?.message || "Something went wrong"}
                </div>
              )}

              <div className="mrp-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Publishing…' : 'Publish Requirement'}
                </button>
              </div>

            </form>
          </div>

          <div className="mrp-side-column">
            {/* <div className="mrp-summary-grid">
              <div className="mrp-summary-card">
                <span>Total requirements</span>
                <strong>{totalRequirements}</strong>
              </div>
              <div className="mrp-summary-card">
                <span>Unique categories</span>
                <strong>{uniqueCategoryCount}</strong>
              </div>
              <div className="mrp-summary-card">
                <span>Top category</span>
                <strong>{topCategories[0]?.[0] || 'No data'}</strong>
              </div>
            </div> */}

            <MRPInsights data={mrpList} />

            <div className="mrp-info-card">
              <div className="mrp-info-card-header">
                <div>
                  <h3>Top Response Categories</h3>
                  <p className="mrp-info-sub">
                    Based on published requirements.
                  </p>
                </div>
                <span className="mrp-live-pill">Live data</span>
              </div>

              {mrpList && mrpList.length > 0 ? (
                <>
                  <MRPCategoryChart data={mrpList} />
                  <MRPChartKPI data={mrpList} />
                </>
              ) : (
                <div className="mrp-empty-state">
                  Demand insights will appear once requirements are added.
                </div>
              )}

              <p className="mrp-chart-footnote">
                Updated just now • Automatic response analysis
              </p>
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
