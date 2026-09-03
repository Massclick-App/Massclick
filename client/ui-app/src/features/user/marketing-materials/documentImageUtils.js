export const getBusinessLogo = (business = {}) =>
  business.logoImageData ||
  business.logoImage ||
  business.logoUrl ||
  business.businessLogo ||
  business.companyLogo ||
  "";

export const imageToDataUrl = async (imageUrl = "") => {
  if (!imageUrl || String(imageUrl).startsWith("data:image")) return imageUrl;

  try {
    const response = await fetch(imageUrl, { mode: "cors" });
    if (!response.ok) return "";
    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
};
