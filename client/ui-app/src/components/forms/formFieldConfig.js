/**
 * Centralized Material-UI field configuration
 * Provides consistent sx objects for TextField, Select, and Autocomplete
 */

export const muiTextFieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease-in-out',
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 14px',
    fontSize: '1rem',
    height: 'auto',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
    borderWidth: '1px',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#d1d5db',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FF8C00',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    boxShadow: '0 0 0 3px rgba(255, 140, 0, 0.15)',
  },
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ef4444',
    borderWidth: '1px',
  },
  '& .MuiOutlinedInput-root.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ef4444',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-error': {
    backgroundColor: '#fef2f2',
  },
  '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: '#f3f4f6',
  },
  '& .MuiOutlinedInput-root.Mui-disabled': {
    backgroundColor: '#f9fafb',
  },
  '& .MuiOutlinedInput-input.Mui-disabled': {
    color: '#9ca3af',
  },
  '& .MuiOutlinedInput-input::placeholder': {
    color: '#9ca3af',
    opacity: 1,
  },
  '& .MuiFormLabel-root': {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '6px',
    fontWeight: 600,
    transform: 'none',
    position: 'relative',
  },
  '& .MuiFormLabel-root.Mui-focused': {
    color: '#6b7280',
  },
  '& .MuiFormLabel-root.Mui-error': {
    color: '#ef4444',
  },
  '& .MuiFormHelperText-root': {
    marginTop: '4px',
    marginLeft: '0',
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  '& .MuiFormHelperText-root.Mui-error': {
    color: '#ef4444',
    fontWeight: 500,
  },
};

export const muiSelectSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease-in-out',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
    borderWidth: '1px',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#d1d5db',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FF8C00',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    boxShadow: '0 0 0 3px rgba(255, 140, 0, 0.15)',
  },
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ef4444',
  },
  '& .MuiOutlinedInput-root.Mui-error': {
    backgroundColor: '#fef2f2',
  },
  '& .MuiOutlinedInput-root.Mui-disabled': {
    backgroundColor: '#f9fafb',
  },
};

export const muiAutocompleteSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease-in-out',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
    borderWidth: '1px',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: '#d1d5db',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FF8C00',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    boxShadow: '0 0 0 3px rgba(255, 140, 0, 0.15)',
  },
  '& .MuiAutocomplete-popper': {
    borderRadius: '8px',
  },
  '& .MuiAutocomplete-paper': {
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
  },
  '& .MuiAutocomplete-listbox': {
    padding: '4px 0',
  },
  '& .MuiAutocomplete-option': {
    padding: '8px 12px',
    fontSize: '0.95rem',
  },
  '& [data-option-index][role="option"]': {
    minHeight: 'auto',
    padding: '8px 12px',
  },
  '& .MuiChip-root': {
    backgroundColor: '#FFF3E0',
    borderRadius: '6px',
    margin: '2px 4px',
  },
  '& .MuiChip-label': {
    color: '#FF8C00',
    fontWeight: 500,
  },
  '& .MuiChip-deleteIcon': {
    color: '#FF8C00',
  },
  '& .MuiChip-deleteIcon:hover': {
    color: '#D97800',
  },
};
