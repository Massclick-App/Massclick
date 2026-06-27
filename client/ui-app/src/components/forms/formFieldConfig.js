/**
 * Centralized Material-UI field configuration
 * Provides consistent sx objects for TextField, Select, and Autocomplete
 * Optimized for compact, modern design matching original specifications
 */

export const muiTextFieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: '52px',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease-in-out',
  },
  '& .MuiOutlinedInput-input': {
    padding: '16px 14px !important',
    fontSize: '1rem',
    height: '52px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
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
};

export const muiSelectSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: '52px',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease-in-out',
  },
  '& .MuiOutlinedInput-input': {
    padding: '16px 14px !important',
    fontSize: '1rem',
    height: '52px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
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
};

export const muiAutocompleteSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: '52px',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease-in-out',
  },
  '& .MuiOutlinedInput-input': {
    padding: '16px 14px !important',
    fontSize: '1rem',
    height: '52px',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: '#e5e7eb',
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
  '& .MuiChip-root': {
    backgroundColor: '#FFF3E0',
    borderRadius: '6px',
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
