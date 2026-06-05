import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
// src/components/.../MultiStepProfileForm.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "./EditProfile.module.css";
import Footer from "../../footer/footer";
import CardsSearch from "../../CardsSearch/CardsSearch";
import { viewOtpUser, updateOtpUser } from "../../../../redux/actions/otpAction";
import { Alert, AlertTitle } from "@mui/material";
import EditBusinessPage from "../EditBusiness/EditBusinessPage";
const cx = createScopedClassNames(styles);
const PersonalDetails = ({
  formData,
  handleChange,
  handleImageUpload
}) => <div className={cx("form-step-content")}>
    <h3>Your Profile Details</h3>
    <p className={cx("step-description")}>* Denotes mandatory fields</p>
    <div className={cx("step-form-grid")}>
      <div className={cx("form-field form-field-row")}>
        <label>Title</label>
        <select value={formData.title} onChange={e => handleChange(e, "title")}>
          <option value="Mr">Mr</option>
          <option value="Ms">Ms</option>
        </select>
      </div>

      <div className={cx("form-field")}>
        <label>Full Name *</label>
        <input type="text" value={formData.userName || ""} placeholder="Enter your full name" required onChange={e => handleChange(e, "userName")} />
      </div>

      <div className={cx("form-field")}>
        <label>Email ID *</label>
        <div className={cx("input-with-button")}>
          <input type="email" value={formData.email || ""} placeholder="Enter Email ID" onChange={e => handleChange(e, "email")} />
        </div>
      </div>

      <div className={cx("form-field")}>
        <label>Mobile Number 1 *</label>
        <div className={cx("input-with-button verified")}>
          <span className={cx("country-code")}>+91</span>
          <input type="tel" value={formData.mobileNumber1 || ""} required readOnly placeholder="Enter Mobile Number" />
          {formData.mobileNumber1Verified && <span className={cx("verify-status")}>✓</span>}
        </div>
      </div>

      <div className={cx("form-field")}>
        <label>Alternate Mobile Number</label>
        <input type="tel" value={formData.mobileNumber2 || ""} placeholder="Enter alternate number" onChange={e => handleChange(e, "mobileNumber2")} />
      </div>

      <div className={cx("form-field")}>
        <label>Business Name</label>
        <input type="text" value={formData.businessName || ""} placeholder="Enter your business name" onChange={e => handleChange(e, "businessName")} />
      </div>
      <div className={cx("form-field")}>
        <label>Business Category</label>
        <input type="text" value={formData.businessCategory?.category || ""} placeholder="Enter your Business Category" onChange={e => handleChange(e, "businessCategory")} />
      </div>
      <div className={cx("form-field")}>
        <label>Business Location</label>
        <input type="text" value={formData.businessLocation || ""} onChange={e => handleChange(e, "businessLocation")} />
      </div>

      <div className={cx("form-field full-width image-upload-group")}>
        <div className={cx("image-preview")}>
          {formData.profileImage ? <img src={formData.profileImage} alt="Profile" width="80" /> : <span>No image uploaded</span>}
        </div>

        <div className={cx("upload-controls")}>
          <p className={cx("label-text")}>Profile Image</p>
          <input type="file" accept="image/*" id="profileImage" style={{
          display: "none"
        }} onChange={handleImageUpload} />
          <button type="button" className={cx("btn-secondary")} onClick={() => document.getElementById("profileImage").click()}>
            Browse Image
          </button>
        </div>
      </div>
    </div>
  </div>;
const AddressDetails = ({
  formData,
  handleChange
}) => <div className={cx("form-step-content")}>
    <h3>Address Details</h3>
    <p className={cx("step-description")}>Enter your permanent and office addresses.</p>

    <div className={cx("step-form-grid")}>
      <h4>Permanent Address</h4>

      <div className={cx("form-field full-width")}>
        <label>Plot No. / Room No.</label>
        <input type="text" value={formData.permanentAddress?.plotNo || ""} onChange={e => handleChange(e, "plotNo", "permanentAddress")} />
      </div>

      <div className={cx("form-field full-width")}>
        <label>Street / Area</label>
        <input type="text" value={formData.permanentAddress?.street || ""} onChange={e => handleChange(e, "street", "permanentAddress")} />
      </div>

      <div className={cx("form-field")}>
        <label>Pincode</label>
        <input type="text" value={formData.permanentAddress?.pincode || ""} onChange={e => handleChange(e, "pincode", "permanentAddress")} />
      </div>

      <div className={cx("form-field")}>
        <label>Home Landline</label>
        <input type="text" value={formData.permanentAddress?.homeLandline || ""} onChange={e => handleChange(e, "homeLandline", "permanentAddress")} />
      </div>

      <div className={cx("form-field")}>
        <label>Office Landline</label>
        <input type="text" value={formData.permanentAddress?.officeLandline || ""} onChange={e => handleChange(e, "officeLandline", "permanentAddress")} />
      </div>

      <h4>Office Address</h4>

      <div className={cx("form-field full-width")}>
        <label>Plot No. / Room No.</label>
        <input type="text" value={formData.officeAddress?.plotNo || ""} onChange={e => handleChange(e, "plotNo", "officeAddress")} />
      </div>

      <div className={cx("form-field full-width")}>
        <label>Street / Area</label>
        <input type="text" value={formData.officeAddress?.street || ""} onChange={e => handleChange(e, "street", "officeAddress")} />
      </div>

      <div className={cx("form-field")}>
        <label>Pincode</label>
        <input type="text" value={formData.officeAddress?.pincode || ""} onChange={e => handleChange(e, "pincode", "officeAddress")} />
      </div>

      <div className={cx("form-field")}>
        <label>Office Landline</label>
        <input type="text" value={formData.officeAddress?.officeLandline || ""} onChange={e => handleChange(e, "officeLandline", "officeAddress")} />
      </div>
    </div>
  </div>;
const FamilyAndFriends = ({
  formData,
  handleArrayChange
}) => <div className={cx("form-step-content")}>
    <h3>Family and Friends</h3>
    <p className={cx("step-description")}>Add family or friends you want to include.</p>

    {formData.familyAndFriends?.map((person, index) => <div key={index} className={cx("friend-block")}>
        <div className={cx("form-field")}>
          <label>Name</label>
          <input type="text" value={person.name || ""} onChange={e => handleArrayChange(e, index, "name")} />
        </div>

        <div className={cx("form-field")}>
          <label>Relation</label>
          <input type="text" value={person.relation || ""} onChange={e => handleArrayChange(e, index, "relation")} />
        </div>

        <div className={cx("form-field")}>
          <label>Contact Number</label>
          <input type="text" value={person.contactNumber || ""} onChange={e => handleArrayChange(e, index, "contactNumber")} />
        </div>

        <div className={cx("form-field")}>
          <label>Email</label>
          <input type="text" value={person.email || ""} onChange={e => handleArrayChange(e, index, "email")} />
        </div>
      </div>)}

    <button type="button" className={cx("btn-secondary")} onClick={() => handleArrayChange(null, formData.familyAndFriends.length, "add")}>
      + Add Another
    </button>
  </div>;
const Favorites = ({
  formData,
  handleChange
}) => <div className={cx("form-step-content")}>
    <h3>Your Favorites</h3>
    <p className={cx("step-description")}>Tell us a bit more about what you like.</p>

    <div className={cx("form-field full-width")}>
      <label>Favorite Colors</label>
      <input type="text" value={formData.favorites?.colors?.join(", ") || ""} placeholder="e.g., Blue, Green" onChange={e => handleChange({
      target: {
        value: e.target.value.split(",").map(v => v.trim())
      }
    }, "colors", "favorites")} />
    </div>

    <div className={cx("form-field full-width")}>
      <label>Favorite Food</label>
      <input type="text" value={formData.favorites?.food?.join(", ") || ""} placeholder="e.g., Pizza, Biryani" onChange={e => handleChange({
      target: {
        value: e.target.value.split(",").map(v => v.trim())
      }
    }, "food", "favorites")} />
    </div>

    <div className={cx("form-field full-width")}>
      <label>Hobbies</label>
      <input type="text" value={formData.favorites?.hobbies?.join(", ") || ""} placeholder="e.g., Reading, Cycling" onChange={e => handleChange({
      target: {
        value: e.target.value.split(",").map(v => v.trim())
      }
    }, "hobbies", "favorites")} />
    </div>
  </div>;
const Completed = () => <div className={cx("form-step-content")}>
    <h3>Profile Completed!</h3>
    <p>You’ve filled out all required details. Click “Update Profile” to save.</p>
  </div>;
const parseStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}") || {};
  } catch {
    return {};
  }
};
function MultiStepProfileForm() {
  const dispatch = useDispatch();
  const storedMobile = localStorage.getItem("mobileNumber") || "";
  const steps = [{
    id: 1,
    title: "Personal Details",
    component: PersonalDetails
  }, {
    id: 2,
    title: "Addresses",
    component: AddressDetails
  }, {
    id: 3,
    title: "Family & Friends",
    component: FamilyAndFriends
  }, {
    id: 4,
    title: "Favorites",
    component: Favorites
  }, {
    id: 5,
    title: "Completed",
    component: Completed
  }];
  const [currentStep, setCurrentStep] = useState(1);
  const [loadingUser, setLoadingUser] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    title: "Mr",
    userName: "",
    email: "",
    emailVerified: false,
    profileImage: "",
    mobileNumber1: storedMobile,
    mobileNumber2: "",
    businessName: "",
    businessCategory: "",
    businessLocation: "",
    permanentAddress: {
      plotNo: "",
      street: "",
      pincode: "",
      homeLandline: "",
      officeLandline: ""
    },
    officeAddress: {
      plotNo: "",
      street: "",
      pincode: "",
      officeLandline: ""
    },
    familyAndFriends: [],
    favorites: {
      colors: [],
      food: [],
      hobbies: []
    }
  });
  const CurrentComponent = steps.find(s => s.id === currentStep)?.component;
  useEffect(() => {
    if (!storedMobile) return;
    setLoadingUser(true);
    dispatch(viewOtpUser(storedMobile)).then(user => {
      if (user) {
        setFormData(prev => ({
          ...prev,
          ...user,
          permanentAddress: {
            ...prev.permanentAddress,
            ...(user.permanentAddress || {})
          },
          officeAddress: {
            ...prev.officeAddress,
            ...(user.officeAddress || {})
          },
          favorites: {
            ...prev.favorites,
            ...(user.favorites || {})
          },
          businessCategory: typeof user.businessCategory === "object" ? user.businessCategory : {
            category: user.businessCategory || ""
          }
        }));
      }
    }).finally(() => setLoadingUser(false));
  }, [storedMobile, dispatch]);
  const handleImageUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        profileImage: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };
  const handleChange = (e, field, nested = null) => {
    const val = e.target.value;
    if (nested) {
      setFormData(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: val
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: val
      }));
    }
  };
  const handleArrayChange = (e, index, field) => {
    setFormData(prev => {
      const updated = Array.isArray(prev.familyAndFriends) ? [...prev.familyAndFriends] : [];
      if (field === "add") {
        updated.push({
          name: "",
          relation: "",
          contactNumber: "",
          email: ""
        });
      } else {
        updated[index] = {
          ...updated[index],
          [field]: e.target.value
        };
      }
      return {
        ...prev,
        familyAndFriends: updated
      };
    });
  };
  const handleNext = () => setCurrentStep(p => Math.min(p + 1, steps.length));
  const handleBack = () => setCurrentStep(p => Math.max(p - 1, 1));
  const handleSubmit = e => {
    e.preventDefault();
    if (currentStep < steps.length) {
      handleNext();
      return;
    }
    const payload = {
      ...formData
    };
    dispatch(updateOtpUser(formData.mobileNumber1, payload)).then(res => {
      if (res && res.success) {
        setSuccessMessage("Profile updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        setCurrentStep(1);
      } else {
        setSuccessMessage("Failed to update profile");
      }
    });
  };
  const progressPercent = Math.round((currentStep - 1) / (steps.length - 1) * 100);
  return <>
      <CardsSearch />
      <br />
      <br />
      <br />

      <div className={cx("profile-form-wrapper")}>
        <div className={cx("profile-form-container")}>
          {/* LEFT SIDEBAR */}
          <div className={cx("sidebar-progress-container")}>
            <div className={cx("overall-progress-header")}>
              <h4>FILL PROFILE IN FEW STEPS</h4>

              <div className={cx("progress-bar-container")}>
                <div className={cx("progress-bar-fill")} style={{
                width: `${progressPercent}%`
              }}></div>
              </div>

              <span>Overall Progress: {progressPercent}%</span>
            </div>

            <ul className={cx("step-navigation")}>
              {steps.map(step => <li key={step.id} className={cx(`step-item ${step.id === currentStep ? "active" : ""} ${step.id < currentStep ? "completed" : ""}`)} onClick={() => setCurrentStep(step.id)}>
                  {step.id < currentStep ? "✔" : step.id}
                  <span className={cx("step-title")}>{step.title}</span>
                </li>)}
            </ul>
          </div>

          {/* RIGHT SIDE FORM */}
          <div className={cx("form-content-area")}>
            {successMessage && <Alert severity="success" sx={{
            mb: 2
          }}>
                <AlertTitle>Success</AlertTitle>
                {successMessage}
              </Alert>}

            {loadingUser ? <div className={cx("business-edit-loading")}>Loading profile details...</div> : <form onSubmit={handleSubmit}>
                <CurrentComponent formData={formData} handleChange={handleChange} handleArrayChange={handleArrayChange} handleImageUpload={handleImageUpload} />

                <div className={cx("form-actions-footer")}>
                  {currentStep > 1 && <button type="button" className={cx("btn-secondary")} onClick={handleBack}>
                      Back
                    </button>}

                  <button type="submit" className={cx("btn-primary")}>
                    {currentStep < steps.length ? "Save & Continue" : "Update Profile"}
                  </button>
                </div>
              </form>}
          </div>
        </div>
      </div>

      <Footer />
    </>;
}
export default function EditProfilePage() {
  const reduxUser = useSelector(state => state.otp?.viewResponse) || {};
  const storedUser = parseStoredUser();
  const isBusinessPeople = reduxUser?.businessPeople === true || storedUser?.businessPeople === true;
  return isBusinessPeople ? <EditBusinessPage /> : <MultiStepProfileForm />;
}
