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

 useEffect(() => {
  const authUser = JSON.parse(localStorage.getItem("authUser"));

  if (authUser) {
    setBusinessQuery(authUser.businessName || "");
    setBusinessSelected(true);

    setFormData(prev => ({
      ...prev,
      organizationId: authUser._id || "",
      contactDetails: authUser.mobileNumber1 || "",
      location: authUser.businessLocation || ""
    }));
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
      organizationId: formData.organizationId,
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

    enqueueSnackbar('Failed to publish requirement', {
      variant: 'error'
    });
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

          <div className="mrp-card">
            <header className="mrp-header">
              <h1>Create Business Requirement</h1>
              <p>
                Connect with the right organizations by publishing a clear,
                targeted business requirement.
              </p>
            </header>

            .
            <form className="mrp-form" onSubmit={handleSubmit}>

              {/* Requesting Organization */}
              <div className="mrp-field async-search">
                <label>Requesting Organization</label>

                <div className="mrp-input">
                  <span className="icon">
                    <BusinessIcon fontSize="small" />
                  </span>

                  <input
                    value={businessQuery}
                    disabled
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


              {/* Requirement Location */}
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


              {/* Contact Details */}
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


              {/* Requirement Category */}
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


              {/* Requirement Details */}
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


              {error && <div className="mrp-error">{error}</div>}


              {/* Submit Button */}
              <div className="mrp-actions">
                <button type="submit" disabled={loading}>
                  {loading ? 'Publishing…' : 'Publish Requirement'}
                </button>
              </div>

            </form>
          </div>

          {/* <div className="mrp-placeholder">
            <MRPInsights data={mrpList} />
          </div> */}

          <div className="mrp-info-card">
            <h3>Top Response Categories</h3>
            <p className="mrp-info-sub">
              Based on published requirements
            </p>

            <MRPCategoryChart data={mrpList} />
            <MRPChartKPI data={mrpList} />

            <p className="mrp-chart-insight">
              {mrpList.length
                ? 'Restaurants and Gym services currently receive the highest demand.'
                : 'Demand insights will appear as requirements are published.'}
            </p>

            <p className="mrp-chart-footnote">
              Updated just now • Live data
            </p>

          </div>

        </div>
      </section>
    </>
  );
}
