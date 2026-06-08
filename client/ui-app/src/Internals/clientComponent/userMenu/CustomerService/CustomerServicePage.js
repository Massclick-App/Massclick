import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import CustomerChatPanel from "../../../../components/chat/CustomerChatPanel";
import OTPLoginModal from "../../AddBusinessModel";

export default function CustomerServicePage() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <Box sx={{ width: "100%", maxWidth: 940, mx: "auto", px: { xs: 2, md: 3 }, py: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: "#111827" }}>
        Customer Service
      </Typography>
      <Typography sx={{ color: "#64748b", mb: 3 }}>
        Chat with Massclick support and continue your latest customer care conversation.
      </Typography>
      <CustomerChatPanel
        embedded
        onRequireLogin={() => setLoginOpen(true)}
      />
      <OTPLoginModal open={loginOpen} handleClose={() => setLoginOpen(false)} />
    </Box>
  );
}
