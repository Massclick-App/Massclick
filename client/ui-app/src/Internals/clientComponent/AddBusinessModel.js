import React from "react";
import {
    Dialog,
    DialogContent,
    Button,
    Typography,
    Box,
    TextField,
    Checkbox,
    FormControlLabel,
    InputAdornment,
    Link,
    Grid,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { sendOtp, verifyOtp } from "../../redux/actions/otpAction";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink } from 'react-router-dom';
import { Link as MuiLink } from '@mui/material';

// --- Logo Component for Clean Branding ---
const LogoComponent = () => (
    <Box sx={{ mb: 2, textAlign: 'center' }}>
        <Typography
            variant="h4"
            component="div"
            sx={{ fontWeight: 800, color: '#E65100' }}
        >
            MassClick<sup style={{ fontSize: '0.5em', ml: '2px' }}>TM</sup>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.5px' }}>
            India's Leading Local Search Engine
        </Typography>
    </Box>
);

// --- Main OTP Login Modal Component ---
const OTPLoginModal = ({ open, handleClose }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileNumber, setMobileNumber] = React.useState('');
    const [agreed, setAgreed] = React.useState(false);

    const [otpSent, setOtpSent] = React.useState(false);
    const [otp, setOtp] = React.useState('');
    const [userName, setUserName] = React.useState('');
    
    const dispatch = useDispatch();

    const handleSendOtp = async () => {
        if (!agreed || mobileNumber.length !== 10) return;
        try {
            const res = await dispatch(sendOtp(mobileNumber));
            console.log("OTP Sent Response:", res);
            setOtpSent(true);
            localStorage.setItem("mobileNumber", mobileNumber);
        } catch (error) {
            console.error("Error sending OTP:", error);
        }
    };
    React.useEffect(() => {
        const storedMobile = localStorage.getItem("mobileNumber");
        if (storedMobile) setMobileNumber(storedMobile);
    }, []);

    const handleVerifyOtp = async () => {
        if (!otp) return;
        try {
            const res = await dispatch(verifyOtp(mobileNumber, otp, userName));
            console.log("Login Successful:", res);

            if (res.token) {
                localStorage.setItem("authToken", res.token);
                window.dispatchEvent(new Event("authChange"));
            }

            handleClose();
        } catch (error) {
            console.error("Error verifying OTP:", error);
        }
    };


    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullScreen={isMobile}
            sx={{
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? '0' : "24px",
                    boxShadow: isMobile ? 'none' : "0 15px 40px rgba(0, 0, 0, 0.15)",
                    p: { xs: 2, sm: 4 },
                    width: isMobile ? '100%' : '420px',
                    minHeight: '480px',
                    transition: 'height 0.3s ease-in-out',
                    backgroundColor: theme.palette.grey[50],
                },
            }}
        >
            <DialogContent
                sx={{
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100%',
                }}
            >
                <LogoComponent />
                <Typography
                    variant="h5"
                    sx={{ mt: 1, fontWeight: 700, color: theme.palette.text.primary }}
                >
                    Welcome Back!
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                    Login for a seamless experience
                </Typography>

                {!otpSent ? (
                    <>
                        <TextField
                            fullWidth
                            placeholder="Enter Mobile Number*"
                            required
                            variant="outlined"
                            type="tel"
                            inputProps={{ maxLength: 10 }}
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start" sx={{
                                        bgcolor: theme.palette.grey[200],
                                        p: 2,
                                        borderRight: `1px solid ${theme.palette.grey[300]}`,
                                        margin: '-8px 8px -8px -14px',
                                        borderRadius: '4px 0 0 4px',
                                        height: 'calc(100% + 16px)'
                                    }}>
                                        <Typography sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                            +91
                                        </Typography>
                                    </InputAdornment>
                                ),
                                sx: {
                                    borderRadius: "12px",
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    '& .MuiInputBase-input': { py: '16.5px' }
                                }
                            }}
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.grey[400] },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                            }}
                        />

                        <Typography variant="caption" color="text.secondary" alignSelf="flex-start" sx={{ ml: 1, mb: 1.5, fontStyle: 'italic' }}>
                            * indicates mandatory fields
                        </Typography>

                        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 4, width: '100%' }}>
                            <Grid item>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={agreed}
                                            onChange={(e) => setAgreed(e.target.checked)}
                                            name="terms"
                                            size="small"
                                            sx={{
                                                color: theme.palette.grey[500],
                                                '&.Mui-checked': { color: '#FF6F00' }
                                            }}
                                        />
                                    }
                                    label={
                                        <Typography variant="body2" color="text.secondary">
                                            I Agree to
                                            <MuiLink
                                                component={RouterLink}
                                                to="/terms"
                                                underline="hover"
                                                sx={{ color: '#FF6F00', fontWeight: 600 }}
                                            >
                                                Terms and Conditions
                                            </MuiLink>
                                        </Typography>
                                    }
                                    sx={{ mr: 0 }}
                                />
                            </Grid>
                            <Grid item>
                                <Link href="#" underline="hover" variant="body2" sx={{ color: theme.palette.text.secondary }}>
                                    T&C's Privacy Policy
                                </Link>
                            </Grid>
                        </Grid>

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSendOtp}
                            disabled={!agreed || mobileNumber.length < 10}
                            sx={{
                                background: "linear-gradient(90deg, #FF9900 0%, #FF6F00 100%)",
                                color: "white",
                                textTransform: "none",
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                borderRadius: "30px",
                                py: 1.5,
                                boxShadow: "0 8px 25px rgba(255, 123, 0, 0.5)",
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                "&:hover": {
                                    background: "linear-gradient(90deg, #FF6F00 0%, #FF9900 100%)",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 12px 30px rgba(255, 123, 0, 0.6)",
                                },
                                "&.Mui-disabled": {
                                    background: theme.palette.grey[300],
                                    color: theme.palette.grey[500],
                                    boxShadow: 'none',
                                }
                            }}
                        >
                            Login With OTP
                        </Button>
                    </>
                ) : (
                    <>
                        <TextField
                            fullWidth
                            placeholder="Enter OTP*"
                            required
                            variant="outlined"
                            type="tel"
                            inputProps={{ maxLength: 4 }}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            InputProps={{
                                sx: {
                                    borderRadius: "12px",
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    '& .MuiInputBase-input': { py: '16.5px' }
                                }
                            }}
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.grey[400] },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                            }}
                        />

                        <TextField
                            fullWidth
                            placeholder="UserName"
                            variant="outlined"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            InputProps={{
                                sx: {
                                    borderRadius: "12px",
                                    fontSize: '1.1rem',
                                    fontWeight: 500,
                                    '& .MuiInputBase-input': { py: '16.5px' }
                                }
                            }}
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.grey[400] },
                                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                            }}
                        />

                        <Button
                            fullWidth
                            onClick={handleVerifyOtp}
                            disabled={otp.length < 4}
                            sx={{
                                background: "linear-gradient(90deg, #FF9900 0%, #FF6F00 100%)",
                                color: "white",
                                textTransform: "none",
                                fontSize: "1.1rem",
                                fontWeight: 700,
                                borderRadius: "30px",
                                py: 1.5,
                                boxShadow: "0 8px 25px rgba(255, 123, 0, 0.5)",
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                "&:hover": {
                                    background: "linear-gradient(90deg, #FF6F00 0%, #FF9900 100%)",
                                    transform: "translateY(-2px)",
                                    boxShadow: "0 12px 30px rgba(255, 123, 0, 0.6)",
                                },
                                "&.Mui-disabled": {
                                    background: theme.palette.grey[300],
                                    color: theme.palette.grey[500],
                                    boxShadow: 'none',
                                }
                            }}
                        >
                            Verify OTP & Login
                        </Button>
                    </>
                )}

                <Link
                    component="button"
                    variant="body2"
                    onClick={handleClose}
                    sx={{ mt: 2, color: theme.palette.grey[600], textDecoration: 'none', '&:hover': { color: '#FF6F00' } }}
                >
                    Maybe Later
                </Link>
            </DialogContent>
        </Dialog>
    );
};

export default OTPLoginModal;
