import React, { useEffect, useRef } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useSelector, useDispatch } from "react-redux";
import { getAllBusinessList, toggleBusinessStatus, trackQrDownload } from "../redux/actions/businessListAction";
import { useSnackbar } from 'notistack';
import { getAllLocation } from "../redux/actions/locationAction";
import { getAllUsers } from "../redux/actions/userAction.js";
import { Payment as PaymentIcon, CheckCircle, HourglassEmpty, Cancel } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import IconButton from '@mui/material/IconButton';
import {
  Avatar,
  Paper,
  Typography,
} from "@mui/material";

import AdminAnalyticsPanel from './adminAnalytics/AdminAnalyticsPanel.js';
import BusinessCard from './businessCard/businessCard.js';
import CustomizedTable from './Table/CustomizedTable.js';
import { createPhonePePayment } from '../redux/actions/phonePayAction.js';

export default function MainGrid() {
  const { enqueueSnackbar } = useSnackbar();
  const { users = [] } = useSelector((state) => state.userReducer || {});
  const { businessList = [], total = 0 } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const [cardFilter, setCardFilter] = React.useState({ type: "all", label: "Total Businesses" });
  const [tableRefreshKey, setTableRefreshKey] = React.useState(0);
  const tableSectionRef = useRef(null);
  const [activeStatus, setActiveStatus] = React.useState(
    businessList.reduce((acc, b) => {
      acc[b._id] = b.isActive;
      return acc;
    }, {})
  );

  const dispatch = useDispatch();

  const getObjectId = (value) => {
    if (!value) return "";
    if (typeof value === "object") return value.$oid || value._id || value.id || "";
    return String(value);
  };

  const getUserDisplayName = (user) =>
    user?.userName || user?.name || user?.fullName || user?.emailId || user?.email || "";

  const getCreatedByDisplayName = (createdBy) => {
    if (!createdBy) return "—";

    if (typeof createdBy === "object") {
      const populatedName = getUserDisplayName(createdBy);
      if (populatedName) return populatedName;
    }

    const createdById = getObjectId(createdBy);
    const user = users.find((u) => getObjectId(u._id) === createdById);

    return getUserDisplayName(user) || "—";
  };

  const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return {
      createdFrom: start.toISOString(),
      createdTo: end.toISOString(),
    };
  };

  const getMonthRange = (monthIndex, year = new Date().getFullYear()) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return {
      createdFrom: start.toISOString(),
      createdTo: end.toISOString(),
    };
  };

  const getCardFilterParams = (filter = cardFilter) => {
    if (filter.type === "active") return { status: "active" };
    if (filter.type === "inactive") return { status: "inactive" };
    if (filter.type === "live") return { liveStatus: "live" };
    if (filter.type === "pendingLive") return { liveStatus: "pending" };
    if (filter.type === "today") return getTodayRange();
    if (filter.type === "month" && Number.isInteger(filter.monthIndex)) return getMonthRange(filter.monthIndex, filter.year);
    if (filter.type === "category" && filter.value) return { category: filter.value };
    if (filter.type === "location" && filter.value) return { location: filter.value };
    if (filter.type === "payment" && filter.value) return { paymentStatus: filter.value };
    if (filter.type === "search" && filter.value) return { search: filter.value };
    return {};
  };

  const handleCardFilter = (filter) => {
    const nextFilter = filter || { type: "all", label: "Total Businesses" };
    setCardFilter(nextFilter);
    setTableRefreshKey(prev => prev + 1);
    window.requestAnimationFrame(() => {
      tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    dispatch(getAllBusinessList());
    dispatch(getAllLocation());
    dispatch(getAllUsers({ pageNo: 1, pageSize: 1000 }));
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
    activeBusinesses: bl.activeBusinesses ?? bl.isActive ?? false,
    createdAt: bl.createdAt || null,
    createdBy: bl.createdBy,
    payment: bl.payment || [],

    qrImage: bl.qrCode?.qrImage || null,
    qrText: bl.qrCode?.qrText || "",
    qrDownloads: bl.qrDownloads || [],

  }));

  const handlePayNow = (row) => {
    const amount = 1;

    const businessId = row?._id?.$oid || row?._id || row?.businessId || row?.id;

    const userId =
      row?.createdBy?.$oid ||
      (typeof row?.createdBy === "string" ? row.createdBy : null);

    if (!businessId || !userId) {
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
      renderCell: (value) => getCreatedByDisplayName(value),
    },
    {
      id: "qrCode",
      label: "Review QR",
      renderCell: (_, row) => {
        if (!row.qrImage) return "—";

        const handleDownload = async () => {
          try {
            const link = document.createElement("a");
            link.href = row.qrImage;
            link.target = "_blank";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            await dispatch(trackQrDownload(row._id));

            enqueueSnackbar("QR downloaded successfully", {
              variant: "success",
            });

          } catch (err) {
            enqueueSnackbar("Download failed", {
              variant: "error",
            });
          }
        };

        const lastDownload =
          row.qrDownloads?.length > 0
            ? new Date(
              row.qrDownloads[row.qrDownloads.length - 1].downloadedAt
            ).toLocaleString()
            : "Not Downloaded";

        return (
          <Box sx={{ textAlign: "center" }}>
            <Avatar
              src={row.qrImage}
              sx={{ width: 60, height: 60, margin: "0 auto" }}
            />

            <div style={{ fontSize: "12px", marginTop: "5px" }}>
              Last: {lastDownload}
            </div>

            <Button
              size="small"
              variant="contained"
              sx={{ mt: 1 }}
              onClick={handleDownload}
            >
              Download
            </Button>
          </Box>
        );
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

  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          mt: 2,
          mb: 2,
          p: 2,
          border: '1px solid #e5e9f0',
          borderRadius: 2,
          bgcolor: '#fff',
        }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#172033', mb: 1.5 }}>
          Business drill-down
        </Typography>
        <BusinessCard activeFilter={cardFilter.type} onCardClick={handleCardFilter} />
      </Paper>
      <AdminAnalyticsPanel activeFilter={cardFilter} onFilterClick={handleCardFilter} />


      <Grid elevation={3} sx={{ p: 3, borderRadius: 2 }} ref={tableSectionRef}>
        {cardFilter.type !== "all" && (
          <Box sx={{
            mb: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.75,
            borderRadius: 20,
            bgcolor: "#fff3e0",
            color: "#d97800",
            fontSize: "0.85rem",
            fontWeight: 700
          }}>
            Showing {cardFilter.label}
            <Button
              size="small"
              onClick={() => handleCardFilter({ type: "all", label: "Total Businesses" })}
              sx={{ minWidth: "auto", color: "#d97800", textTransform: "none", p: 0.25 }}
            >
              Clear
            </Button>
          </Box>
        )}
        <Box sx={{ width: "100%" }}>
          <CustomizedTable
            key={tableRefreshKey}
            data={rows}
            total={total}
            columns={businessListTable}
            fetchData={(pageNo, pageSize, options = {}) => {
              const cardParams = getCardFilterParams();
              dispatch(
                getAllBusinessList({
                  pageNo,
                  pageSize,
                  liveStatus: cardParams.liveStatus || "",
                  status: cardParams.status || options.status || "all",
                  category: cardParams.category || "",
                  location: cardParams.location || "",
                  paymentStatus: cardParams.paymentStatus || "",
                  search: cardParams.search || options.search || "",
                  createdFrom: cardParams.createdFrom || "",
                  createdTo: cardParams.createdTo || "",
                  sortBy: options.sortBy || null,
                  sortOrder: options.sortOrder || "asc",
                })
              );
            }}
          />

        </Box>
      </Grid>
    </Box>
  );
}
