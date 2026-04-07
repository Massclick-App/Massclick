import { createEnquiry, viewEnquiry, viewAllEnquiry, updateEnquiry, deleteEnquiry } from "../../helper/enquiry/enquiryHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";

export const addEnquiryAction = async (req, res) => {
    try {
        const reqBody = req.body;
        const result = await createEnquiry(reqBody);
        res.send(result);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send(error.message);    
    }
};
export const viewEnquiryAction = async (req, res) => {
    try {
        const enquiryId = req.params.id;
        const enquiry = await viewEnquiry(enquiryId);
        res.send(enquiry);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};
export const viewAllEnquiryAction = async (req, res) => {
    try {
        const allEnquiry = await viewAllEnquiry();
        res.send(allEnquiry);
    } catch (error) {
        console.error(error);
        return res.status(BAD_REQUEST.code).send({ message: error.message });
    }
};
export const updateEnquiryAction = async (req, res) => {
    try {
        const enquiryId = req.params.id;
        const enquiryData = req.body;
        const enquiry = await updateEnquiry(enquiryId, enquiryData);
        res.send(enquiry);
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};

export const deleteEnquiryAction = async (req, res) => {
    try {
        const enquiryId = req.params.id;
        const enquiry = await deleteEnquiry(enquiryId);
        res.send({ message: "Category deleted successfully", enquiry });
    } catch (error) {
        console.error(error);
        return res.status(400).send({ message: error.message });
    }
};
