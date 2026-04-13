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

export const sendBusinessLead = async (cleanMobile, lead = {}) => {

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

  return axios.post(
    "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    payload,
    {
      headers: {
        authkey: process.env.MSG91_AUTH_KEY,
        "Content-Type": "application/json"
      }
    }
  );
};

export const sendBusinessesToCustomer = async (cleanMobile, lead, businesses) => {
  const REQUEST_ID = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // ✅ FIX: Accept both 10-digit and 12-digit (with 91) formats
  const mobileDigits = cleanMobile.replace(/\D/g, '');
  const validMobile = mobileDigits.length === 12 && mobileDigits.startsWith('91') 
    ? mobileDigits.slice(2)  // Remove '91' prefix
    : mobileDigits.length === 10 
    ? mobileDigits 
    : null;

  console.log(`[${REQUEST_ID}] Starting customer WhatsApp send`, {
    original: cleanMobile,
    digits: mobileDigits,
    validMobile,
    businessCount: businesses.length,
    customerName: lead.customerName
  });

  try {
    // Validate inputs
    if (!validMobile || validMobile.length !== 10) {
      throw new Error(`Invalid mobile number: ${cleanMobile} → extracted: ${validMobile}`);
    }

    if (!businesses?.length) {
      throw new Error('No businesses to send');
    }

    // Rest of the function remains the same, but use validMobile for sending
    const uniqueBusinesses = filterAndDeduplicateBusinesses(businesses, lead.location);
    
    console.log(`[${REQUEST_ID}] Filtered businesses`, {
      original: businesses.length,
      filtered: uniqueBusinesses.length
    });

    if (!uniqueBusinesses.length) {
      console.warn(`[${REQUEST_ID}] No businesses after filtering`);
      return { success: false, reason: 'No matching businesses' };
    }

    const reviewMap = await getBusinessReviews(uniqueBusinesses);
    
    // ✅ Use validMobile instead of cleanMobile
    const results = await sendBatchMessages(validMobile, lead, uniqueBusinesses, reviewMap, REQUEST_ID);

    return {
      success: results.some(r => r.success),
      batchesSent: results.filter(r => r.success).length,
      totalBatches: results.length,
      requestId: REQUEST_ID
    };

  } catch (error) {
    console.error(`[${REQUEST_ID}] Fatal error:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
};

// Helper functions
const filterAndDeduplicateBusinesses = (businesses, location) => {
  const normalize = (text = '') => text.toLowerCase().trim();
  const leadLocationRaw = normalize(location);
  
  const locationGroups = {
    trichy: ['trichy', 'tiruchirappalli']
  };

  let groupKey = null;
  for (const key in locationGroups) {
    if (locationGroups[key].some(loc => leadLocationRaw.includes(loc))) {
      groupKey = key;
      break;
    }
  }

  const filtered = businesses.filter(biz => {
    const bizLocation = normalize(biz.location || biz.address || '');
    
    if (groupKey) {
      return locationGroups[groupKey].some(loc => bizLocation.includes(loc));
    }
    return bizLocation.includes(leadLocationRaw);
  });

  // Deduplicate
  const seen = new Set();
  const unique = [];
  
  (filtered.length ? filtered : businesses).forEach(biz => {
    const key = biz._id?.toString() || `${biz.businessName}-${biz.location}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(biz);
    }
  });

  return unique.slice(0, 10);
};

const getBusinessReviews = async (businesses) => {
  try {
    const businessIds = businesses.map(b => b._id).filter(Boolean);
    
    if (!businessIds.length) return {};

    const reviews = await businessReviewModel.aggregate([
      { $match: { businessId: { $in: businessIds }, status: 'ACTIVE' } },
      { 
        $group: {
          _id: '$businessId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    const reviewMap = {};
    reviews.forEach(r => {
      reviewMap[r._id.toString()] = {
        avgRating: r.avgRating.toFixed(1),
        totalReviews: r.totalReviews
      };
    });

    return reviewMap;
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return {};
  }
};

const formatBusinessLine = (biz, index, reviewMap) => {
  const contact = Array.isArray(biz.contactList) 
    ? biz.contactList[0] 
    : biz.contactList || biz.whatsappNumber || 'N/A';

  const name = biz.businessName.length > 35 
    ? biz.businessName.slice(0, 35) + '...' 
    : biz.businessName;

  const address = `${biz.street || ''}, ${biz.location || ''}`
    .replace(/\s+/g, ' ')
    .trim();

  const review = reviewMap[biz._id?.toString()] || {};
  const rating = review.avgRating ? `⭐ ${review.avgRating}/5` : '⭐ No ratings';
  const reviewCount = review.totalReviews ? `(${review.totalReviews})` : '';

  return `${index + 1}. ${name} ${rating} ${reviewCount} | 📍 ${address} | 📞 ${contact}`;
};

const cleanValue = (val) => {
  if (!val || val === '-') return '-';
  return val.toString()
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const sendBatchMessages = async (mobile, lead, businesses, reviewMap, requestId) => {
  const results = [];
  const batches = [];
  
  // Split into batches of 5
  for (let i = 0; i < businesses.length; i += 5) {
    batches.push(businesses.slice(i, i + 5));
  }

  console.log(`[${requestId}] Sending ${batches.length} batch(es)`);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    const batchId = `${requestId}_batch${batchIndex + 1}`;
    
    console.log(`[${batchId}] Preparing batch`, {
      businessCount: batch.length,
      startIndex: batchIndex * 5
    });

    try {
      const values = [];
      for (let i = 0; i < 5; i++) {
        const biz = batch[i];
        values.push(
          biz 
            ? formatBusinessLine(biz, batchIndex * 5 + i, reviewMap)
            : '-'
        );
      }

      const payload = buildPayload(mobile, lead, values);

      console.log(`[${batchId}] Sending to MSG91`, {
        to: mobile,
        template: payload.payload.template.name,
        valueCount: values.filter(v => v !== '-').length
      });

      const response = await axios.post(
        'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
        payload,
        {
          headers: {
            authkey: process.env.MSG91_AUTH_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const success = response.data?.type === 'success' || response.status === 200;
      
      console.log(`[${batchId}] MSG91 response`, {
        success,
        status: response.status,
        type: response.data?.type,
        message: response.data?.message,
        requestId: response.data?.request_id
      });

      results.push({ 
        batchIndex, 
        success, 
        response: response.data 
      });

      // Small delay between batches to prevent rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

    } catch (error) {
      console.error(`[${batchId}] Failed:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });

      results.push({ 
        batchIndex, 
        success: false, 
        error: error.response?.data || error.message 
      });
    }
  }

  return results;
};

const buildPayload = (mobile, lead, values) => ({
  integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
  content_type: 'template',
  payload: {
    messaging_product: 'whatsapp',
    type: 'template',
    template: {
      name: 'customer_business_list_v1',
      language: { 
        code: 'en',
        policy: 'deterministic' 
      },
      namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
      to_and_components: [{
        to: [mobile],
        components: {
          body_1: { type: 'text', value: cleanValue(lead.customerName || 'Customer') },
          body_2: { type: 'text', value: cleanValue(lead.searchText || 'your search') },
          body_3: { type: 'text', value: cleanValue(lead.location || 'your area') },
          body_4: { type: 'text', value: cleanValue(values[0]) },
          body_5: { type: 'text', value: cleanValue(values[1]) },
          body_6: { type: 'text', value: cleanValue(values[2]) },
          body_7: { type: 'text', value: cleanValue(values[3]) },
          body_8: { type: 'text', value: cleanValue(values[4]) }
        }
      }]
    }
  }
});

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
    console.log("MSG91 fallback customer payload", {
      to: [`91${mobile}`],
      template: payload.payload.template.name,
      bodyValues: [
        payload.payload.to_and_components[0].components.body_1.value,
        payload.payload.to_and_components[0].components.body_2.value,
        payload.payload.to_and_components[0].components.body_3.value,
        payload.payload.to_and_components[0].components.body_4.value
      ]
    });

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

    console.log("MSG91 fallback response", {
      status: response.status,
      data: response.data
    });

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




