import React, { useState } from 'react';
import dayjs from 'dayjs';
import { TextField } from '@mui/material';
import Button from '@mui/material/Button';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

function CustomButtonField({ value, onClick }) {
  const displayValue = value ? value.format('MMM DD, YYYY') : 'Select Date';
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<CalendarTodayRoundedIcon fontSize="small" />}
      onClick={onClick}
      sx={{ minWidth: 'fit-content' }}
    >
      {displayValue}
    </Button>
  );
}

export default function CustomDatePicker() {
  const [value, setValue] = useState(dayjs());
  const [open, setOpen] = useState(false);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={(newValue) => setValue(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            hiddenLabel
            variant="outlined"
            size="small"
            sx={{ display: 'none' }} 
          />
        )}
        components={{
          OpenPickerIcon: () => null, 
        }}
        slots={{
          field: (pickerProps) => (
            <CustomButtonField
              value={pickerProps.value}
              onClick={() => setOpen(true)}
            />
          ),
        }}
        views={['day', 'month', 'year']}
      />
    </LocalizationProvider>
  );
}
