import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useSelector, useDispatch } from "react-redux";
import { getAllBusinessList, toggleBusinessStatus, trackQrDownload } from "state/actions/businessListAction.js";
import { useSnackbar } from 'shared/components/snackbar/SnackbarProvider.js';
import { getAllLocation } from "state/actions/locationAction.js";
import { getAllUsers } from "state/actions/userAction.js";
import { Payment as PaymentIcon, CheckCircle, HourglassEmpty, Cancel } from "@mui/icons-material";
import Tooltip from "@mui/material/Tooltip";
import IconButton from '@mui/material/IconButton';
import {
  Avatar,
  Paper,
  Typography,
} from "@mui/material";

import AdminAnalyticsPanel from 'features/admin/analytics/admin-data-analytics/AdminAnalyticsPanel.js';
import { dashboardDayRange, dashboardMonthRange, dashboardDateKey } from "shared/utils/dashboardDates.js";
import BusinessCard from 'shared/components/business-card/businessCard.js';
import CustomizedTable from 'shared/components/table/CustomizedTable.js';
import { createPhonePePayment } from 'state/actions/phonePayAction.js';
import BusinessDetailsDialog from 'shared/components/business-details/BusinessDetailsDialog.js';

const PREMIUM_MEMBERSHIP_BASE_AMOUNT = 24000;

export default function MainGrid() {
  const { enqueueSnackbar } = useSnackbar();
  const { users = [] } = useSelector((state) => state.userReducer || {});
  const { businessList = [], total = 0 } = useSelector(
    (state) => state.businessListReducer || {}
  );
  const [cardFilter, setCardFilter] = React.useState({ type: "all", label: "Total Businesses" });
  const [tableRefreshKey, setTableRefreshKey] = React.useState(0);
  const [detailRow, setDetailRow] = React.useState(null);
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

  const formatCreatedDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTodayRange = () => {
    const range = dashboardDayRange();
    return { createdFrom: range.dateFrom, createdTo: range.dateTo };
  };

  const getMonthRange = (monthIndex, year = Number(dashboardDateKey().slice(0, 4))) => {
    const range = dashboardMonthRange(year, monthIndex);
    return { createdFrom: range.dateFrom, createdTo: range.dateTo };
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
    if (filter.type === "creator" && filter.value) {
      return {
        createdBy: filter.value,
        ...(filter.createdFrom ? { createdFrom: filter.createdFrom } : {}),
        ...(filter.createdTo ? { createdTo: filter.createdTo } : {}),
      };
    }
    if (filter.type === "dayLocation") {
      return {
        createdFrom: filter.createdFrom,
        createdTo: filter.createdTo,
        ...(filter.location ? { location: filter.location } : {}),
      };
    }
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
    dispatch(getAllLocation());
    dispatch(getAllUsers({ pageNo: 1, pageSize: 1000 }));
  }, [dispatch]);

  const rows = businessList.map((bl) => ({
    ...bl,
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
    createdByDisplay: getCreatedByDisplayName(bl.createdBy),
    payment: bl.payment || [],

    qrImage: bl.qrCode?.qrImage || null,
    qrText: bl.qrCode?.qrText || "",
    qrDownloads: bl.qrDownloads || [],

  }));

  const handlePayNow = (row) => {
    const amount = PREMIUM_MEMBERSHIP_BASE_AMOUNT;

    const businessId = row?._id?.$oid || row?._id || row?.businessId || row?.id;

    const userId =
      row?.createdBy?.$oid ||
      (typeof row?.createdBy === "string" ? row.createdBy : null);

    if (!businessId || !userId) {
      return;
    }
    dispatch(createPhonePePayment(amount, userId, businessId));
  };

  const handleQrDownload = async (row) => {
    if (!row?.qrImage) return;
    try {
      const link = document.createElement("a");
      link.href = row.qrImage;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await dispatch(trackQrDownload(row._id));
      enqueueSnackbar("QR downloaded successfully", { variant: "success" });
    } catch {
      enqueueSnackbar("Download failed", { variant: "error" });
    }
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
      id: "createdAt",
      label: "Created date & time",
      renderCell: (value) => formatCreatedDateTime(value),
    },
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
    <Box sx={{ width: '100%', minWidth: 0, maxWidth: '1700px', mx: 'auto', pb: 3 }}>
      <AdminAnalyticsPanel
        activeFilter={cardFilter}
        onFilterClick={handleCardFilter}
        businessOverview={
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              mb: 2,
              p: { xs: 1.5, md: 2 },
              border: '1px solid #e9edf3',
              borderRadius: '18px',
              boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 28px rgba(16, 24, 40, 0.05)',
              bgcolor: '#f7f8fa',
        }}
      >
            <Typography component="h2" sx={{ fontSize: 12, fontWeight: 750, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', mb: 0.5 }}>
              Portfolio snapshot · All time
        </Typography>
            <Typography sx={{ color: "#657084", fontSize: 12, mb: 1.5 }}>All accessible businesses, independent of report filters. Today follows India time (IST).</Typography>
            <BusinessCard compact activeFilter={cardFilter.scope ? null : cardFilter.type} onCardClick={handleCardFilter} />
      </Paper>
        }
      />


      <Paper id="business-directory" component="section" elevation={0} sx={{ mt: 3, p: { xs: 1.5, md: 2.5 }, minWidth: 0, border: "1px solid #e9edf3", borderRadius: "18px", boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04), 0 10px 28px rgba(16, 24, 40, 0.05)", scrollMarginTop: 24 }} ref={tableSectionRef}>
        {(cardFilter.type !== "all" || cardFilter.scope) && (
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
            fontWeight: 700,
            transition: "opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}>
            Showing {cardFilter.label}
            <Button
              size="small"
              onClick={() => handleCardFilter({ type: "all", label: "Total Businesses" })}
              sx={{ minWidth: "auto", color: "#d97800", textTransform: "none", p: 0.25, borderRadius: "8px" }}
            >
              Clear
            </Button>
          </Box>
        )}
        <Box sx={{ width: "100%" }}>
          <CustomizedTable
            key={tableRefreshKey}
            title={cardFilter.type === "all" && !cardFilter.scope ? "Business directory" : `Businesses — ${cardFilter.label}`}
            data={rows}
            total={total}
            columns={businessListTable}
            onRowClick={setDetailRow}
            fetchData={(pageNo, pageSize, options = {}) => {
              const cardParams = getCardFilterParams();
              const scope = cardFilter.scope || {};
              const fromDates = [cardParams.createdFrom, scope.createdFrom].filter(Boolean).map((value) => new Date(value).getTime());
              const toDates = [cardParams.createdTo, scope.createdTo].filter(Boolean).map((value) => new Date(value).getTime());
              if (fromDates.length) cardParams.createdFrom = new Date(Math.max(...fromDates)).toISOString();
              if (toDates.length) cardParams.createdTo = new Date(Math.min(...toDates)).toISOString();
              cardParams.createdBy = cardParams.createdBy || scope.createdBy;
              dispatch(
                getAllBusinessList({
                  pageNo,
                  pageSize,
                  liveStatus: cardParams.liveStatus || "",
                  status: cardParams.status || options.status || "all",
                  category: cardParams.category || "",
                  location: cardParams.location || "",
                  paymentStatus: cardParams.paymentStatus || "",
                  createdBy: cardParams.createdBy || "",
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
      </Paper>
      <BusinessDetailsDialog
        open={Boolean(detailRow)}
        row={detailRow}
        onClose={() => setDetailRow(null)}
        onDownloadQr={handleQrDownload}
      />
    </Box>
  );
}
