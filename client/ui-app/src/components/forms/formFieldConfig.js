/**
 * Centralized Material-UI field configuration
 * Modern minimalist design with light gray backgrounds and indigo focus
 * Inspired by contemporary UI patterns (Uiverse.io)
 */

export const muiTextFieldSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: '45px',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    transition: 'all 0.5s ease',
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 14px !important',
    fontSize: '1rem',
    height: '45px',
    color: '#0d0c22',
  },
  '& .MuiOutlinedInput-input::placeholder': {
    color: '#94a3b8',
    opacity: 1,
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 140, 0, 0.5)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FF8C00',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 5px rgba(255, 140, 0, 0.3)',
  },
  '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
    borderColor: '#ef4444',
  },
  '& .MuiOutlinedInput-root.Mui-error': {
    backgroundColor: '#fef2f2',
  },
  '& .MuiOutlinedInput-root.Mui-disabled': {
    backgroundColor: '#f1f5f9',
  },
  '& .MuiOutlinedInput-input.Mui-disabled': {
    color: '#94a3b8',
  },
};

export const muiSelectSx = {
  width: '100%',
  '& .MuiOutlinedInput-root': {
    height: '45px',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    transition: 'all 0.5s ease',
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 14px !important',
    fontSize: '1rem',
    height: '45px',
    color: '#0d0c22',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 140, 0, 0.5)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FF8C00',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 5px rgba(255, 140, 0, 0.3)',
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
    height: '45px',
    borderRadius: '10px',
    backgroundColor: '#f8fafc',
    transition: 'all 0.5s ease',
  },
  '& .MuiOutlinedInput-input': {
    padding: '12px 14px !important',
    fontSize: '1rem',
    height: '45px',
    color: '#0d0c22',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'transparent',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 140, 0, 0.5)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#FF8C00',
    borderWidth: '2px',
  },
  '& .MuiOutlinedInput-root.Mui-focused': {
    backgroundColor: '#ffffff',
    boxShadow: '0 0 0 5px rgba(255, 140, 0, 0.3)',
  },
  '& .MuiAutocomplete-popper': {
    borderRadius: '10px',
  },
  '& .MuiAutocomplete-paper': {
    borderRadius: '10px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    maxHeight: '300px',
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
