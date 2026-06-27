import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { muiSelectSx } from './formFieldConfig';

/**
 * Unified FormSelect component that wraps MUI Select
 * Ensures consistent styling across all admin pages
 *
 * @param {string} label - Field label
 * @param {string} name - Field name
 * @param {string|number} value - Selected value
 * @param {function} onChange - Change handler
 * @param {array} options - Array of {value, label} objects OR strings
 * @param {boolean} required - Is field required
 * @param {boolean} disabled - Is field disabled
 * @param {boolean} error - Is field in error state
 * @param {string} helperText - Helper text below field
 * @param {object} sx - Additional MUI sx prop for customization
 * @param {object} rest - Any other MUI Select props
 */
const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  sx = {},
  hideLabel = false,
  ...rest
}) => {
  // Handle both string options and {value, label} object options
  const menuItems = options.map((option) => {
    if (typeof option === 'string') {
      return (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      );
    }
    return (
      <MenuItem key={option.value} value={option.value}>
        {option.label || option.value}
      </MenuItem>
    );
  });

  return (
    <FormControl fullWidth error={Boolean(error)}>
      {!hideLabel && <InputLabel required={required}>{label}</InputLabel>}
      <Select
        name={name}
        value={value}
        onChange={onChange}
        label={hideLabel ? undefined : label}
        disabled={disabled}
        required={required}
        sx={{ ...muiSelectSx, ...sx }}
        {...rest}
      >
        {menuItems}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default FormSelect;
