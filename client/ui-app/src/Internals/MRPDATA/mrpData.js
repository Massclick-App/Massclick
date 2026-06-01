import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllMRP } from '../../redux/actions/mrpAction';
import CustomizedTable from '../../components/Table/CustomizedTable.js';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import './mrpData.css';

export default function MRPDatas() {
  const dispatch = useDispatch();

  const {
    mrpList = [],
    total = 0,
  } = useSelector(state => state.mrp || {});

  const [selectedItem, setSelectedItem] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);

  const handleFetchData = useCallback((pageNo, pageSize, options) => {
    dispatch(getAllMRP({
      pageNo,
      pageSize,
      search: options.search,
      status: options.status,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
    }));
  }, [dispatch]);

  const handleRowClick = (row) => {
    setSelectedItem(row);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  const columns = [
    {
      id: 'description',
      label: 'Description',
      renderCell: (value, row) => (
        <Typography
          sx={{ cursor: 'pointer', fontWeight: 500, color: '#1f2937' }}
          onClick={() => handleRowClick(row)}
        >
          {value}
        </Typography>
      ),
    },
    {
      id: 'categoryId',
      label: 'Category',
      renderCell: (value) => (
        <Box
          sx={{
            display: 'inline-block',
            backgroundColor: '#fed7aa',
            color: '#92400e',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          {value}
        </Box>
      ),
    },
    {
      id: 'location',
      label: 'Location',
    },
    {
      id: 'createdAt',
      label: 'Date',
      renderCell: (value) => new Date(value).toLocaleDateString(),
    },
    {
      id: 'contactDetails',
      label: 'Contact',
    },
    {
      id: 'status',
      label: 'Status',
      renderCell: () => (
        <Box
          sx={{
            display: 'inline-block',
            backgroundColor: '#d1fae5',
            color: '#065f46',
            padding: '4px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          Active
        </Box>
      ),
    },
    {
      id: 'action',
      label: 'Action',
      renderCell: (_, row) => (
        <Button
          variant="contained"
          size="small"
          onClick={() => handleRowClick(row)}
          sx={{
            backgroundColor: '#ff7a00',
            '&:hover': { backgroundColor: '#e56a00' },
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <>
      <CustomizedTable
        title="MNI Responses"
        columns={columns}
        data={mrpList}
        total={total}
        fetchData={handleFetchData}
        enableSearch={true}
        enableStatusFilter={false}
      />

      {/* Details Modal */}
      <Dialog
        open={openDetails}
        onClose={handleCloseDetails}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '18px',
            fontWeight: 700,
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          Business Details
          <CloseIcon
            onClick={handleCloseDetails}
            sx={{ cursor: 'pointer', fontSize: '20px' }}
          />
        </DialogTitle>

        <DialogContent sx={{ paddingTop: '24px' }}>
          {selectedItem?.businessSnapshot && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 600 }}>
                  Business Name
                </Typography>
                <Typography sx={{ color: '#1f2937', fontWeight: 500, marginTop: '4px' }}>
                  {selectedItem.businessSnapshot.businessName}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 600 }}>
                  Category
                </Typography>
                <Typography sx={{ color: '#1f2937', fontWeight: 500, marginTop: '4px' }}>
                  {selectedItem.businessSnapshot.category}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 600 }}>
                  Location
                </Typography>
                <Typography sx={{ color: '#1f2937', fontWeight: 500, marginTop: '4px' }}>
                  {selectedItem.businessSnapshot.location}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 600 }}>
                  Contact
                </Typography>
                <Typography sx={{ color: '#1f2937', fontWeight: 500, marginTop: '4px' }}>
                  {selectedItem.businessSnapshot.contact}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ color: '#6b7280', fontWeight: 600 }}>
                  Email
                </Typography>
                <Typography sx={{ color: '#1f2937', fontWeight: 500, marginTop: '4px' }}>
                  {selectedItem.businessSnapshot.email}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={handleCloseDetails} variant="contained" fullWidth>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
