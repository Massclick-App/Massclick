/**
 * Comprehensive Input Validator
 * Handles: type validation, normalization, business logic, keyword cleaning, data quality
 */

class InputValidator {
  // Spam/blacklist keywords to reject
  static SPAM_KEYWORDS = [
    'xxx', 'casino', 'poker', 'viagra', 'crypto', 'bitcoin',
    'forex', 'pump', 'dump', 'scam', 'fake', 'admin', 'root'
  ];

  // NOTE: Location validity is checked against the /api/location API,
  // not hardcoded here. See Business.js (locationExists check) and
  // the backend location controller for live DB-backed validation.

  /**
   * Validate and clean Category input
   */
  static validateCategory(data) {
    const errors = [];
    const validated = {};

    // Name validation
    if (!data.name || !data.name.trim()) {
      errors.push('Category name is required');
    } else {
      const name = data.name.trim();

      // Length check
      if (name.length < 2) errors.push('Category name must be at least 2 characters');
      if (name.length > 100) errors.push('Category name cannot exceed 100 characters');

      // Character validation (allow letters, numbers, spaces, &, -, ')
      if (!/^[a-zA-Z0-9\s&\-'()]+$/.test(name)) {
        errors.push('Category name contains invalid characters');
      }

      // Check for spam/gibberish
      if (/(.)\1{3,}/.test(name)) {
        errors.push('Category name contains repeated characters');
      }

      validated.name = name.replace(/\s+/g, ' ');
    }

    // Description validation (optional)
    if (data.description) {
      const desc = data.description.trim();

      if (desc.length > 500) {
        errors.push('Description cannot exceed 500 characters');
      }

      if (desc.length > 0 && desc.length < 5) {
        errors.push('Description must be at least 5 characters (or leave empty)');
      }

      validated.description = desc || null;
    } else {
      validated.description = null;
    }

    // Keywords validation (optional but must be clean)
    if (data.keywords && Array.isArray(data.keywords)) {
      try {
        validated.keywords = this.validateAndCleanKeywords(data.keywords);
      } catch (err) {
        errors.push(`Keywords error: ${err.message}`);
      }
    } else {
      validated.keywords = [];
    }

    if (errors.length > 0) {
      throw new Error(`Category validation failed:\n${errors.join('\n')}`);
    }

    return validated;
  }

  /**
   * Validate and clean Business input
   */
  static validateBusiness(data) {
    const errors = [];
    const validated = {};

    // Business name validation
    if (!data.businessName || !data.businessName.trim()) {
      errors.push('Business name is required');
    } else {
      const name = data.businessName.trim();

      if (name.length < 2) errors.push('Business name must be at least 2 characters');
      if (name.length > 150) errors.push('Business name cannot exceed 150 characters');

      // Check for spam/gibberish
      if (/(.)\1{3,}/.test(name)) errors.push('Invalid business name');
      if (name === name.toUpperCase() && name.length > 5) {
        errors.push('Business name should not be all UPPERCASE');
      }

      validated.businessName = name;
    }

    // Category validation
    if (!data.category || !data.category.trim()) {
      errors.push('Category is required');
    } else {
      const category = data.category.trim();

      // Verify category exists (you should check against DB)
      if (category.length < 2) {
        errors.push('Invalid category');
      }

      validated.category = category;
    }

    // Location validation
    if (!data.location || !data.location.trim()) {
      errors.push('Location is required');
    } else {
      const location = data.location.trim().toLowerCase();

      if (location.length < 2) errors.push('Location too short');
      if (location.length > 200) errors.push('Location too long');

      // Check for valid location (or at least reasonable format)
      if (!/^[a-zA-Z\s,]+$/.test(location)) {
        errors.push('Location contains invalid characters');
      }

      validated.location = location.replace(/\s+/g, ' ');
    }

    // Contact validation (optional)
    if (data.contact) {
      const contact = data.contact.trim();

      // Check format (phone or email)
      const isPhone = /^[\d\s+\-()]{6,}$/.test(contact);
      const isEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(contact);

      if (!isPhone && !isEmail) {
        errors.push('Contact must be valid phone or email');
      }

      validated.contact = contact;
    } else {
      validated.contact = null;
    }

    // Keywords validation (optional but must be clean)
    if (data.keywords && Array.isArray(data.keywords)) {
      try {
        validated.keywords = this.validateAndCleanKeywords(data.keywords);
      } catch (err) {
        errors.push(`Keywords error: ${err.message}`);
      }
    } else {
      validated.keywords = [];
    }

    if (errors.length > 0) {
      throw new Error(`Business validation failed:\n${errors.join('\n')}`);
    }

    return validated;
  }

  /**
   * Validate and clean Client input
   */
  static validateClient(data) {
    const errors = [];
    const validated = {};

    // Name validation
    if (!data.name || !data.name.trim()) {
      errors.push('Client name is required');
    } else {
      const name = data.name.trim();

      if (name.length < 2) errors.push('Name must be at least 2 characters');
      if (name.length > 100) errors.push('Name cannot exceed 100 characters');

      // Check for gibberish (no repeated chars, reasonable pattern)
      if (/(.)\1{3,}/.test(name)) errors.push('Invalid name format');
      if (!/^[a-zA-Z\s'-]+$/.test(name)) errors.push('Name contains invalid characters');

      validated.name = name.replace(/\s+/g, ' ');
    }

    // Email validation
    if (!data.email || !data.email.trim()) {
      errors.push('Email is required');
    } else {
      const email = data.email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      }

      // Check for disposable/temporary email services only
      // Allow personal emails (gmail, yahoo, outlook, etc.) and company emails
      const disposableDomains = [
        'tempmail', '10minutemail', 'guerrillamail', 'mailinator',
        'temp-mail', 'throwaway', 'trashmail', 'yopmail', 'sharklasers'
      ];
      if (disposableDomains.some(d => email.includes(d))) {
        errors.push('Temporary email addresses are not allowed. Please use a personal or company email');
      }

      validated.email = email;
    }

    // Phone validation (optional)
    if (data.phone) {
      const phone = data.phone.trim();

      // Allow only digits, +, -, (), spaces
      if (!/^[\d\s+\-()]{6,}$/.test(phone)) {
        errors.push('Invalid phone format');
      }

      // Extract digits and check length (should be 7-15 digits)
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        errors.push('Phone number should be 7-15 digits');
      }

      validated.phone = phone.replace(/\s+/g, '');
    } else {
      validated.phone = null;
    }

    // Location validation (optional)
    if (data.location) {
      const location = data.location.trim();

      if (location.length > 200) {
        errors.push('Location is too long');
      }

      validated.location = location.replace(/\s+/g, ' ');
    } else {
      validated.location = null;
    }

    if (errors.length > 0) {
      throw new Error(`Client validation failed:\n${errors.join('\n')}`);
    }

    return validated;
  }

  /**
   * Validate and clean keywords
   * - Remove duplicates
   * - Remove spam
   * - Check length
   * - Normalize format
   */
  static validateAndCleanKeywords(keywords) {
    if (!Array.isArray(keywords)) {
      throw new Error('Keywords must be an array');
    }

    const errors = [];
    const cleaned = new Set();

    keywords.forEach((keyword, index) => {
      // Type check
      if (typeof keyword !== 'string') {
        errors.push(`Keyword ${index} is not a string`);
        return;
      }

      const clean = keyword.trim().toLowerCase();

      // Empty check
      if (!clean) return;

      // Length check (2-100 chars)
      if (clean.length < 2) {
        errors.push(`Keyword "${keyword}" is too short (min 2 chars)`);
        return;
      }
      if (clean.length > 100) {
        errors.push(`Keyword "${keyword}" is too long (max 100 chars)`);
        return;
      }

      // Check for spam keywords
      if (this.SPAM_KEYWORDS.some(spam => clean.includes(spam))) {
        errors.push(`Keyword "${keyword}" contains blacklisted term`);
        return;
      }

      // Check for gibberish (repeated chars)
      if (/(.)\1{3,}/.test(clean)) {
        errors.push(`Keyword "${keyword}" appears invalid`);
        return;
      }

      // Check for special char spam
      if (/[!@#$%^&*()_+=\[\]{};':"\\|,.<>?/]{3,}/.test(clean)) {
        errors.push(`Keyword "${keyword}" contains too many special characters`);
        return;
      }

      // Allow only alphanumeric, spaces, hyphens, ampersands
      if (!/^[a-z0-9\s&'()-]+$/.test(clean)) {
        errors.push(`Keyword "${keyword}" contains invalid characters`);
        return;
      }

      // Add to cleaned set (removes duplicates automatically)
      cleaned.add(clean);
    });

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    // Max 50 keywords
    if (cleaned.size > 50) {
      throw new Error(`Too many keywords (max 50, got ${cleaned.size})`);
    }

    return Array.from(cleaned).sort();
  }

}

export default InputValidator;
