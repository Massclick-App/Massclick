/**
 * Input Validation Middleware
 * Validates request bodies using InputValidator class
 * Applied to all routes that accept form data (categories, businesses, clients)
 */

import InputValidator from '../helper/validators/inputValidator.js';

/**
 * Parse validation error message into structured field errors
 * @param {string} errorMessage - Error message from InputValidator
 * @returns {Array} Array of {field, message} objects
 */
const parseFieldErrors = (errorMessage) => {
  const errors = [];

  // Split multi-line error messages
  const lines = errorMessage.split('\n').filter(line => line.trim());

  lines.forEach(line => {
    // Remove common prefixes
    let message = line
      .replace(/^(Category validation failed:|Business validation failed:|Client validation failed:)/, '')
      .trim();

    if (!message) return;

    // Try to extract field name from message
    let field = '';

    if (message.includes('Category name')) field = 'name';
    else if (message.includes('business name')) field = 'businessName';
    else if (message.includes('Category is required')) field = 'category';
    else if (message.includes('Location')) field = 'location';
    else if (message.includes('Contact')) field = 'contact';
    else if (message.includes('keywords')) field = 'keywords';
    else if (message.includes('Email')) field = 'email';
    else if (message.includes('Phone')) field = 'phone';
    else if (message.includes('name')) field = 'name';
    else if (message.includes('Description')) field = 'description';

    errors.push({
      field: field || 'general',
      message: message
    });
  });

  return errors;
};

/**
 * Middleware: Validate category input
 * Applies: name, description, keywords validation
 */
export const validateCategory = (req, res, next) => {
  try {
    // For categories, we may have a 'category' field or 'name' field
    const categoryData = {
      name: req.body.category || req.body.name || '',
      description: req.body.description || '',
      keywords: req.body.keywords || []
    };

    req.validatedBody = InputValidator.validateCategory(categoryData);
    // Preserve original category field name
    req.validatedBody.category = categoryData.name;
    next();
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: 'Validation failed',
      errors: parseFieldErrors(error.message)
    });
  }
};

/**
 * Middleware: Validate business input
 * Applies: businessName, category, location, contact, keywords validation
 */
export const validateBusiness = (req, res, next) => {
  try {
    const businessData = {
      businessName: req.body.businessName || '',
      category: req.body.category || '',
      location: req.body.location || '',
      contact: req.body.contact || '',
      keywords: req.body.keywords || []
    };

    req.validatedBody = InputValidator.validateBusiness(businessData);
    next();
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: 'Validation failed',
      errors: parseFieldErrors(error.message)
    });
  }
};

/**
 * Middleware: Validate client input
 * Applies: name, email, phone, location validation
 */
export const validateClient = (req, res, next) => {
  try {
    const clientData = {
      name: req.body.name || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      location: req.body.location || ''
    };

    req.validatedBody = InputValidator.validateClient(clientData);
    next();
  } catch (error) {
    return res.status(400).json({
      status: false,
      message: 'Validation failed',
      errors: parseFieldErrors(error.message)
    });
  }
};

/**
 * Middleware: Validate keywords array
 * Useful as a standalone middleware for APIs that handle keywords separately
 */
export const validateKeywords = (fieldName = 'keywords') => {
  return (req, res, next) => {
    try {
      const keywords = req.body[fieldName] || [];

      req.validatedKeywords = InputValidator.validateAndCleanKeywords(keywords);
      next();
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: 'Keyword validation failed',
        errors: parseFieldErrors(error.message)
      });
    }
  };
};

export default {
  validateCategory,
  validateBusiness,
  validateClient,
  validateKeywords,
  parseFieldErrors
};
