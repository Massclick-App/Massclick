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

const cleanValue = (val) => {
  if (!val || val === "-") return "-";

  return val
    .toString()
    .replace(/\n/g, " ")   // ❗ REMOVE NEWLINES
    .replace(/\s+/g, " ")  // normalize spaces
    .trim();
};

export const sendBusinessesToCustomer = async (
  cleanMobile,
  lead,
  businesses
) => {
  try {
    const normalize = (text = "") => text.toLowerCase().trim();

    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"]
    };

    const leadLocationRaw = normalize(lead.location);

    let groupKey = null;

    for (const key in locationGroups) {
      if (
        locationGroups[key].some((loc) =>
          leadLocationRaw.includes(loc)
        )
      ) {
        groupKey = key;
        break;
      }
    }

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

    const finalBusinesses = uniqueBusinesses.slice(0, 10);

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

    const reviewMap = {};

    reviews.forEach((r) => {
      reviewMap[r._id.toString()] = {
        avgRating: r.avgRating.toFixed(1),
        totalReviews: r.totalReviews
      };
    });

    const formatBusiness = (biz, index) => {
      const contact = Array.isArray(biz.contactList)
        ? biz.contactList[0]
        : biz.contactList || biz.whatsappNumber || "N/A";

      const name =
        biz.businessName.length > 20
          ? biz.businessName.slice(0, 20) + "..."
          : biz.businessName;

      const street = biz.street || "";
      const location = biz.location || "";

      const fullAddress = `${street}, ${location}`.replace(/\s+/g, " ").trim();

      const shortAddress =
        fullAddress.length > 30
          ? fullAddress.slice(0, 30) + "..."
          : fullAddress;

      const review = reviewMap[biz._id.toString()] || {};

      const rating = review.avgRating
        ? `⭐ ${review.avgRating}/5`
        : "⭐ No ratings";

      const reviews = review.totalReviews
        ? `(${review.totalReviews})`
        : "";

      return `${index + 1}. ${name} ${rating} ${reviews} | 📍 ${shortAddress} | 📞 ${contact}`;
    };

    const firstBatch = finalBusinesses.slice(0, 5);
    const secondBatch = finalBusinesses.slice(5, 10);

    const prepareValues = (list, startIndex = 0) => {
      const values = [];

      for (let i = 0; i < 5; i++) {
        const biz = list[i];
        values.push(
          biz ? formatBusiness(biz, startIndex + i) : "-"
        );
      }

      return values;
    };

    const values1 = prepareValues(firstBatch, 0);

    await axios.post(
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

                  body_4: {
                    type: "text",
                    value: cleanValue(values1[0])
                  },
                  body_5: {
                    type: "text",
                    value: cleanValue(values1[1])
                  },
                  body_6: {
                    type: "text",
                    value: cleanValue(values1[2])
                  },
                  body_7: {
                    type: "text",
                    value: cleanValue(values1[3])
                  },
                  body_8: {
                    type: "text",
                    value: cleanValue(values1[4])
                  }
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

    if (secondBatch.length > 0) {
      const values2 = prepareValues(secondBatch, 5);

      await axios.post(
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

                    body_4: { type: "text", value: cleanValue(values2[0]) },
                    body_5: { type: "text", value: cleanValue(values2[1]) },
                    body_6: { type: "text", value: cleanValue(values2[2]) },
                    body_7: { type: "text", value: cleanValue(values2[3]) },
                    body_8: { type: "text", value: cleanValue(values2[4]) }
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
    }


    return { success: true };

  } catch (error) {
    console.error(
      "Error sending WhatsApp message:",
      error?.response?.data || error.message
    );
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




