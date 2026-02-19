import React, { useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import  Button  from '@mui/material/Button';

import { useSelector, useDispatch } from "react-redux";
import { getAllBusinessList, toggleBusinessStatus } from "../redux/actions/businessListAction"; // your thunk/action
import { useSnackbar } from 'notistack';
import { getAllLocation } from "../redux/actions/locationAction";
import { getAllUsers } from "../redux/actions/userAction.js";
import { Payment as PaymentIcon, CheckCircle, HourglassEmpty, Cancel } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import IconButton from '@mui/material/IconButton';
import {
  Avatar,

} from "@mui/material";

import BusinessCard from './businessCard/businessCard.js';
import ChartUserByBusiness from '../components/homePageChart/ChartUserByCountry.js';
import CustomizedTable from './Table/CustomizedTable.js';
import { createPhonePePayment } from '../redux/actions/phonePayAction.js';

export default function MainGrid() {
  const { enqueueSnackbar } = useSnackbar();
  const { users = [] } = useSelector((state) => state.userReducer || {});
  const { businessList = [], total = 0 } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const [activeStatus, setActiveStatus] = React.useState(
    businessList.reduce((acc, b) => {
      acc[b._id] = b.isActive;
      return acc;
    }, {})
  );

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getAllBusinessList());
    dispatch(getAllLocation());
    dispatch(getAllUsers());
  }, [dispatch]);

  const rows = businessList.map((bl) => ({
    _id: bl._id,
    id: bl._id,
    clientId: bl.clientId || "-",
    businessName: bl.businessName || "-",
    plotNumber: bl.plotNumber || "-",
    street: bl.street || "-",
    pincode: bl.pincode || "-",
    email: bl.email || "-",
    contact: bl.contact || "-",
    contactList: bl.contactList || "-",
    gstin: bl.gstin || "-",
    whatsappNumber: bl.whatsappNumber || "-",
    experience: bl.experience || "-",
    location: bl.location || "-",
    category: bl.category || "-",
    bannerImage: bl.bannerImage || null,
    googleMap: bl.googleMap || "-",
    website: bl.website || "-",
    facebook: bl.facebook || "-",
    instagram: bl.instagram || "-",
    youtube: bl.youtube || "-",
    pinterest: bl.pinterest || "-",
    twitter: bl.twitter || "-",
    linkedin: bl.linkedin || "-",
    businessDetails: bl.businessDetails || "-",
    activeBusinesses: bl.activeBusinesses,
    createdBy: bl.createdBy,
    payment: bl.payment || [],

  }));

  const handlePayNow = (row) => {
    const amount = 1;

    const businessId = row?._id?.$oid || row?._id || row?.businessId || row?.id;

    const userId =
      row?.createdBy?.$oid ||
      (typeof row?.createdBy === "string" ? row.createdBy : null);

    if (!businessId || !userId) {
      console.error("Missing businessId or userId:", { businessId, userId });
      return;
    }
    dispatch(createPhonePePayment(amount, userId, businessId));
  };

  const businessListTable = [
    { id: "clientId", label: "Client ID" },
    {
      id: "bannerImage",
      label: "Banner Image",
      renderCell: (value) => (value ? <Avatar src={value} alt="img" /> : "-"),
    },
    { id: "businessName", label: "Business Name" },
    { id: "location", label: "Location Name" },
    { id: "category", label: "Category" },
    {
      id: "createdBy",
      label: "Created By",
      renderCell: (value) => {
        if (!value) return "—";

        const createdById =
          typeof value === "object" && value.$oid ? value.$oid : value;
        const user = users.find((u) => {
          const userId =
            typeof u._id === "object" && u._id.$oid ? u._id.$oid : u._id;
          return userId === createdById;
        });

        return user ? user.userName : "—";
      },
    },
    {
      id: "payment",
      label: "Payment",
      renderCell: (value, row) => {
        const paymentArray = Array.isArray(value) ? value : [];
        const lastPayment = paymentArray[paymentArray.length - 1];
        const status = lastPayment?.paymentStatus?.toLowerCase() || "pending";

        let icon = <PaymentIcon />;
        let color = "warning";
        let isDisabled = false;
        let tooltipText = "Click to make a payment";

        if (status === "paid") {
          icon = <CheckCircle />;
          color = "success";
          isDisabled = true;
          tooltipText = "✅ Payment received — thank you for your purchase!";
        } else if (status === "failed") {
          icon = <Cancel />;
          color = "error";
          tooltipText = "❌ Payment failed — please try again.";
        } else if (status === "pending") {
          icon = <HourglassEmpty />;
          color = "warning";
          tooltipText = "⏳ Payment is pending — complete the process.";
        }

        return (
          <Tooltip title={tooltipText} arrow>
            <span>
              <IconButton
                color={color}
                onClick={!isDisabled ? () => handlePayNow(row) : undefined}
                disabled={isDisabled}
                sx={{
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: !isDisabled ? "scale(1.1)" : "none" },
                }}
              >
                {icon}
              </IconButton>
            </span>
          </Tooltip>
        );
      },
    },
    {
      id: "isActive",
      label: "Status",
      renderCell: (_, row) => {
        const isActive = activeStatus[row._id] ?? row.activeBusinesses;
        const businessName = row.businessName;

        const handleClick = async () => {
          const newStatus = !isActive;
          setActiveStatus((prev) => ({ ...prev, [row._id]: newStatus }));

          try {
            await dispatch(toggleBusinessStatus({ id: row._id, newStatus }));
            enqueueSnackbar(
              `${businessName} is now ${newStatus ? "Active" : "Inactive"}!`,
              { variant: newStatus ? "success" : "error" }
            );
          } catch (err) {
            setActiveStatus((prev) => ({ ...prev, [row._id]: isActive }));
            enqueueSnackbar("Failed to update status.", { variant: "error" });
          }
        };

        return (
          <Button
            onClick={handleClick}
            sx={{
              minWidth: 80,
              px: 1.5,
              py: 0.5,
              borderRadius: 20,
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "#fff",
              textTransform: "none",
              background: isActive
                ? "linear-gradient(135deg, #4caf50, #388e3c)"
                : "linear-gradient(135deg, #ef5350, #c62828)",
              '&:hover': {
                background: isActive
                  ? "linear-gradient(135deg, #66bb6a, #2e7d32)"
                  : "linear-gradient(135deg, #ef5350, #b71c1c)",
              },
            }}
          >
            {isActive ? "Active" : "Inactive"}
          </Button>
        );
      },
    },
  ];


  const fetchData = (pageNumber = 1, pageSizeParam = 10, options = {}) => {
    dispatch(getAllBusinessList({
      pageNo: pageNumber,
      pageSize: pageSizeParam,
      search: options.search || "",
      status: options.status || "all",
      sortBy: options.sortBy || "createdAt",
      sortOrder: options.sortOrder || "desc",
    }));
  };

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Grid container spacing={2} columns={12} sx={{ mb: 2 }}>
        <Grid xs={12} md={6}>
          <BusinessCard />
        </Grid>
      </Grid>
      <Grid container spacing={2} columns={12} sx={{ mb: 2 }}>
        <Grid item xs={12} md={12}>
          <ChartUserByBusiness />
        </Grid>
      </Grid><br />
      <Grid elevation={3} sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ width: "100%" }}>
           <CustomizedTable
            data={rows}
            total={total}
            columns={businessListTable}
            fetchData={fetchData}
            onSelectRows={(ids) => console.log("selected ids:", ids)}
          />     
            </Box>
      </Grid>
    </Box>
  );
}
