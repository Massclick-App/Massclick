import * as React from 'react';
import { styled } from '@mui/material/styles';
import Divider, { dividerClasses } from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MuiMenuItem from '@mui/material/MenuItem';
import { paperClasses } from '@mui/material/Paper';
import { listClasses } from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon, { listItemIconClasses } from '@mui/material/ListItemIcon';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuButton from './MenuButton'; // Assuming this is your custom component
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/actions/authAction.js'; // Ensure the path is correct
import AccountCircleRoundedIcon from '@mui/icons-material/AccountCircleRounded';
import Box from '@mui/material/Box';

const MenuItem = styled(MuiMenuItem)({
    margin: '2px 0',
});

export default function OptionsMenu() {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const open = Boolean(anchorEl);
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const navigate = useNavigate();

    // Handler to close the menu
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleProfileClick = () => {
        handleClose();          
        navigate('/dashboard/profile');   
    };

    const handleLogout = async () => {
        const id = user?._id?.$oid;
        await dispatch(logout(id));
        handleClose();
        navigate('/admin');
    };

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };



    return (
        <React.Fragment>
            <MenuButton
                aria-label="Open menu"
                onClick={handleClick}
                sx={{ borderColor: 'transparent', p: 0 }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                >
                    <AccountCircleRoundedIcon sx={{ width: 40, height: 40, color: 'primary.main' }} />
                </Box>
            </MenuButton>

            <Menu
                anchorEl={anchorEl}
                id="menu"
                open={open}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                sx={{
                    [`& .${listClasses.root}`]: { padding: '4px' },
                    [`& .${paperClasses.root}`]: { padding: 0 },
                    [`& .${dividerClasses.root}`]: { margin: '4px -4px' },
                }}
            >
                <MenuItem onClick={handleProfileClick}>
                    Profile
                </MenuItem>
                <MenuItem onClick={handleProfileClick}>
                    My account
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleClose}>Add another account</MenuItem>
                <MenuItem onClick={handleClose}>Settings</MenuItem>
                <Divider />
                <MenuItem
                    onClick={handleLogout}
                    sx={{
                        [`& .${listItemIconClasses.root}`]: { ml: 'auto', minWidth: 0 },
                    }}
                >
                    <ListItemText>Logout</ListItemText>
                    <ListItemIcon>
                        <LogoutRoundedIcon fontSize="small" />
                    </ListItemIcon>
                </MenuItem>

            </Menu>
        </React.Fragment>
    );
}