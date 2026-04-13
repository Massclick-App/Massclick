import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import businessReviewModel from "../../model/businessReview/businessReviewModel.js";

// const MSG91_AUTHKEY = process.env.MSG91_AUTHKEY;
// const MSG91_FLOW_ID = process.env.MSG91_WHATSAPP_FLOW_ID; 
// const MSG91_SENDER = process.env.MSG91_WHATSAPP_SENDER; 

// Send OTP
export const sendOtp = async (number) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const baseUrl = process.env.MSG91_BASE_URL;

    if (!authKey || !templateId || !baseUrl) {
      throw new Error("MSG91 environment variables missing.");
    }

    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    const response = await axios.post(
      baseUrl,
      {
        mobile: `91${cleanNumber}`,
        template_id: templateId
      },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.type !== "success") {
      throw new Error(response.data.message || "Failed to send OTP.");
    }

    return { success: true, apiResponse: response.data };
  } catch (error) {
    console.error("Error sending OTP:", error.response?.data || error.message);
    throw error;
  }
};

// Verify OTP
export const verifyOtp = async (number, otp) => {
  try {
    const authKey = process.env.MSG91_AUTH_KEY;
    const verifyUrl = process.env.MSG91_VERIFY_URL;

    if (!authKey || !verifyUrl) {
      throw new Error("MSG91 environment variables missing.");
    }

    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    if (!otp) {
      throw new Error("OTP is required for verification.");
    }

    const response = await axios.post(
      verifyUrl,
      {
        mobile: `91${cleanNumber}`,
        otp: otp
      },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
      }
    );

    const { type, message } = response.data;

    if (type === "success" || message === "Mobile no. already verified") {
      return { success: true, apiResponse: response.data };
    }

    throw new Error(message || "OTP verification failed.");
  } catch (error) {
    console.error("Error verifying OTP:", error.response?.data || error.message);
    throw error;
  }
};

export const fakesendOtp = async (number) => {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    console.log(`[DUMMY] OTP would be sent to ${cleanNumber}`);
    
    // Simulate successful response
    return { 
      success: true, 
      apiResponse: {
        type: "success",
        message: "OTP sent successfully (DUMMY MODE)",
        mobile: `91${cleanNumber}`
      } 
    };
  } catch (error) {
    console.error("Error sending OTP:", error.message);
    throw error;
  }
};

// Verify OTP (Dummy - accepts any OTP)
export const fakeverifyOtp = async (number, otp) => {
  try {
    const cleanNumber = number.replace(/\D/g, "");
    if (cleanNumber.length !== 10) {
      throw new Error("Invalid phone number. Must be 10 digits.");
    }

    if (!otp) {
      throw new Error("OTP is required for verification.");
    }

    console.log(`[DUMMY] Verifying OTP for ${cleanNumber} - OTP: ${otp} (ANY OTP ACCEPTED)`);
    
    // Always succeed - accept any OTP
    return { 
      success: true, 
      apiResponse: {
        type: "success",
        message: "OTP verified successfully (DUMMY MODE)",
        mobile: `91${cleanNumber}`
      } 
    };
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    throw error;
  }
};

export const sendWhatsAppMessage = async (ownerMobile, lead = {}) => {
  const cleanMobile = ownerMobile.replace(/\D/g, "");
  if (cleanMobile.length !== 10) {
    throw new Error("Invalid mobile number");
  }

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "business_lead_alert_v1",
        language: {
          code: "en_US",
          policy: "deterministic"
        },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [cleanMobile],
            components: {
              body_1: { type: "text", value: lead.searchText || "N/A" },
              body_2: { type: "text", value: lead.location || "N/A" },
              body_3: { type: "text", value: lead.customerName || "N/A" },
              body_4: { type: "text", value: lead.customerMobile || "N/A" },
              body_5: { type: "text", value: lead.email || "Not Provided" }
            }
          }
        ]
      }
    }
  };

  const response = await axios.post(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    payload,
    {
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data;
};

/**
 * Cleans and formats text values for WhatsApp template variables
 * Removes newlines and normalizes spaces to prevent template formatting issues
 * @param {any} val - Value to clean
 * @returns {string} - Cleaned string value or "-" if empty
 */
const cleanValue = (val) => {
  if (!val || val === "-") return "-";

  return val
    .toString()
    .replace(/\n/g, " ")   // Remove newlines
    .replace(/\s+/g, " ")  // Normalize multiple spaces to single space
    .trim();
};

/**
 * Sends WhatsApp notification to a business owner about a new lead
 * @param {string} cleanMobile - Formatted mobile number with country code (e.g., 919876543210)
 * @param {Object} lead - Lead information object
 * @param {string} lead.searchText - Original search query
 * @param {string} lead.location - Search location
 * @param {string} lead.customerName - Customer's name
 * @param {string} lead.customerMobile - Customer's mobile number
 * @param {string} lead.email - Customer's email (optional)
 * @returns {Promise} - Axios response promise
 */
export const sendBusinessLead = async (cleanMobile, lead = {}) => {
  console.log("[WhatsApp Business] Starting business lead notification");
  console.log("[WhatsApp Business] Recipient:", cleanMobile);
  console.log("[WhatsApp Business] Lead data:", {
    searchText: lead.searchText,
    location: lead.location,
    customerName: lead.customerName,
    customerMobile: lead.customerMobile,
    email: lead.email || "Not Provided"
  });

  try {
    const payload = {
      integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "business_lead_alert_v2",
          language: {
            code: "en",
            policy: "deterministic"
          },
          namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
          to_and_components: [
            {
              to: [cleanMobile],
              components: {
                body_1: { type: "text", value: lead.searchText },
                body_2: { type: "text", value: lead.location },
                body_3: { type: "text", value: lead.customerName },
                body_4: { type: "text", value: lead.customerMobile },
                body_5: { type: "text", value: lead.email || "Not Provided" }
              }
            }
          ]
        }
      }
    };

    console.log("[WhatsApp Business] Sending request to MSG91 API");
    const response = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("[WhatsApp Business] ✅ Notification sent successfully");
    console.log("[WhatsApp Business] Response status:", response.status);
    return response;

  } catch (error) {
    console.error("[WhatsApp Business] ❌ Failed to send business lead notification");
    console.error("[WhatsApp Business] Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

/**
 * Sends WhatsApp notification to customer with list of matching businesses
 * Handles location matching, duplicate removal, review aggregation, and batch sending
 * @param {string} cleanMobile - Formatted customer mobile number with country code
 * @param {Object} lead - Lead information object
 * @param {Array} businesses - Array of matching business objects
 * @returns {Object} - Success status object
 */
export const sendBusinessesToCustomer = async (
  cleanMobile,
  lead,
  businesses
) => {
  console.log("[WhatsApp Customer] Starting customer business list notification");
  console.log("[WhatsApp Customer] Recipient:", cleanMobile);
  console.log("[WhatsApp Customer] Total businesses received:", businesses.length);
  console.log("[WhatsApp Customer] Lead info:", {
    customerName: lead.customerName,
    searchText: lead.searchText,
    location: lead.location
  });

  try {
    // Step 1: Normalize location for matching
    console.log("[WhatsApp Customer] Step 1: Normalizing location data");
    const normalize = (text = "") => text.toLowerCase().trim();
    
    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"]
    };

    const leadLocationRaw = normalize(lead.location);
    console.log("[WhatsApp Customer] Normalized lead location:", leadLocationRaw);

    // Step 2: Determine location group
    console.log("[WhatsApp Customer] Step 2: Checking location groups");
    let groupKey = null;
    
    for (const key in locationGroups) {
      if (
        locationGroups[key].some((loc) =>
          leadLocationRaw.includes(loc)
        )
      ) {
        groupKey = key;
        console.log("[WhatsApp Customer] ✅ Location group matched:", key);
        break;
      }
    }

    if (!groupKey) {
      console.log("[WhatsApp Customer] No location group match, using exact location");
    }

    // Step 3: Filter businesses by location
    console.log("[WhatsApp Customer] Step 3: Filtering businesses by location");
    const filteredBusinesses = businesses.filter((biz) => {
      const rawLocation = normalize(
        biz.location || biz.address || ""
      );

      if (groupKey) {
        return locationGroups[groupKey].some((loc) =>
          rawLocation.includes(loc)
        );
      }

      return rawLocation.includes(leadLocationRaw);
    });

    console.log("[WhatsApp Customer] Businesses after location filter:", filteredBusinesses.length);

    // Step 4: Remove duplicate businesses
    console.log("[WhatsApp Customer] Step 4: Removing duplicate businesses");
    const uniqueBusinesses = [];
    const seen = new Set();

    const sourceList = filteredBusinesses.length
      ? filteredBusinesses
      : businesses;

    sourceList.forEach((biz, index) => {
      const key = biz._id
        ? biz._id.toString()
        : `${biz.businessName}-${index}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueBusinesses.push(biz);
      }
    });

    console.log("[WhatsApp Customer] Unique businesses count:", uniqueBusinesses.length);
    console.log("[WhatsApp Customer] Duplicates removed:", sourceList.length - uniqueBusinesses.length);

    // Step 5: Limit to 10 businesses
    const finalBusinesses = uniqueBusinesses.slice(0, 10);
    console.log("[WhatsApp Customer] Step 5: Limited to", finalBusinesses.length, "businesses");

    // Step 6: Fetch reviews for selected businesses
    console.log("[WhatsApp Customer] Step 6: Fetching business reviews");
    const businessIds = finalBusinesses.map((b) => b._id);
    
    const reviews = await businessReviewModel.aggregate([
      {
        $match: {
          businessId: { $in: businessIds },
          status: "ACTIVE"
        }
      },
      {
        $group: {
          _id: "$businessId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    console.log("[WhatsApp Customer] Reviews found for", reviews.length, "businesses");

    // Step 7: Create review lookup map
    const reviewMap = {};
    reviews.forEach((r) => {
      reviewMap[r._id.toString()] = {
        avgRating: r.avgRating.toFixed(1),
        totalReviews: r.totalReviews
      };
    });

    // Step 8: Format business data for display
    console.log("[WhatsApp Customer] Step 7: Formatting business data");
    
    const formatBusiness = (biz, index) => {
      const contact = Array.isArray(biz.contactList)
        ? biz.contactList[0]
        : biz.contactList || biz.whatsappNumber || "N/A";

      const name =
        biz.businessName.length > 35
          ? biz.businessName.slice(0, 35) + "..."
          : biz.businessName;

      const street = biz.street || "";
      const location = biz.location || "";
      const fullAddress = `${street}, ${location}`.replace(/\s+/g, " ").trim();

      const review = reviewMap[biz._id.toString()] || {};
      const rating = review.avgRating
        ? `⭐ ${review.avgRating}/5`
        : "⭐ No ratings";
      const reviews = review.totalReviews
        ? `(${review.totalReviews})`
        : "";

      return `${index + 1}. ${name} ${rating} ${reviews} | 📍 ${fullAddress} | 📞 ${contact}`;
    };

    // Step 9: Prepare batches (max 5 per message due to template limits)
    console.log("[WhatsApp Customer] Step 8: Preparing message batches");
    const firstBatch = finalBusinesses.slice(0, 5);
    const secondBatch = finalBusinesses.slice(5, 10);

    console.log("[WhatsApp Customer] First batch size:", firstBatch.length);
    console.log("[WhatsApp Customer] Second batch size:", secondBatch.length);

    const prepareValues = (list, startIndex = 0) => {
      const values = [];
      for (let i = 0; i < 5; i++) {
        const biz = list[i];
        const formattedValue = biz 
          ? formatBusiness(biz, startIndex + i) 
          : "-";
        values.push(cleanValue(formattedValue));
      }
      return values;
    };

    // Step 10: Send first batch
    console.log("[WhatsApp Customer] Step 9: Sending first batch of businesses");
    const values1 = prepareValues(firstBatch, 0);
    
    console.log("[WhatsApp Customer] First batch values:", {
      customerName: cleanValue(lead.customerName || "Customer"),
      searchText: cleanValue(lead.searchText || "your search"),
      location: cleanValue(lead.location || "your area"),
      businessCount: firstBatch.length
    });

    const firstBatchResponse = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      {
        integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: "customer_business_list_v1",
            language: { code: "en", policy: "deterministic" },
            namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
            to_and_components: [
              {
                to: [cleanMobile],
                components: {
                  body_1: {
                    type: "text",
                    value: cleanValue(lead.customerName || "Customer")
                  },
                  body_2: {
                    type: "text",
                    value: cleanValue(lead.searchText || "your search")
                  },
                  body_3: {
                    type: "text",
                    value: cleanValue(lead.location || "your area")
                  },
                  body_4: { type: "text", value: values1[0] },
                  body_5: { type: "text", value: values1[1] },
                  body_6: { type: "text", value: values1[2] },
                  body_7: { type: "text", value: values1[3] },
                  body_8: { type: "text", value: values1[4] }
                }
              }
            ]
          }
        }
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("[WhatsApp Customer] ✅ First batch sent successfully");
    console.log("[WhatsApp Customer] First batch response status:", firstBatchResponse.status);

    // Step 11: Send second batch if exists
    if (secondBatch.length > 0) {
      console.log("[WhatsApp Customer] Step 10: Sending second batch");
      const values2 = prepareValues(secondBatch, 5);
      
      console.log("[WhatsApp Customer] Second batch values prepared:", {
        businessCount: secondBatch.length
      });

      const secondBatchResponse = await axios.post(
        "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        {
          integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
          content_type: "template",
          payload: {
            messaging_product: "whatsapp",
            type: "template",
            template: {
              name: "customer_business_list_v1",
              language: { code: "en", policy: "deterministic" },
              namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
              to_and_components: [
                {
                  to: [cleanMobile],
                  components: {
                    body_1: {
                      type: "text",
                      value: cleanValue(lead.customerName || "Customer")
                    },
                    body_2: {
                      type: "text",
                      value: cleanValue(lead.searchText || "your search")
                    },
                    body_3: {
                      type: "text",
                      value: cleanValue(lead.location || "your area")
                    },
                    body_4: { type: "text", value: values2[0] },
                    body_5: { type: "text", value: values2[1] },
                    body_6: { type: "text", value: values2[2] },
                    body_7: { type: "text", value: values2[3] },
                    body_8: { type: "text", value: values2[4] }
                  }
                }
              ]
            }
          }
        },
        {
          headers: {
            authkey: process.env.MSG91_AUTH_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("[WhatsApp Customer] ✅ Second batch sent successfully");
      console.log("[WhatsApp Customer] Second batch response status:", secondBatchResponse.status);
    } else {
      console.log("[WhatsApp Customer] No second batch needed");
    }

    console.log("[WhatsApp Customer] ✅ Process completed successfully");
    console.log("[WhatsApp Customer] Summary:", {
      totalBusinessesProcessed: finalBusinesses.length,
      batchesSent: secondBatch.length > 0 ? 2 : 1,
      customerMobile: cleanMobile
    });

    return { success: true };

  } catch (error) {
    console.error("[WhatsApp Customer] ❌ Failed to send customer business list");
    console.error("[WhatsApp Customer] Error details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const sendMniBusinessLead = async (cleanMobile, lead = {}) => {

  try {

    const payload = {
      integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "mni_requirement_alert_v1",
          language: {
            code: "en_US",
            policy: "deterministic"
          },
          namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
          to_and_components: [
            {
              to: [`91${cleanMobile}`],
              components: {
                body_1: { type: "text", value: lead.businessName },
                body_2: { type: "text", value: lead.location },
                body_3: { type: "text", value: lead.category },
                body_4: { type: "text", value: lead.description },
                body_5: { type: "text", value: lead.customerMobile }
              }
            }
          ]
        }
      }
    };

    const response = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {

    console.error("❌ MSG91 ERROR:", error.response?.data || error.message);

    throw error;
  }
};

export const sendCustomerBusinessList = async (
  cleanMobile,
  customerName,
  location,
  category,
  businesses
) => {

  const mobile = cleanMobile.toString().replace(/\D/g, "").slice(-10);

  let businessListText = "";

  businesses.forEach((biz, index) => {

    const contact = (biz.contactList || biz.whatsappNumber || "N/A")
      .toString()
      .replace(/\D/g, "")
      .slice(-10);

    businessListText += `${index + 1}. ${biz.businessName} - ${contact} | `;

  });

  businessListText = businessListText.replace(/\|\s*$/, "");

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "mni_customer_business_list_v1",
        language: {
          code: "en_US",
          policy: "deterministic"
        },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [`91${mobile}`],
            components: {
              body_1: { type: "text", value: customerName },
              body_2: { type: "text", value: location },
              body_3: { type: "text", value: category },
              body_4: { type: "text", value: businessListText }
            }
          }
        ]
      }
    }
  };

  try {

    const response = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {

    console.error(
      "❌ MSG91 ERROR:",
      error.response?.data || error.message
    );

    throw error;
  }
};

export const sendLoginWelcomeMessage = async (mobile, userName) => {

  const cleanMobile = mobile.toString().replace(/\D/g, "").slice(-10);

  const payload = {
    integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
    content_type: "template",
    payload: {
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "login_welcome_massclick",
        language: {
          code: "en_US",
          policy: "deterministic"
        },
        namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
        to_and_components: [
          {
            to: [`91${cleanMobile}`],

            components: {
              body_1: {
                type: "text",
                value: userName || "User"
              },
              body_2: {
                type: "text",
                value: "MassClick"
              }
            }

          }
        ]
      }
    }
  };

  try {

    const response = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      payload,
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {

    console.error(
      "❌ Login WhatsApp Error:",
      error.response?.data || error.message
    );

    throw error;
  }

};




