import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { createStartProject } from "../../../redux/actions/startProjectAction.js";

import {
    User,
    Phone,
    Mail,
    Building,
    Globe,
} from "lucide-react";

import CardsSearch from "../CardsSearch/CardsSearch";
import "./businessEnquiry.css";
import businessImage from "../../../assets/businessimage.jpg";
import businessChain from "../../../assets/businesschain.jpg";

const BusinessEnquiry = () => {
    const dispatch = useDispatch();

    const [showModal, setShowModal] = useState(false);

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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        await dispatch(createStartProject(formData));

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

        setShowModal(true);
    };

    return (
        <>
            <CardsSearch /><br /><br /><br /><br />

            <div className="enquiry-wrapper">

                {/* LEFT SIDE FORM */}
                <div className="enquiry-container">

                    <div className="enquiry-header">
                        <img
                            src={businessChain}
                            alt="business handshake"
                            className="header-logo"
                        />

                        <div className="enquiry-header-text">
                            <h2>Business Enquiry</h2>
                            <p>Submit your business details and our consultant will call you.</p>
                        </div>
                    </div>

                    <div className="enquiry-grid">
                        <div className="enquiry-form-group">
                            <label><User size={16} style={{display: 'inline', marginRight: '4px'}} /> Full Name</label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} />
                        </div>
                        <div className="enquiry-form-group">
                            <label><Phone size={16} style={{display: 'inline', marginRight: '4px'}} /> Contact Number</label>
                            <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange} />
                        </div>
                        <div className="enquiry-form-group full">
                            <label><Mail size={16} style={{display: 'inline', marginRight: '4px'}} /> Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} />
                        </div>
                        <div className="enquiry-form-group full">
                            <label><Building size={16} style={{display: 'inline', marginRight: '4px'}} /> Business Name</label>
                            <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} />
                        </div>
                        <div className="enquiry-form-group">
                            <label><Globe size={16} style={{display: 'inline', marginRight: '4px'}} /> Location</label>
                            <input type="text" name="country" value={formData.country} onChange={handleChange} />
                        </div>

                    </div>
                    <button className="enquiry-submit-btn" onClick={handleSubmit}>
                        Submit
                    </button>
                </div>
                <div className="enquiry-side-image">
                    <img src={businessImage} alt="Business" className="enquiry-side-img" />
                    <div className="enquiry-side-overlay"></div>
                </div>
            </div>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="success-animation">
                            <div className="success-check"></div>
                        </div>
                        <h3>Thank You!</h3>
                        <p>Your enquiry has been submitted successfully.</p>
                        <p>Our consultant will contact you within 24 hours.</p>
                        <button className="modal-btn" onClick={() => setShowModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

        </>
    );
};

export default BusinessEnquiry;
