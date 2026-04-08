import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

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

export const sendBusinessesToCustomer = async (
  cleanMobile,
  lead,
  businesses
) => {
  try {
    // ✅ 1. Normalize helper
    const normalize = (text = "") =>
      text.toLowerCase().trim();

    // ✅ 2. Location groups
    const locationGroups = {
      trichy: ["trichy", "tiruchirappalli"]
    };

    const leadLocationRaw = normalize(lead.location);

    // ✅ 3. Detect group key
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

    // ✅ 4. Filter businesses (STRONG LOGIC)
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

    // ✅ 5. Remove duplicates (IMPORTANT)
    const uniqueBusinesses = [];
    const seen = new Set();

    const sourceList = filteredBusinesses.length ? filteredBusinesses : businesses;

    sourceList.forEach((biz, index) => {
      const key = biz._id
        ? biz._id.toString()
        : `${biz.businessName}-${index}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueBusinesses.push(biz);
      }
    });

    // ✅ 6. Limit max 10
    const finalBusinesses = uniqueBusinesses.slice(0, 10);

    // ✅ 7. Build message (NO \n)
    let businessListText = "";

    finalBusinesses.forEach((biz, index) => {
      const contact = Array.isArray(biz.contactList)
        ? biz.contactList.join(", ")
        : biz.contactList || biz.whatsappNumber || "N/A";

      const address =
        biz.address || biz.location || "Address not available";

      businessListText += `${index + 1}. ${biz.businessName} (📞 ${contact}, 📍 ${address}) `;
      
    });

    // remove last |
    // businessListText = businessListText.replace(/\|\s*$/, "");

    // ✅ fallback safety
    if (!businessListText) {
      businessListText = "No businesses available at the moment.";
    }

    // ✅ 8. Payload
    const payload = {
      integrated_number: process.env.MSG91_WHATSAPP_SENDER_ID,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: "customer_business_list_v1",
          language: {
            code: "en_US",
            policy: "deterministic"
          },
          namespace: process.env.MSG91_TEMPLATE_NAMESPACE,
          to_and_components: [
            {
              to: [cleanMobile],
              components: {
                body_1: {
                  type: "text",
                  value: lead.customerName || "Customer"
                },
                body_2: {
                  type: "text",
                  value: lead.searchText || "your search"
                },
                body_3: {
                  type: "text",
                  value: lead.location || "your area"
                },
                body_4: {
                  type: "text",
                  value: businessListText
                }
              }
            }
          ]
        }
      }
    };

    // ✅ 9. Send request
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

    return response;

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




