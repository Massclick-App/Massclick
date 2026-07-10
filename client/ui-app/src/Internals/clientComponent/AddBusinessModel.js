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
import { useDispatch } from "react-redux";
import { Link as RouterLink } from 'react-router-dom';
import { Link as MuiLink } from '@mui/material';
import { useSnackbar } from "notistack";

const LogoComponent = () => (
    <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography
            variant="h4"
            component="div"
            sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #FF7B00 0%, #E65100 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontSize: '2.2rem',
                letterSpacing: '-0.5px',
            }}
        >
            MassClick<sup style={{ fontSize: '0.45em', marginLeft: '4px' }}>TM</sup>
        </Typography>
        <Box sx={{
            width: '80px',
            height: '3px',
            background: 'linear-gradient(90deg, #FF7B00 0%, #FF6F00 100%)',
            margin: '12px auto 16px',
            borderRadius: '2px',
        }} />
        <Typography
            variant="body2"
            sx={{
                color: '#64748b',
                fontSize: '0.95rem',
                letterSpacing: '0.3px',
            }}
        >
            India's Leading Local Search Engine
        </Typography>
    </Box>
);

const OTP_LENGTH = 4;

const OTPLoginModal = ({ open, handleClose, onMaybeLater }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileNumber, setMobileNumber] = React.useState('');
    const [agreed, setAgreed] = React.useState(false);
    const [debugLogs, setDebugLogs] = React.useState([]);
    const [showDebug, setShowDebug] = React.useState(true);

    const addLog = React.useCallback((message, data = null) => {
        console.log(message, data);
        const timestamp = new Date().toLocaleTimeString();
        setDebugLogs((prev) => [
            ...prev.slice(-50), // Keep last 50 logs
            { timestamp, message, data },
        ]);
    }, []);

    const [otpSent, setOtpSent] = React.useState(false);
    const [otpDigits, setOtpDigits] = React.useState(Array(OTP_LENGTH).fill(''));
    const otpRefs = React.useRef(Array(OTP_LENGTH).fill(null));
    const [userName, setUserName] = React.useState('');
    const [isNewUser, setIsNewUser] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [resendTimer, setResendTimer] = React.useState(0);
    const [isAutoFilling, setIsAutoFilling] = React.useState(false);

    const dispatch = useDispatch();
    const { enqueueSnackbar } = useSnackbar();
    const handleMaybeLater = () => {
        onMaybeLater?.();
        handleClose();
    };

    React.useEffect(() => {
        const storedMobile = localStorage.getItem("mobileNumber");
        if (storedMobile) setMobileNumber(storedMobile);
    }, []);

    React.useEffect(() => {
        let interval;
        if (resendTimer > 0) {
            interval = setInterval(() => setResendTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleSendOtp = async () => {
        if (!agreed || mobileNumber.length !== 10) return;
        setIsLoading(true);
        try {
            const res = await dispatch(sendOtp(mobileNumber));
            setOtpSent(true);
            setIsNewUser(res.isNewUser);
            setResendTimer(60);
            localStorage.setItem("mobileNumber", mobileNumber);
            window.setTimeout(() => otpRefs.current[0]?.focus(), 0);
        } catch (error) {
            enqueueSnackbar("Failed to send OTP. Please try again.", {
                variant: "error",
                autoHideDuration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = React.useCallback(async (otpValue) => {
        const finalOtp = otpValue || otpDigits.join('');
        if (finalOtp.length !== OTP_LENGTH) return;

        setIsLoading(true);
        try {
            const res = await dispatch(verifyOtp(mobileNumber, finalOtp, userName));

            if (res.token) {
                enqueueSnackbar("Login successfully!", {
                    variant: "success",
                    autoHideDuration: 3000,
                });

                await registerWebFCMToken();
                handleClose();
            }
        } catch (error) {
            setOtpDigits(Array(OTP_LENGTH).fill(''));
            otpRefs.current[0]?.focus();

            enqueueSnackbar("Invalid OTP. Please try again.", {
                variant: "error",
                autoHideDuration: 3000,
            });
        } finally {
            setIsLoading(false);
        }
    }, [dispatch, enqueueSnackbar, handleClose, mobileNumber, otpDigits, userName]);

    const extractOtpFromMessage = React.useCallback((message) => {
        if (!message) return null;

        const cleanMessage = String(message).trim();
        addLog('🔍 OTP Message received:', cleanMessage);

        // Extract ALL digits from the message
        const allDigits = cleanMessage.replace(/\D/g, '');
        addLog('📊 All digits found:', allDigits);

        // Try to find exactly 4 consecutive digits
        const patterns = [
            /\b(\d{4})\b(?=\D*(?:valid|minute|expire|otp|code))/i,
            /is\s+(\d{4})\b/i,
            /otp[:\s]+(\d{4})\b/i,
            /code[:\s]+(\d{4})\b/i,
            /(\d{4})[.\s]*(?:is|your|otp|code|verification)/i,
            /(?:verification|registration)[^\d]*(\d{4})\b/i,
            /\b(\d{4})\b/
        ];

        for (const pattern of patterns) {
            const match = cleanMessage.match(pattern);
            if (match?.[1]) {
                const code = match[1];
                if (code.length === 4 && /^\d{4}$/.test(code)) {
                    addLog('✅ OTP extracted:', code);
                    return code;
                }
            }
        }

        if (allDigits.length >= 4) {
            const code = allDigits.slice(0, 4);
            addLog('⚠️ Fallback extraction:', code);
            return code;
        }

        addLog('❌ No OTP found in message');
        return null;
    }, [addLog]);

    const fillOtpAndVerify = React.useCallback((code) => {
        if (!code || code.length !== OTP_LENGTH || !/^\d{4}$/.test(code)) {
            addLog('❌ Invalid code format:', code);
            return false;
        }

        addLog('🎯 AUTO-FILLING OTP with code:', code);
        setIsAutoFilling(true);
        const nextDigits = code.split('');

        // Update React state - this will trigger re-render and update the UI
        addLog('🔄 Updating state for digits:', nextDigits);
        setOtpDigits(nextDigits);

        // Focus first field
        setTimeout(() => {
            if (otpRefs.current[0]) {
                otpRefs.current[0].focus();
            }
        }, 50);

        // Verify after state is updated
        setTimeout(() => {
            addLog('🔐 Auto-verifying OTP:', code);
            handleVerifyOtp(code);
            setIsAutoFilling(false);
        }, 200);

        return true;
    }, [handleVerifyOtp, addLog]);

    // Mechanism 1: Web OTP API (Chrome/Firefox Android)
    React.useEffect(() => {
        if (!otpSent || !open || !('OTPCredential' in window) || !navigator.credentials) {
            if (otpSent && open) {
                addLog('⚠️ Web OTP API not available on this device');
            }
            return undefined;
        }

        addLog('🔔 Web OTP API listener started');
        const abortController = new AbortController();
        const timeout = setTimeout(() => abortController.abort(), 300000);

        navigator.credentials
            .get({
                otp: { transport: ['sms'] },
                signal: abortController.signal,
            })
            .then((credential) => {
                addLog('📱 OTP Credential received');
                if (credential?.code) {
                    addLog('📨 Raw credential code:', credential.code);
                    const extractedCode = extractOtpFromMessage(credential.code);
                    if (extractedCode) {
                        addLog('✅ Successfully extracted code:', extractedCode);
                        fillOtpAndVerify(extractedCode);
                    } else {
                        addLog('❌ Failed to extract code from credential');
                    }
                } else {
                    addLog('❌ Credential received but no code found');
                }
            })
            .catch((error) => {
                addLog('⚠️ Web OTP API error:', error?.message || error);
            });

        return () => {
            clearTimeout(timeout);
            abortController.abort();
        };
    }, [otpSent, open, extractOtpFromMessage, fillOtpAndVerify, addLog]);

    // Mechanism 2: Paste Listener (Works on all devices)
    const pasteInputRef = React.useRef(null);

    React.useEffect(() => {
        if (!otpSent || !open) {
            addLog('📌 Paste listener deactivated');
            return undefined;
        }

        addLog('📌 Paste listener activated - tap to paste OTP');

        // Focus paste input after dialog opens
        setTimeout(() => {
            if (pasteInputRef.current) {
                pasteInputRef.current.focus();
            }
        }, 100);

        const handlePaste = (e) => {
            const pastedText = e.clipboardData?.getData('text') || '';
            addLog('📌 Paste detected:', pastedText);
            const extractedCode = extractOtpFromMessage(pastedText);
            if (extractedCode) {
                addLog('✅ OTP extracted from paste:', extractedCode);
                e.preventDefault();
                fillOtpAndVerify(extractedCode);
                // Clear the input after successful fill
                if (pasteInputRef.current) {
                    pasteInputRef.current.value = '';
                }
            }
        };

        const pasteInput = pasteInputRef.current;
        if (pasteInput) {
            pasteInput.addEventListener('paste', handlePaste);
        }

        // Also listen for global paste as fallback
        const handleGlobalPaste = (e) => {
            if (otpDigits.join('') === '' && otpSent && open) {
                const pastedText = e.clipboardData?.getData('text') || '';
                addLog('📌 Global paste detected:', pastedText);
                const extractedCode = extractOtpFromMessage(pastedText);
                if (extractedCode) {
                    addLog('✅ OTP auto-filled from global paste:', extractedCode);
                    fillOtpAndVerify(extractedCode);
                }
            }
        };

        document.addEventListener('paste', handleGlobalPaste);

        return () => {
            if (pasteInput) {
                pasteInput.removeEventListener('paste', handlePaste);
            }
            document.removeEventListener('paste', handleGlobalPaste);
        };
    }, [otpSent, open, extractOtpFromMessage, fillOtpAndVerify, addLog, otpDigits]);

    // Mechanism 3: Auto-verify when 4 digits are filled
    React.useEffect(() => {
        if (otpDigits.every(digit => digit !== '') && otpSent) {
            const timer = setTimeout(() => {
                handleVerifyOtp(otpDigits.join(''));
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [otpDigits, otpSent, handleVerifyOtp]);

    const applyOtpValue = (index, value) => {
        const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH - index);
        if (!digits) return;

        const newOtpDigits = [...otpDigits];
        digits.split('').forEach((digit, offset) => {
            newOtpDigits[index + offset] = digit;
        });
        setOtpDigits(newOtpDigits);

        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        if (index + digits.length < OTP_LENGTH) {
            otpRefs.current[nextIndex]?.focus();
        } else {
            otpRefs.current[OTP_LENGTH - 1]?.blur();
        }

        if (newOtpDigits.every(digit => digit !== '')) {
            handleVerifyOtp(newOtpDigits.join(''));
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        applyOtpValue(index, value);
    };

    const handleOtpPaste = (index, e) => {
        e.preventDefault();
        applyOtpValue(index, e.clipboardData.getData('text'));
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth={false}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(12px)',
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                },
            }}
            sx={{
                "& .MuiDialog-container": {
                    alignItems: isMobile ? 'flex-end' : 'center',
                },
                "& .MuiDialog-paper": {
                    borderRadius: isMobile ? '24px 24px 0 0' : "24px",
                    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
                    p: { xs: 3, sm: 5 },
                    m: isMobile ? 0 : undefined,
                    width: isMobile ? '100%' : '440px',
                    maxHeight: isMobile ? '85vh' : '90vh',
                    overflowY: 'auto',
                    transition: 'all 0.3s ease-in-out',
                    background: 'linear-gradient(145deg, #ffffff 0%, #fff8f3 100%)',
                    position: 'relative',
                },
                "& .MuiBackdrop-root": {
                    transition: 'all 0.3s ease-in-out',
                },
            }}
        >
            <IconButton
                onClick={handleClose}
                sx={{
                    position: 'absolute',
                    right: 16,
                    top: 16,
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

                <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center', justifyContent: 'center' }}>
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
                    variant="h5"
                    sx={{
                        mt: 0,
                        mb: 1,
                        fontWeight: 700,
                        color: '#0b1a4a',
                        fontSize: '1.75rem',
                    }}
                >
                    {otpSent ? 'Verify OTP' : 'Welcome Back!'}
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        mb: 2,
                        color: '#64748b',
                        fontSize: '0.95rem',
                        textAlign: 'center',
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
                                mb: 3,
                                p: 1.6,
                                boxSizing: 'border-box',
                                border: '1px solid rgba(255, 123, 0, 0.2)',
                                borderRadius: '12px',
                                background: 'rgba(255, 247, 237, 0.78)',
                            }}
                        >
                            <Typography
                                sx={{
                                    color: '#9a3412',
                                    fontSize: '0.78rem',
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

                        <Box sx={{ width: '100%', mb: 3 }}>
                            <TextField
                                fullWidth
                                placeholder="Enter Mobile Number"
                                required
                                variant="outlined"
                                type="tel"
                                inputProps={{
                                    maxLength: 10,
                                    autoComplete: 'tel-national',
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
                        </Box>

                        <Box sx={{ mb: 4, width: '100%' }}>
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
                                    <Typography variant="body2" sx={{ color: '#64748b', ml: 0.5 }}>
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
                            disabled={!agreed || mobileNumber.length < 10 || isLoading}
                            sx={{
                                background: agreed && mobileNumber.length === 10
                                    ? 'linear-gradient(135deg, #FF7B00 0%, #FF6F00 100%)'
                                    : theme.palette.grey[300],
                                color: agreed && mobileNumber.length === 10 ? 'white' : theme.palette.grey[500],
                                textTransform: 'none',
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                borderRadius: '30px',
                                py: 1.6,
                                boxShadow: agreed && mobileNumber.length === 10
                                    ? '0 10px 30px rgba(255, 123, 0, 0.4)'
                                    : 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': {
                                    ...(agreed && mobileNumber.length === 10 ? {
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
                            {isAutoFilling && (
                                <Box sx={{
                                    mb: 2,
                                    p: 1.5,
                                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <Typography sx={{ color: '#22c55e', fontSize: '0.9rem', fontWeight: 600 }}>
                                        ✓ Auto-filling OTP from SMS...
                                    </Typography>
                                </Box>
                            )}
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 2,
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
                                        onPaste={(e) => handleOtpPaste(index, e)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        inputProps={{
                                            maxLength: index === 0 ? OTP_LENGTH : 1,
                                            inputMode: 'numeric',
                                            autoComplete: index === 0 ? 'one-time-code' : 'off',
                                            pattern: '[0-9]*',
                                            style: {
                                                textAlign: 'center',
                                                fontSize: '2rem',
                                                fontWeight: 700,
                                                fontFamily: 'Poppins, sans-serif',
                                            },
                                        }}
                                        variant="outlined"
                                        sx={{
                                            width: '56px',
                                            height: '60px',
                                            '& .MuiOutlinedInput-root': {
                                                width: '100%',
                                                height: '100%',
                                                transition: 'all 0.3s ease',
                                                backgroundColor: isAutoFilling && digit ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                                                '& fieldset': {
                                                    borderColor: isAutoFilling && digit ? '#22c55e' : '#e2e8f0',
                                                    borderWidth: isAutoFilling && digit ? '2px' : '2px',
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
                                        Didn't receive code? Resend OTP
                                    </Link>
                                )}
                            </Box>
                        </Box>

                        {isNewUser && (
                            <Box sx={{ width: '100%', mb: 3 }}>
                                <TextField
                                    fullWidth
                                    placeholder="Choose a username"
                                    variant="outlined"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value.trim())}
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
                            disabled={otpDigits.join('').length < 4 || isLoading}
                            sx={{
                                background: otpDigits.join('').length === 4
                                    ? 'linear-gradient(135deg, #FF7B00 0%, #FF6F00 100%)'
                                    : theme.palette.grey[300],
                                color: otpDigits.join('').length === 4 ? 'white' : theme.palette.grey[500],
                                textTransform: 'none',
                                fontSize: '1.05rem',
                                fontWeight: 700,
                                borderRadius: '30px',
                                py: 1.6,
                                boxShadow: otpDigits.join('').length === 4
                                    ? '0 10px 30px rgba(255, 123, 0, 0.4)'
                                    : 'none',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                gap: 1.5,
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&:hover': {
                                    ...(otpDigits.join('').length === 4 ? {
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
                                    Verify & Login
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
                        mt: 3,
                        mb: 2,
                        color: '#94a3b8',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                        '&:hover': { color: '#FF7B00' },
                        fontWeight: 500,
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
                        fontSize: '0.85rem',
                    }}
                >
                    🔒 Secure & spam-free login
                </Typography>

                {/* Floating Debug Panel */}
                {otpSent && showDebug && (
                    <Box sx={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40%',
                        backgroundColor: '#0f172a',
                        borderTop: '3px solid #22c55e',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideUp 0.3s ease',
                        '@keyframes slideUp': {
                            'from': { transform: 'translateY(100%)' },
                            'to': { transform: 'translateY(0)' },
                        },
                    }}>
                        {/* Header */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            borderBottom: '1px solid #334155',
                            backgroundColor: '#1e293b',
                        }}>
                            <Typography sx={{ color: '#22c55e', fontSize: '1rem', fontWeight: 700 }}>
                                🐛 DEBUG LOGS
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Typography
                                    onClick={() => setDebugLogs([])}
                                    sx={{
                                        color: '#ef4444',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        '&:hover': { textDecoration: 'underline' }
                                    }}
                                >
                                    Clear
                                </Typography>
                                <Typography
                                    onClick={() => setShowDebug(false)}
                                    sx={{
                                        color: '#94a3b8',
                                        fontSize: '1.2rem',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                    }}
                                >
                                    ▼
                                </Typography>
                            </Box>
                        </Box>

                        {/* Logs Container */}
                        <Box sx={{
                            flex: 1,
                            overflowY: 'auto',
                            p: 2,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            lineHeight: 1.6,
                        }}>
                            {debugLogs.length === 0 ? (
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                    Waiting for logs...
                                </Typography>
                            ) : (
                                debugLogs.map((log, idx) => (
                                    <Box key={idx} sx={{ mb: 1, color: '#22c55e' }}>
                                        <span style={{ color: '#64748b' }}>[{log.timestamp}]</span>
                                        {' '}
                                        <span style={{ color: '#22c55e' }}>{log.message}</span>
                                        {log.data && <span style={{ color: '#60a5fa' }}> {typeof log.data === 'string' ? log.data : JSON.stringify(log.data)}</span>}
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Box>
                )}

                {/* Floating Toggle Button */}
                {otpSent && !showDebug && (
                    <Box
                        onClick={() => setShowDebug(true)}
                        sx={{
                            position: 'fixed',
                            bottom: 20,
                            right: 20,
                            backgroundColor: '#22c55e',
                            color: '#0f172a',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
                            zIndex: 9999,
                            '&:hover': {
                                boxShadow: '0 6px 16px rgba(34, 197, 94, 0.6)',
                                transform: 'scale(1.1)',
                            },
                            transition: 'all 0.2s ease',
                        }}
                    >
                        🐛
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default OTPLoginModal;
