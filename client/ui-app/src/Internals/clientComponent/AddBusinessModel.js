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
    useMediaQuery,
    useTheme,
    IconButton,
    CircularProgress,
} from "@mui/material";
import {
    Close as CloseIcon,
    Lock as LockIcon,
} from "@mui/icons-material";
import { sendOtp, verifyOtp } from "../../redux/actions/otpAction";
import { registerWebFCMToken } from "../../utils/registerFCMToken";
import { identify } from "../../utils/webTracker.js";
import { getCustomerUser } from "../../auth/authStore.js";
import { useDispatch } from "react-redux";
import { Link as RouterLink } from 'react-router-dom';
import { Link as MuiLink } from '@mui/material';
import { useSnackbar } from "../../components/snackbar/SnackbarProvider.js";
import PhoneInput, { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";

const InstantTransition = React.forwardRef(function InstantTransition(
    {
        children,
        in: isOpen,
        onEnter,
        onExited,
        ...childProps
    },
    ref,
) {
    const transitionCallbacksRef = React.useRef({
        onEnter,
        onExited,
    });

    transitionCallbacksRef.current = {
        onEnter,
        onExited,
    };

    React.useLayoutEffect(() => {
        const callbacks = transitionCallbacksRef.current;

        if (isOpen) {
            callbacks.onEnter?.();
            return;
        }

        callbacks.onExited?.();
    }, [isOpen]);

    const forwardedChildProps = { ...childProps };
    [
        'addEndListener',
        'appear',
        'easing',
        'enter',
        'exit',
        'mountOnEnter',
        'nodeRef',
        'onEntered',
        'onEntering',
        'onExit',
        'onExiting',
        'ownerState',
        'timeout',
        'unmountOnExit',
    ].forEach((propName) => {
        delete forwardedChildProps[propName];
    });

    return React.cloneElement(children, {
        ...forwardedChildProps,
        ref,
    });
});

const LogoComponent = () => (
    <Box sx={{ mb: { xs: 2, sm: 3 }, textAlign: 'center', '@media (max-height: 760px)': { mb: 1.5 } }}>
        <Typography
            variant="h4"
            component="div"
            sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #FF7B00 0%, #E65100 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: { xs: '1.8rem', sm: '2.2rem' },
                letterSpacing: '-0.5px',
                '@media (max-height: 700px)': { fontSize: '1.65rem' },
            }}
        >
            MassClick<sup style={{ fontSize: '0.45em', marginLeft: '4px' }}>TM</sup>
        </Typography>
        <Box sx={{
            width: '80px',
            height: '3px',
            background: 'linear-gradient(90deg, #FF7B00 0%, #FF6F00 100%)',
            margin: { xs: '9px auto 12px', sm: '12px auto 16px' },
            borderRadius: '2px',
            '@media (max-height: 700px)': { margin: '7px auto 9px' },
        }} />
        <Typography
            variant="body2"
            sx={{
                color: '#64748b',
                fontSize: { xs: '0.78rem', sm: '0.95rem' },
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
            }}
        >
            India&apos;s Leading Local Search Engine
        </Typography>
    </Box>
);

const OTPLoginModal = ({ open, handleClose, onMaybeLater, onSuccess }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [mobileNumber, setMobileNumber] = React.useState('');
    const [agreed, setAgreed] = React.useState(false);

    const [otpSent, setOtpSent] = React.useState(false);
    const [otpDigits, setOtpDigits] = React.useState(['', '', '', '']);
    const otpRefs = React.useRef([null, null, null, null]);
    const userNameRef = React.useRef(null);
    const [userName, setUserName] = React.useState('');
    const [isNewUser, setIsNewUser] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [resendTimer, setResendTimer] = React.useState(0);

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const handleMaybeLater = () => {
        onMaybeLater?.();
        handleClose();
    };

    React.useEffect(() => {
        if (!open) {
            setIsDialogOpen(false);
            return undefined;
        }

        let openFrameId;
        const layoutFrameId = window.requestAnimationFrame(() => {
            // Leave one full rendering opportunity between the hidden mount and
            // opening. MUI writes Modal.scrollTop on open; pre-laying out the
            // subtree keeps that write from synchronously laying out the dialog.
            openFrameId = window.requestAnimationFrame(() => {
                setIsDialogOpen(true);
            });
        });

        return () => {
            window.cancelAnimationFrame(layoutFrameId);
            if (openFrameId !== undefined) {
                window.cancelAnimationFrame(openFrameId);
            }
        };
    }, [open]);

    React.useEffect(() => {
        const storedMobile = localStorage.getItem("mobileNumber");
        if (storedMobile) {
            setMobileNumber(storedMobile.length === 10 ? `+91${storedMobile}` : `+${storedMobile}`);
        }
    }, []);

    const isMobileNumberValid = Boolean(mobileNumber && isValidPhoneNumber(mobileNumber));
    const getStoredMobile = (value) => {
        const phone = parsePhoneNumber(value);
        if (!phone) return String(value || '').replace(/\D/g, '');
        return phone.country === 'IN' ? phone.nationalNumber : phone.number.slice(1);
    };

    React.useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleSendOtp = async () => {
        if (!agreed || !isMobileNumberValid) return;
        setIsLoading(true);
        try {
            const res = await dispatch(sendOtp(mobileNumber));
            setOtpSent(true);
            setIsNewUser(res.isNewUser);
            setResendTimer(60);
            localStorage.setItem("mobileNumber", getStoredMobile(mobileNumber));
        } catch (error) {
            enqueueSnackbar("Failed to send OTP. Please try again.", {
                variant: "error",
                autoHideDuration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        // iOS "one-time-code" autofill types the whole code into one input,
        // so spread however many digits arrive across the boxes.
        const digits = value.slice(0, 4 - index);
        const newOtpDigits = [...otpDigits];
        newOtpDigits[index] = '';
        digits.split('').forEach((digit, offset) => {
            newOtpDigits[index + offset] = digit;
        });
        setOtpDigits(newOtpDigits);

        if (digits) {
            const nextIndex = index + digits.length;
            if (nextIndex <= 3) {
                otpRefs.current[nextIndex]?.focus();
            } else {
                otpRefs.current[3]?.blur();
            }
        }

        if (newOtpDigits.every(digit => digit !== '')) {
            if (isNewUser) {
                enqueueSnackbar("OTP entered. Please enter your name to continue.", {
                    variant: "info",
                    autoHideDuration: 3000,
                });
                window.requestAnimationFrame(() => userNameRef.current?.focus());
            } else {
                handleVerifyOtp(newOtpDigits.join(''));
            }
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOtp = async (otpValue) => {
        const finalOtp = otpValue || otpDigits.join('');
        if (finalOtp.length !== 4 || isLoading) return;

        const normalizedUserName = userName.trim();
        if (isNewUser && normalizedUserName.length < 2) {
            enqueueSnackbar("Please enter your name to create your account.", {
                variant: "warning",
                autoHideDuration: 3000,
            });
            userNameRef.current?.focus();
            return;
        }

        setIsLoading(true);
        try {
            const res = await dispatch(verifyOtp(mobileNumber, finalOtp, normalizedUserName));

            if (res.token) {
                enqueueSnackbar(res.welcomeBonus?.awarded
                    ? `Welcome to MassClick! ${res.welcomeBonus.points} bonus points have been added to your wallet.`
                    : "Login successful!", {
                    variant: "success",
                    autoHideDuration: res.welcomeBonus?.awarded ? 6000 : 3000,
                });

                localStorage.setItem("mobileNumber", res.user?.mobileNumber1 || getStoredMobile(mobileNumber));
                await registerWebFCMToken();
                identify(getCustomerUser()?._id);
                onSuccess?.(getCustomerUser());
                handleClose();
            }
        } catch (error) {
            setOtpDigits(['', '', '', '']);
            otpRefs.current[0]?.focus();

            enqueueSnackbar(error.response?.data?.message || "Invalid OTP. Please try again.", {
                variant: "error",
                autoHideDuration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const autoFillOtp = (code) => {
        const digits = String(code || '').replace(/\D/g, '').slice(0, 4);
        if (digits.length !== 4) return;
        setOtpDigits(digits.split(''));
        if (isNewUser) {
            enqueueSnackbar("OTP entered. Please enter your name to continue.", {
                variant: "info",
                autoHideDuration: 3000,
            });
            window.requestAnimationFrame(() => userNameRef.current?.focus());
        } else {
            handleVerifyOtp(digits);
        }
    };

    const autoFillRef = React.useRef(autoFillOtp);
    autoFillRef.current = autoFillOtp;

    // Web OTP API (Chrome/Edge on Android): the browser hands over the code
    // only when the SMS ends with "@massclick.in #<otp>" — kept in sync with
    // the DLT-approved MSG91 template.
    React.useEffect(() => {
        if (!otpSent || !open || !('OTPCredential' in window)) return undefined;

        const abortController = new AbortController();
        navigator.credentials
            .get({ otp: { transport: ['sms'] }, signal: abortController.signal })
            .then((credential) => {
                if (credential?.code) autoFillRef.current(credential.code);
            })
            .catch(() => {
                // Aborted or no matching SMS; user enters the code manually.
            });

        return () => abortController.abort();
    }, [otpSent, open]);

    const handleOtpPaste = (e) => {
        const digits = (e.clipboardData?.getData('text') || '').replace(/\D/g, '');
        if (digits.length >= 4) {
            e.preventDefault();
            autoFillOtp(digits);
        }
    };

    return (
        <Dialog
            open={open && isDialogOpen}
            onClose={handleClose}
            aria-labelledby="otp-login-dialog-title"
            keepMounted
            maxWidth="sm"
            fullWidth={false}
            disableScrollLock
            slots={{
                transition: InstantTransition,
            }}
            slotProps={{
                backdrop: {
                    slots: {
                        transition: InstantTransition,
                    },
                    sx: {
                        backdropFilter: 'blur(12px)',
                        backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    },
                },
            }}
            sx={{
                "& .MuiDialog-container": {
                    alignItems: isMobile ? 'flex-end' : 'center',
                    padding: { xs: 0, sm: 2, md: 3 },
                    '@media (max-height: 700px) and (min-width: 600px)': {
                        paddingBlock: 1,
                    },
                },
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? '24px 24px 0 0' : "24px",
                    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
                    boxSizing: 'border-box',
                    p: { xs: '24px clamp(20px, 6vw, 28px)', sm: 4, md: 5 },
                    m: isMobile ? 0 : undefined,
                    width: isMobile ? '100%' : 'clamp(400px, 38vw, 460px)',
                    maxWidth: isMobile ? '100%' : 'calc(100vw - 32px)',
                    maxHeight: isMobile
                        ? 'min(92dvh, 760px)'
                        : 'calc(100dvh - clamp(16px, 5vh, 64px))',
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    scrollbarGutter: 'stable',
                    transition: 'all 0.3s ease-in-out',
                    background: 'linear-gradient(145deg, #ffffff 0%, #fff8f3 100%)',
                    position: 'relative',
                    '@media (max-height: 760px)': {
                        p: { xs: '20px clamp(18px, 5vw, 24px)', sm: 3 },
                    },
                    '@media (max-height: 620px) and (min-width: 600px)': {
                        borderRadius: '18px',
                        p: 2.25,
                    },
                },
                "& .MuiBackdrop-root": {
                    transition: 'all 0.3s ease-in-out',
                },
            }}
        >
            <IconButton
                onClick={handleClose}
                aria-label="Close"
                sx={{
                    position: 'absolute',
                    right: { xs: 10, sm: 14 },
                    top: { xs: 10, sm: 14 },
                    zIndex: 1,
                    color: theme.palette.grey[500],
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        color: '#FF7B00',
                        backgroundColor: 'rgba(255, 123, 0, 0.1)',
                    },
                }}
            >
                <CloseIcon />
            </IconButton>

            <DialogContent
                sx={{
                    p: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    minHeight: '100%',
                }}
            >
                <LogoComponent />

                <Box sx={{
                    display: 'flex',
                    gap: 1,
                    mb: { xs: 2, sm: 3 },
                    alignItems: 'center',
                    justifyContent: 'center',
                    '@media (max-height: 700px)': { mb: 1.25 },
                }}>
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: otpSent ? '#e2e8f0' : '#FF7B00',
                            transition: 'all 0.3s ease',
                        }}
                    />
                    <Box
                        sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: otpSent ? '#FF7B00' : '#e2e8f0',
                            transition: 'all 0.3s ease',
                        }}
                    />
                </Box>

                <Typography
                    id="otp-login-dialog-title"
                    variant="h5"
                    sx={{
                        mt: 0,
                        mb: 1,
                        fontWeight: 700,
                        color: '#0b1a4a',
                        fontSize: { xs: '1.45rem', sm: '1.75rem' },
                        textAlign: 'center',
                        '@media (max-height: 700px)': { fontSize: '1.35rem' },
                    }}
                >
                    {otpSent ? 'Verify OTP' : 'Welcome Back!'}
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        mb: { xs: 1.5, sm: 2 },
                        color: '#64748b',
                        fontSize: { xs: '0.84rem', sm: '0.95rem' },
                        textAlign: 'center',
                        lineHeight: 1.5,
                        '@media (max-height: 700px)': { mb: 1.25, fontSize: '0.8rem' },
                    }}
                >
                    {otpSent
                        ? 'Enter the 4-digit code sent to your phone'
                        : 'Verify your mobile number to activate two-way WhatsApp connections'}
                </Typography>

                {!otpSent ? (
                    <>
                        <Box
                            sx={{
                                width: '100%',
                                mb: { xs: 2, sm: 3 },
                                p: { xs: 1.25, sm: 1.6 },
                                boxSizing: 'border-box',
                                border: '1px solid rgba(255, 123, 0, 0.2)',
                                borderRadius: '12px',
                                background: 'rgba(255, 247, 237, 0.78)',
                            }}
                        >
                            <Typography
                                sx={{
                                    color: '#9a3412',
                                    fontSize: { xs: '0.72rem', sm: '0.78rem' },
                                    fontWeight: 700,
                                    lineHeight: 1.55,
                                    textAlign: 'center',
                                }}
                            >
                                Login is required: customers receive matched businesses and
                                business owners receive customer leads only after mobile
                                verification.
                            </Typography>
                        </Box>

                        <Box sx={{ width: '100%', mb: { xs: 2, sm: 3 }, '@media (max-height: 700px)': { mb: 1.5 } }}>
                            {false && (
                            <TextField
                                fullWidth
                                placeholder="Enter Mobile Number"
                                required
                                variant="outlined"
                                type="tel"
                                inputProps={{
                                    maxLength: 10,
                                    autoComplete: 'off',
                                    inputMode: 'numeric',
                                }}
                                value={mobileNumber}
                                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment
                                            position="start"
                                            sx={{
                                                backgroundColor: '#fff8f3',
                                                paddingRight: '12px',
                                                paddingLeft: '14px',
                                                borderRight: '2px solid #FF7B00',
                                                margin: '-12px 8px -12px -14px',
                                                borderRadius: '12px 0 0 12px',
                                                height: 'calc(100% + 24px)',
                                            }}
                                        >
                                            <Typography sx={{
                                                fontWeight: 600,
                                                color: '#0b1a4a',
                                                fontSize: '1.1rem',
                                            }}>
                                                🇮🇳 +91
                                            </Typography>
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        borderRadius: '12px',
                                        fontSize: '1.05rem',
                                        fontWeight: 500,
                                        transition: 'all 0.2s ease',
                                        '& .MuiInputBase-input': {
                                            py: '14px',
                                            fontFamily: 'Poppins, sans-serif',
                                        },
                                    }
                                }}
                                sx={{
                                    width: '100%',
                                    '& .MuiOutlinedInput-root': {
                                        transition: 'all 0.2s ease',
                                        '& fieldset': {
                                            borderColor: '#e2e8f0',
                                            borderWidth: '2px',
                                        },
                                        '&:hover fieldset': {
                                            borderColor: '#FF7B00',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#FF7B00',
                                            boxShadow: '0 0 0 4px rgba(255, 123, 0, 0.12)',
                                        },
                                    },
                                }}
                            />
                            )}
                            <Box sx={{
                                border: '2px solid #e2e8f0', borderRadius: '12px', px: 1.75,
                                py: 1.45, transition: 'all 0.2s ease', backgroundColor: '#fff',
                                '&:hover': { borderColor: '#FF7B00' },
                                '&:focus-within': { borderColor: '#FF7B00', boxShadow: '0 0 0 4px rgba(255, 123, 0, 0.12)' },
                                '& .PhoneInputCountry': { borderRight: '2px solid #FF7B00', pr: 1.5, mr: 1.5 },
                                '& .PhoneInputCountrySelect': { cursor: 'pointer' },
                                '& .PhoneInputInput': { border: 0, outline: 0, fontSize: '1.05rem', fontWeight: 500, fontFamily: 'Poppins, sans-serif', minWidth: 0 },
                            }}>
                                <PhoneInput
                                    international
                                    defaultCountry="IN"
                                    countryCallingCodeEditable={false}
                                    placeholder="Enter mobile number"
                                    value={mobileNumber}
                                    onChange={(value) => setMobileNumber(value || '')}
                                    autoComplete="tel"
                                />
                            </Box>
                            {mobileNumber && !isMobileNumberValid && (
                                <Typography sx={{ color: '#d32f2f', fontSize: '0.75rem', mt: 0.75, ml: 0.5 }}>
                                    Enter a valid mobile number for the selected country.
                                </Typography>
                            )}
                        </Box>

                        <Box sx={{ mb: { xs: 2.5, sm: 4 }, width: '100%', '@media (max-height: 700px)': { mb: 1.5 } }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                        name="terms"
                                        size="small"
                                        sx={{
                                            color: '#cbd5e1',
                                            '&.Mui-checked': {
                                                color: '#FF7B00',
                                            },
                                            transition: 'all 0.2s ease',
                                        }}
                                    />
                                }
                                label={
                                    <Typography variant="body2" sx={{ color: '#64748b', ml: 0.5, fontSize: { xs: '0.78rem', sm: '0.875rem' }, lineHeight: 1.45 }}>
                                        I agree to{' '}
                                        <MuiLink
                                            component={RouterLink}
                                            to="/terms"
                                            underline="hover"
                                            sx={{
                                                color: '#FF7B00',
                                                fontWeight: 600,
                                                transition: 'color 0.2s ease',
                                                '&:hover': { color: '#E65100' },
                                            }}
                                        >
                                            Terms & Conditions
                                        </MuiLink>
                                        {' '}and{' '}
                                        <Link
                                            component={RouterLink}
                                            to="/privacy"
                                            underline="hover"
                                            variant="body2"
                                            sx={{
                                                color: '#64748b',
                                                transition: 'color 0.2s ease',
                                                '&:hover': { color: '#FF7B00' },
                                            }}
                                        >
                                            Privacy Policy
                                        </Link>
                                    </Typography>
                                }
                            />
                        </Box>

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleSendOtp}
                            disabled={!agreed || !isMobileNumberValid || isLoading}
                            sx={{
                                background: agreed && isMobileNumberValid
                                    ? 'linear-gradient(135deg, #FF7B00 0%, #FF6F00 100%)'
                                    : theme.palette.grey[300],
                                color: agreed && isMobileNumberValid ? 'white' : theme.palette.grey[500],
                                textTransform: 'none',
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                borderRadius: '30px',
                                py: { xs: 1.35, sm: 1.6 },
                                boxShadow: agreed && isMobileNumberValid
                                    ? '0 10px 30px rgba(255, 123, 0, 0.4)'
                                    : 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': {
                                    ...(agreed && isMobileNumberValid ? {
                                        background: 'linear-gradient(135deg, #E65100 0%, #FF7B00 100%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 14px 35px rgba(255, 123, 0, 0.5)',
                                    } : {}),
                                },
                                '&.Mui-disabled': {
                                    background: theme.palette.grey[300],
                                    color: theme.palette.grey[500],
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <CircularProgress size={20} sx={{ color: 'inherit' }} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <LockIcon sx={{ fontSize: '1.2rem' }} />
                                    Login With OTP
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <Box sx={{ mb: 4, width: '100%' }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: { xs: 1, sm: 2 },
                                    justifyContent: 'center',
                                    mb: 3,
                                }}
                            >
                                {otpDigits.map((digit, index) => (
                                    <TextField
                                        key={index}
                                        inputRef={(el) => (otpRefs.current[index] = el)}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        onPaste={handleOtpPaste}
                                        inputProps={{
                                            maxLength: index === 0 ? 4 : 1,
                                            inputMode: 'numeric',
                                            autoComplete: index === 0 ? 'one-time-code' : 'off',
                                            style: {
                                                textAlign: 'center',
                                                fontSize: '2rem',
                                                fontWeight: 700,
                                                fontFamily: 'Poppins, sans-serif',
                                            },
                                        }}
                                        variant="outlined"
                                        sx={{
                                            width: { xs: 'clamp(48px, 15vw, 56px)', sm: '56px' },
                                            height: { xs: '54px', sm: '60px' },
                                            '& .MuiOutlinedInput-root': {
                                                width: '100%',
                                                height: '100%',
                                                transition: 'all 0.2s ease',
                                                '& fieldset': {
                                                    borderColor: '#e2e8f0',
                                                    borderWidth: '2px',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#FF7B00',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#FF7B00',
                                                    boxShadow: '0 0 0 4px rgba(255, 123, 0, 0.12)',
                                                },
                                            },
                                            '& .MuiOutlinedInput-input': {
                                                p: 0,
                                            },
                                        }}
                                    />
                                ))}
                            </Box>

                            <Box sx={{ textAlign: 'center', mb: 3 }}>
                                {resendTimer > 0 ? (
                                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                                        Resend OTP in{' '}
                                        <Typography
                                            component="span"
                                            sx={{ fontWeight: 700, color: '#FF7B00' }}
                                        >
                                            {resendTimer}s
                                        </Typography>
                                    </Typography>
                                ) : (
                                    <Link
                                        component="button"
                                        variant="body2"
                                        onClick={handleSendOtp}
                                        sx={{
                                            color: '#FF7B00',
                                            fontWeight: 600,
                                            textDecoration: 'none',
                                            cursor: 'pointer',
                                            transition: 'color 0.2s ease',
                                            '&:hover': {
                                                color: '#E65100',
                                                textDecoration: 'underline',
                                            },
                                        }}
                                    >
                                        Didn&apos;t receive code? Resend OTP
                                    </Link>
                                )}
                            </Box>
                        </Box>

                        {isNewUser && otpDigits.join('').length === 4 && (
                            <Box sx={{ width: '100%', mb: 3 }}>
                                <TextField
                                    inputRef={userNameRef}
                                    fullWidth
                                    label="Your name"
                                    placeholder="Enter your full name"
                                    required
                                    variant="outlined"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    helperText="Required to create your new account"
                                    InputProps={{
                                        sx: {
                                            borderRadius: '12px',
                                            fontSize: '1.05rem',
                                            fontWeight: 500,
                                            transition: 'all 0.2s ease',
                                            '& .MuiInputBase-input': {
                                                py: '14px',
                                                fontFamily: 'Poppins, sans-serif',
                                            },
                                        }
                                    }}
                                    sx={{
                                        width: '100%',
                                        '& .MuiOutlinedInput-root': {
                                            transition: 'all 0.2s ease',
                                            '& fieldset': {
                                                borderColor: '#e2e8f0',
                                                borderWidth: '2px',
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#FF7B00',
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#FF7B00',
                                                boxShadow: '0 0 0 4px rgba(255, 123, 0, 0.12)',
                                            },
                                        },
                                    }}
                                />
                            </Box>
                        )}

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={() => handleVerifyOtp()}
                            disabled={otpDigits.join('').length < 4 || (isNewUser && userName.trim().length < 2) || isLoading}
                            sx={{
                                background: otpDigits.join('').length === 4 && (!isNewUser || userName.trim().length >= 2)
                                    ? 'linear-gradient(135deg, #FF7B00 0%, #FF6F00 100%)'
                                    : theme.palette.grey[300],
                                color: otpDigits.join('').length === 4 && (!isNewUser || userName.trim().length >= 2) ? 'white' : theme.palette.grey[500],
                                textTransform: 'none',
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                borderRadius: '30px',
                                py: 1.6,
                                boxShadow: otpDigits.join('').length === 4 && (!isNewUser || userName.trim().length >= 2)
                                    ? '0 10px 30px rgba(255, 123, 0, 0.4)'
                                    : 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': {
                                    ...(otpDigits.join('').length === 4 && (!isNewUser || userName.trim().length >= 2) ? {
                                        background: 'linear-gradient(135deg, #E65100 0%, #FF7B00 100%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 14px 35px rgba(255, 123, 0, 0.5)',
                                    } : {}),
                                },
                                '&.Mui-disabled': {
                                    background: theme.palette.grey[300],
                                    color: theme.palette.grey[500],
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <CircularProgress size={20} sx={{ color: 'inherit' }} />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <LockIcon sx={{ fontSize: '1.2rem' }} />
                                    {isNewUser ? 'Create Account' : 'Verify & Login'}
                                </>
                            )}
                        </Button>
                    </>
                )}

                <Link
                    component="button"
                    variant="body2"
                    onClick={handleMaybeLater}
                    sx={{
                        mt: { xs: 2, sm: 3 },
                        mb: { xs: 1, sm: 2 },
                        color: '#94a3b8',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        '&:hover': { color: '#FF7B00' },
                        fontWeight: 500,
                        fontSize: { xs: '0.78rem', sm: '0.875rem' },
                        textAlign: 'center',
                        '@media (max-height: 700px)': { mt: 1.25, mb: 0.75 },
                    }}
                >
                    Maybe Later — remind me on the home page
                </Link>

                <Typography
                    variant="caption"
                    sx={{
                        color: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8,
                        justifyContent: 'center',
                        fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    }}
                >
                    🔒 Secure & spam-free login
                </Typography>
            </DialogContent>
        </Dialog>
    );
};

export default OTPLoginModal;
