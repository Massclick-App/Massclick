import React from 'react';
import { TextField } from '@mui/material';
import { muiTextFieldSx } from './formFieldConfig';

/**
 * Unified FormField component that wraps MUI TextField
 * Ensures consistent styling across all admin pages
 *
 * @param {string} label - Field label
 * @param {string} name - Field name
 * @param {string} value - Field value
 * @param {function} onChange - Change handler
 * @param {string} type - Input type (text, email, password, number, etc.)
 * @param {boolean} required - Is field required
 * @param {boolean} disabled - Is field disabled
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error state (true/false or error message)
 * @param {string} helperText - Helper text below field
 * @param {object} sx - Additional MUI sx prop for customization
 * @param {object} rest - Any other MUI TextField props
 */
const FormField = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  placeholder = '',
  error = false,
  helperText = '',
  sx = {},
  ...rest
}) => {
  return (
    <TextField
      fullWidth
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      error={Boolean(error)}
      helperText={helperText}
      variant="outlined"
      size="medium"
      sx={{ ...muiTextFieldSx, ...sx }}
      {...rest}
    />
  );
};

export default FormField;
