import React from 'react';
import { Autocomplete, TextField, FormHelperText, FormControl } from '@mui/material';
import { muiAutocompleteSx, muiTextFieldSx } from './formFieldConfig';

/**
 * Unified FormAutocomplete component that wraps MUI Autocomplete
 * Ensures consistent styling across all admin pages
 *
 * @param {string} label - Field label
 * @param {string} name - Field name
 * @param {any} value - Selected value(s)
 * @param {function} onChange - Change handler (receives value)
 * @param {array} options - Array of options OR {label, value} objects
 * @param {boolean} multiple - Allow multiple selections
 * @param {boolean} required - Is field required
 * @param {boolean} disabled - Is field disabled
 * @param {boolean} freeSolo - Allow free text input
 * @param {boolean} error - Is field in error state
 * @param {string} helperText - Helper text below field
 * @param {string} placeholder - Placeholder text
 * @param {function} getOptionLabel - Custom function to get option label
 * @param {function} isOptionEqualToValue - Custom function to compare values
 * @param {object} sx - Additional MUI sx prop for customization
 * @param {object} rest - Any other MUI Autocomplete props
 */
const FormAutocomplete = ({
  label,
  name,
  value,
  onChange,
  options = [],
  multiple = false,
  required = false,
  disabled = false,
  freeSolo = false,
  error = false,
  helperText = '',
  placeholder = '',
  getOptionLabel = null,
  isOptionEqualToValue = null,
  sx = {},
  ...rest
}) => {
  // Default getOptionLabel - handle both string and object options
  const defaultGetOptionLabel = (option) => {
    if (typeof option === 'string') return option;
    if (typeof option === 'object' && option.label) return option.label;
    if (typeof option === 'object' && option.name) return option.name;
    return String(option);
  };

  // Default isOptionEqualToValue
  const defaultIsOptionEqualToValue = (option, val) => {
    if (typeof option === 'string') return option === val;
    if (typeof option === 'object') {
      return option.value === val?.value || option._id === val?._id || option === val;
    }
    return option === val;
  };

  return (
    <FormControl fullWidth error={Boolean(error)}>
      <Autocomplete
        name={name}
        value={value}
        onChange={(e, newValue) => onChange(newValue)}
        options={options}
        multiple={multiple}
        disabled={disabled}
        freeSolo={freeSolo}
        getOptionLabel={getOptionLabel || defaultGetOptionLabel}
        isOptionEqualToValue={isOptionEqualToValue || defaultIsOptionEqualToValue}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            required={required}
            error={Boolean(error)}
            variant="outlined"
            sx={muiTextFieldSx}
          />
        )}
        sx={{ ...muiAutocompleteSx, ...sx }}
        {...rest}
      />
      {helperText && <FormHelperText error={Boolean(error)}>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default FormAutocomplete;
