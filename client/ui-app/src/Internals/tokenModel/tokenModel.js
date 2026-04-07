// import React from "react";
// import { useDispatch, useSelector } from "react-redux";
// import { relogin } from "../../redux/actions/authAction.js";
// import { Modal, Box, Button, Typography } from "@mui/material";

// const TokenExpiredModal = () => {
//   const dispatch = useDispatch();
//   // const open = useSelector((state) => state.auth.showTokenExpiredModal);

//   const handleRelogin = async () => {
//     try {
//       await dispatch(relogin()); 
//       // dispatch(showTokenExpiredModal(false)); 
//     } catch (error) {
//       console.error("Re-login failed", error);
//       alert("Session expired completely. Please log in again.");
//       window.location.reload();
//     }
//   };

//   return (
//     <Modal open={open}>
//       <Box
//         sx={{
//           position: "absolute",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           bgcolor: "background.paper",
//           p: 4,
//           borderRadius: 2,
//           boxShadow: 24,
//           textAlign: "center",
//         }}
//       >
//         <Typography variant="h6" gutterBottom>
//           Session Expired
//         </Typography>
//         <Typography variant="body2" sx={{ mb: 2 }}>
//           Your session has expired. Please re-login to continue.
//         </Typography>
//         <Button variant="contained" onClick={handleRelogin}>
//           Re-login
//         </Button>
//       </Box>
//     </Modal>
//   );
// };

// export default TokenExpiredModal;
