import { createScopedClassNames } from "../../../utils/createScopedClassNames";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { createStartProject } from "../../../redux/actions/startProjectAction.js";
import { User, Phone, Mail, Building, Globe, AlertCircle } from "lucide-react";
import StickySearchBar from '../StickySearchBar/StickySearchBar';
import styles from "./businessEnquiry.module.css";
import businessImage from "../../../assets/businessimage.jpg";
import businessChain from "../../../assets/businesschain.jpg";
const cx = createScopedClassNames(styles);
const BusinessEnquiry = () => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    email: "",
    businessName: "",
    businessType: "",
    category: "",
    subCategory: "",
    businessPhone: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    message: "",
    notes: ""
  });

  // Validation Rules
  const validationRules = {
    fullName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s'-]+$/,
      message: "Full name should contain only letters, spaces, hyphens, and apostrophes (2-100 characters)"
    },
    contactNumber: {
      required: true,
      pattern: /^\+?[1-9]\d{1,14}$/,
      // International E.164 format
      message: "Contact number must be a valid international format (e.g., +1234567890 or 1234567890)"
    },
    businessPhone: {
      pattern: /^[\d\s+()-]*$/,
      // Optional, but if provided must be valid format
      message: "Business phone must contain only numbers, spaces, +, -, (), or be empty"
    },
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: "Please enter a valid email address (e.g., name@example.com)"
    },
    businessName: {
      required: true,
      minLength: 2,
      maxLength: 150,
      message: "Business name is required (2-150 characters)"
    },
    category: {
      required: true,
      message: "Please select a category"
    },
    address: {
      required: true,
      minLength: 5,
      maxLength: 200,
      message: "Address is required (5-200 characters)"
    },
    city: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: "City is required (2-50 characters)"
    },
    country: {
      required: true,
      message: "Country is required"
    },
    postalCode: {
      required: true,
      pattern: /^[a-zA-Z0-9\s-]{3,20}$/,
      message: "Postal code must be 3-20 characters"
    }
  };

  // Validation function
  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    // Check required
    if (rules.required && !value.trim()) {
      return rules.message || `${fieldName} is required`;
    }

    // If not required and empty, skip other validations
    if (!rules.required && !value.trim()) {
      return null;
    }

    // Check minLength
    if (rules.minLength && value.length < rules.minLength) {
      return rules.message || `Minimum ${rules.minLength} characters required`;
    }

    // Check maxLength
    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.message || `Maximum ${rules.maxLength} characters allowed`;
    }

    // Check pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || `${fieldName} format is invalid`;
    }
    return null;
  };

  // Validate entire form
  const validateForm = () => {
    const errors = {};
    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        errors[fieldName] = error;
      }
    });
    return errors;
  };
  const handleChange = e => {
    const {
      name,
      value
    } = e.target;

    // Special handling for contact number - only allow numbers, +, and spaces
    if (name === "contactNumber") {
      const cleanedValue = value.replace(/[^0-9+\s-]/g, "");
      setFormData({
        ...formData,
        [name]: cleanedValue
      });
    } else if (name === "businessPhone") {
      // Allow numbers, +, -, (), and spaces
      const cleanedValue = value.replace(/[^0-9+\s()-]/g, "");
      setFormData({
        ...formData,
        [name]: cleanedValue
      });
    } else if (name === "fullName") {
      // Allow only letters, spaces, hyphens, and apostrophes
      const cleanedValue = value.replace(/[^a-zA-Z\s'-]/g, "");
      setFormData({
        ...formData,
        [name]: cleanedValue
      });
    } else if (name === "postalCode") {
      // Allow letters, numbers, spaces, and hyphens
      const cleanedValue = value.replace(/[^a-zA-Z0-9\s-]/g, "");
      setFormData({
        ...formData,
        [name]: cleanedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };
  const handleBlur = e => {
    const {
      name,
      value
    } = e.target;
    const error = validateField(name, value);
    setFormErrors({
      ...formErrors,
      [name]: error
    });
  };
  const handleSubmit = async e => {
    e.preventDefault();

    // Validate entire form
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      await dispatch(createStartProject(formData));

      // Reset form
      setFormData({
        fullName: "",
        contactNumber: "",
        email: "",
        businessName: "",
        businessType: "",
        category: "",
        subCategory: "",
        businessPhone: "",
        address: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        message: "",
        notes: ""
      });
      setFormErrors({});
      setShowModal(true);
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };
  const isFormValid = Object.keys(validateForm()).length === 0;
  const renderFieldWithError = (fieldName, label, icon, type = "text", placeholder = "") => {
    const error = formErrors[fieldName];
    const hasError = !!error;
    return <div className={cx("enquiry-form-group")} key={fieldName}>
                <label>
                    {icon}
                    {label}
                    {validationRules[fieldName]?.required && <span className={cx("required-asterisk")}>*</span>}
                </label>
                <div className={cx("form-field-wrapper")}>
                    <input type={type} name={fieldName} value={formData[fieldName]} onChange={handleChange} onBlur={handleBlur} placeholder={placeholder} className={cx(`form-input ${hasError ? "input-error" : ""}`)} aria-invalid={hasError} aria-describedby={hasError ? `${fieldName}-error` : undefined} />
                    {hasError && <div className={cx("error-message")} id={`${fieldName}-error`}>
                            <AlertCircle size={16} />
                            {error}
                        </div>}
                </div>
            </div>;
  };
  return <>
            <StickySearchBar /><br /><br /><br /><br />

            <div className={cx("enquiry-wrapper")}>

                {/* LEFT SIDE FORM */}
                <div className={cx("enquiry-container")}>

                    <div className={cx("enquiry-header")}>
                        <img src={businessChain} alt="business handshake" className={cx("header-logo")} />

                        <div className={cx("enquiry-header-text")}>
                            <h2>Business Enquiry</h2>
                            <p>Submit your business details and our consultant will call you.</p>
                        </div>
                    </div>

                    <div className={cx("enquiry-grid")}>
                        {renderFieldWithError("fullName", "Full Name", <User size={16} />)}
                        {renderFieldWithError("contactNumber", "Contact Number", <Phone size={16} />, "tel", "+1 (555) 000-0000")}
                        {renderFieldWithError("email", "Email", <Mail size={16} />, "email", "name@example.com")}
                        {renderFieldWithError("businessName", "Business Name", <Building size={16} />)}
                        {renderFieldWithError("category", "Category", <Globe size={16} />)}
                        <div className={cx("enquiry-form-group")}>
                            <label>
                                <Phone size={16} />
                                Business Phone
                            </label>
                            <div className={cx("form-field-wrapper")}>
                                <input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange} onBlur={handleBlur} placeholder="Optional: +1 (555) 000-0000" className={cx(`form-input ${formErrors.businessPhone ? "input-error" : ""}`)} />
                                {formErrors.businessPhone && <div className={cx("error-message")}>
                                        <AlertCircle size={16} />
                                        {formErrors.businessPhone}
                                    </div>}
                            </div>
                        </div>
                        {renderFieldWithError("address", "Address", <Building size={16} />)}
                        {renderFieldWithError("city", "City", <Globe size={16} />)}
                        {renderFieldWithError("country", "Country", <Globe size={16} />)}
                        {renderFieldWithError("postalCode", "Postal Code", <Globe size={16} />)}
                        <div className={cx("enquiry-form-group full")}>
                            <label>
                                Message <span className={cx("optional-text")}>(Optional)</span>
                            </label>
                            <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Additional details about your business inquiry..." className={cx("form-input")} maxLength="500" />
                            <div className={cx("character-count")}>{formData.message.length}/500</div>
                        </div>
                    </div>
                    <button className={cx(`enquiry-submit-btn ${!isFormValid ? "btn-disabled" : ""}`)} onClick={handleSubmit} disabled={!isFormValid} type="submit">
                        {isFormValid ? "Submit" : "Please fill all required fields"}
                    </button>
                    {Object.keys(formErrors).length > 0 && <div className={cx("form-validation-summary")}>
                            <AlertCircle size={16} />
                            <span>Please fix the errors above before submitting</span>
                        </div>}
                </div>
                <div className={cx("enquiry-side-image")}>
                    <img src={businessImage} alt="Business" className={cx("enquiry-side-img")} />
                    <div className={cx("enquiry-side-overlay")}></div>
                </div>
            </div>
            {showModal && <div className={cx("modal-overlay")}>
                    <div className={cx("modal-box")}>
                        <div className={cx("success-animation")}>
                            <div className={cx("success-check")}></div>
                        </div>
                        <h3>Thank You!</h3>
                        <p>Your enquiry has been submitted successfully.</p>
                        <p>Our consultant will contact you within 24 hours.</p>
                        <button className={cx("modal-btn")} onClick={() => setShowModal(false)}>
                            Close
                        </button>
                    </div>
                </div>}

        </>;
};
export default BusinessEnquiry;
