// import React, { useEffect, useState } from "react";
// import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
// import { useDispatch } from "react-redux";
// import { relogin } from "../../redux/actions/authAction";

// export default function TokenExpiredDialog() {
//   const dispatch = useDispatch();
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     let timer;

//     const scheduleCheck = () => {
//       const token = localStorage.getItem("accessToken");
//       const expiresAt = localStorage.getItem("accessTokenExpiresAt");

//       if (!token || !expiresAt) {
//         setOpen(true);
//         return;
//       }

//       const expiryTime = new Date(expiresAt).getTime();
//       const now = Date.now();

//       if (expiryTime <= now) {
//         setOpen(true);
//       } else {
//         timer = setTimeout(() => setOpen(true), expiryTime - now);
//       }
//     };

//     scheduleCheck();
//     return () => clearTimeout(timer);
//   }, []);

//   const handleRelogin = async () => {
//     try {
//       await dispatch(relogin());
//       setOpen(false);
//       window.location.reload();
//     } catch (err) {
//       console.error("Relogin failed:", err);
//     }
//   };

//   return (
//     <Dialog
//       open={open}
//       disableEscapeKeyDown={true}
//       slotProps={{ backdrop: { invisible: true } }}
//     >
//       <DialogTitle>Session Expired</DialogTitle>
//       <DialogContent>
//         <Typography>Your session has expired. Please relogin to continue.</Typography>
//       </DialogContent>
//       <DialogActions>
//         <Button variant="contained" color="primary" onClick={handleRelogin}>
//           Relogin
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// }