// src/components/Header.js
import React from "react";
import {
    AppBar,
    Toolbar,
    Box,
    Container,
    Typography,
    Button,
    IconButton,
    Badge,
    Avatar,
    useMediaQuery,
    useTheme,
    Divider,
    Drawer,
    List,
    ListItem,
    ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import massClickLogo from '../../assets/mclogo.png';
import MI from '../../assets/Mi.png';

const navLinks = ["About Us", "Services", "Testimonials", "Portfolio"];

const Header = ({ }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    // Mobile Drawer Menu
    const drawer = (
        <Box sx={{ width: 250, p: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <img
                    src={massClickLogo}
                    alt="MassClick Logo"
                    style={{ height: 40, marginRight: 10 }}
                />
            </Box>
            <Divider />
            <List>
                {navLinks.map((text) => (
                    <ListItem button key={text}>
                        <ListItemText
                            primary={text}
                            primaryTypographyProps={{
                                fontSize: "1rem",
                                fontWeight: 500,
                                color: "text.primary",
                            }}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <>
            <AppBar
                position="sticky"
                color="inherit"
                sx={{
                    borderBottom: "1px solid #e0e0e0",
                    boxShadow: "0px 2px 6px rgba(0,0,0,0.05)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <Container maxWidth="lg">
                    <Toolbar disableGutters sx={{ justifyContent: "space-between", py: 1 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                fontFamily: "'Poppins', sans-serif",
                                fontWeight: 700,
                                fontSize: '1.8rem',
                                color: '#ea6d11',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
                            }}
                        >
                            <img
                                src={MI}
                                alt="Logo"
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                }}
                            />

                            {/* Text */}
                            <span>
                                Mass<span style={{ color: '#ff9c3b' }}>click</span>
                            </span>
                        </div>

                        {!isMobile && (
                            <Box sx={{ display: "flex", gap: 3 }}>
                                {navLinks.map((link) => (
                                    <Button
                                        key={link}
                                        color="inherit"
                                        sx={{
                                            color: "text.primary",
                                            fontWeight: 500,
                                            "&:hover": {
                                                color: "primary.main",
                                                backgroundColor: "transparent",
                                            },
                                        }}
                                    >
                                        {link}
                                    </Button>
                                ))}
                            </Box>
                        )}

                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            {!isMobile && (
                                <>
                                    <IconButton color="inherit" sx={{ p: 0 }}>
                                        <Badge badgeContent={4} color="secondary">
                                            <NotificationsIcon sx={{ color: "text.secondary" }} />
                                        </Badge>
                                    </IconButton>
                                    <IconButton color="inherit" sx={{ p: 0 }}>
                                        <Avatar sx={{ width: 34, height: 34, bgcolor: "secondary.main" }}>
                                            <PersonIcon sx={{ color: "white" }} />
                                        </Avatar>
                                    </IconButton>
                                </>
                            )}

                            {isMobile && (
                                <IconButton
                                    color="inherit"
                                    edge="end"
                                    onClick={handleDrawerToggle}
                                    sx={{ color: "text.primary" }}
                                >
                                    <MenuIcon />
                                </IconButton>
                            )}
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            <Drawer
                anchor="right"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                PaperProps={{
                    sx: { backgroundColor: "background.paper", borderLeft: "1px solid #e0e0e0" },
                }}
            >
                {drawer}
            </Drawer>
        </>
    );
};

export default Header;
