import mongoose, { Schema } from 'mongoose';

const userSchema = new mongoose.Schema({

  // BASIC FIELDS ==============================
  userName: { type: String, required: true, unique: true },
  userProfileKey: { type: String, default: '' },
  contact: { type: String, default: '' },

  role: { type: String, required: true },

  managedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  salesBy: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  ],

  businessLocation: { type: String, required: true },
  businessCategory: { type: String, required: true },

  password: { type: String, required: true },

  emailId: { type: String, required: true, unique: true },

  forgotPassword: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },


  // SECURITY & LOGIN ==========================
  lastLoginAt: { type: Date, default: null },
  lastLoginIP: { type: String, default: '' },
  loginDevice: { type: String, default: '' },

  loginAttempts: { type: Number, default: 0 },
  isLocked: { type: Boolean, default: false },

  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorType: { type: String, enum: ['sms', 'email', 'auth-app', 'none'], default: 'none' },


  // VERIFICATION ===============================
  isEmailVerified: { type: Boolean, default: false },
  emailVerifiedAt: { type: Date, default: null },

  isPhoneVerified: { type: Boolean, default: false },


  // PREFERENCES ================================
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    darkMode: { type: Boolean, default: false },
    notificationEmail: { type: Boolean, default: true },
    notificationSMS: { type: Boolean, default: false }
  },


  // ADDRESS ====================================
  address: {
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },

}, {
  timestamps: true // <-- Automatically adds createdAt & updatedAt
});

export default userSchema;
