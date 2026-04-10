
import { ObjectId } from "mongodb";
import enquiryModel from "../../model/enquiry/enquiryModel.js"; 


export const createEnquiry = async function (reqBody = {}) {
    try {
        const enquiryData = {
            fullName: reqBody.name, 
            businessName: reqBody.businessName, 
            businessCategory: reqBody.category,
            contactNumber: reqBody.contactNumber,
            email: reqBody.email,
            serviceInterest: reqBody.service,
            message: reqBody.address, 
        };
        
        const enquiryDocument = new enquiryModel(enquiryData);
        const result = await enquiryDocument.save();
        return result;
    } catch (error) {
        console.error("Error saving enquiry:", error);
        // Throw a specific error if validation fails
        if (error.name === 'ValidationError') {
            throw new Error(`Validation failed: ${Object.values(error.errors).map(e => e.message).join(', ')}`);
        }
        throw error;
    }
};



export const viewEnquiry = async (id) => {
    try {
        if (!ObjectId.isValid(id)) throw new Error("Invalid Enquiry ID");

        const enquiry = await enquiryModel.findById(id).lean();
        if (!enquiry) throw new Error("Enquiry not found");

        // NO S3 LOGIC NEEDED

        return enquiry;
    } catch (error) {
        console.error("Error fetching enquiry:", error);
        throw error;
    }
};



export const viewAllEnquiry = async () => {
    try {
        // Fetch all enquiries, newest first
        const allEnquiry = await enquiryModel.find().sort({ submittedAt: -1 }).lean(); 
        
        // Return array (no error if empty, as an empty list is valid data)
        return allEnquiry || []; 
    } catch (error) {
        console.error("Error fetching all enquiries:", error);
        throw error;
    }
};


/**
 * UPDATE ENQUIRY (e.g., mark as read/handled)
 */
export const updateEnquiry = async (id, data) => {
    try {
        if (!ObjectId.isValid(id)) throw new Error("Invalid Enquiry ID");

        // Prevent modification of creation fields
        const updateData = { ...data };
        delete updateData.submittedAt; 
        delete updateData.fullName; 
        // Add fields you want to allow updating (e.g., isRead, status)

        const enquiry = await enquiryModel.findByIdAndUpdate(id, updateData, { new: true });
        if (!enquiry) throw new Error("Enquiry not found");

        return enquiry;
    } catch (error) {
        console.error("Error updating enquiry:", error);
        throw error;
    }
};



export const deleteEnquiry = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid Enquiry ID");

    const deletedEnquiry = await enquiryModel.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!deletedEnquiry) throw new Error("Enquiry not found");

    return deletedEnquiry;
  } catch (error) {
    console.error("Error deleting enquiry:", error);
    throw error;
  }
};