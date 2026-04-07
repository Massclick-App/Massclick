import message91Model from "../../model/msg91Model/msg91Model.js";
import User from "../../model/msg91Model/usersModels.js";
import SearchLog from "../../model/businessList/searchLogModel.js";

export function normalizeText(str = "") {
  return String(str || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\-\.,\/#!$%\^&\*;:{}=\+~()@\[\]"'<>?|`\\]/g, " ")
    .replace(/[^0-9a-zA-Z\u00C0-\u024F\s]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// Generate OTP and store
export const generateOtp = async (mobile) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();                          
    const expiresAt = new Date(now.getTime() + 5*60*1000); 

    const otpDoc = new message91Model({
        mobile,
        otp,
        generatedAt: now,   
        expiresAt
    });
    await otpDoc.save();

    let user = await User.findOne({ mobileNumber1: mobile });
    if (!user) {
        user = new User({
            mobileNumber1: mobile,
            currentOtp: otp,
            otpGeneratedAt: now,   
            otpExpiresAt: expiresAt
        });
    } else {
        user.currentOtp = otp;
        user.otpGeneratedAt = now;  
        user.otpExpiresAt = expiresAt;
    }

    await user.save();

    return otp;
};


// Verify OTP
export const verifyOtp = async (mobile, otp) => {
    const otpDoc = await message91Model.findOne({ mobile, otp, isActive: true });
    if (!otpDoc) throw new Error("Invalid OTP");
    if (otpDoc.expiresAt < new Date()) {
        otpDoc.isActive = false;
        await otpDoc.save();
        throw new Error("OTP expired");
    }
    otpDoc.isActive = false;
    await otpDoc.save();

    const user = await User.findOne({ mobileNumber1: mobile });
    if (!user) throw new Error("User not found");
    if (user.currentOtp !== otp || user.otpExpiresAt < new Date()) {
        throw new Error("OTP invalid or expired for user");
    }

    // Clear OTP after verification
    user.currentOtp = null;
    user.otpExpiresAt = null;
    await user.save();

    return true;
};

export const matchLeadsService = async ({
  category = "",
  keywords = [],
  maxResults = 5000
}) => {
  const terms = [category, ...keywords].map(normalizeText).filter(Boolean);

  if (!terms.length)
    return { matchedUsers: [], counts: { today: 0, last7: 0, last30: 0, repeat: 0 } };

  const regex = new RegExp(terms.map(escapeRegex).join("|"), "i");

  const logs = await SearchLog.aggregate([
    {
      $match: {
        $or: [
          { categoryName: { $regex: regex } },
          { searchedUserText: { $regex: regex } },
          { location: { $regex: regex } }
        ]
      }
    },
    {
      $project: {
        userDetails: 1,
        searchedUserText: 1,
        createdAt: 1
      }
    },
    { $limit: maxResults }
  ]);

  let users = [];

  logs.forEach((log) => {
    const time = log.createdAt;
    const searchedText = log.searchedUserText || "";

    (log.userDetails || []).forEach((u) => {
      users.push({ ...u, time, searchedUserText: searchedText });
    });
  });

  const seen = new Set();
  const uniqueUsers = [];

  users.forEach((u) => {
    const key = String(
      u.mobileNumber1 || u.email || u.userName || ""
    ).toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    uniqueUsers.push(u);
  });

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenAgo = new Date(startToday - 6 * 86400000);
  const thirtyAgo = new Date(startToday - 29 * 86400000);

  let today = 0,
    last7 = 0,
    last30 = 0;

  const repeatMap = {};

  uniqueUsers.forEach((u) => {
    const key = u.mobileNumber1 || u.email || u.userName;
    repeatMap[key] = (repeatMap[key] || 0) + 1;

    const d = new Date(u.time);
    if (d >= startToday) today++;
    if (d >= sevenAgo) last7++;
    if (d >= thirtyAgo) last30++;
  });

  const repeat = Object.values(repeatMap).filter((c) => c > 1).length;

  return {
    matchedUsers: uniqueUsers,
    counts: { today, last7, last30, repeat }
  };
};
