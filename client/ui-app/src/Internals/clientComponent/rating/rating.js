import * as React from 'react';
import Rating from '@mui/material/Rating';
import Box from '@mui/material/Box';
import StarIcon from '@mui/icons-material/Star';
import { useNavigate } from 'react-router-dom'; 
import OTPLoginModel from '../AddBusinessModel.js'

const labels = {
    0.5: 'Useless',
    1: 'Useless+',
    1.5: 'Poor',
    2: 'Poor+',
    2.5: 'Ok',
    3: 'Ok+',
    3.5: 'Good',
    4: 'Good+',
    4.5: 'Excellent',
    5: 'Excellent+',
};
const CUSTOM_STAR_COLOR = '#FF8C00';

export default function UserRatingWidget({
    businessId,
    initialValue = 0,
}) {
    const navigate = useNavigate();

    const [value, setValue] = React.useState(initialValue);
    const [hover, setHover] = React.useState(-1);
    const [showLoginModal, setShowLoginModal] = React.useState(false);

 const getLoggedInUser = () => {
    try {
      const storedUser = localStorage.getItem('authUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (err) {
      return null;
    }
  };

     const handleRatingChange = (event, newValue) => {
    if (!newValue) return;

    const currentUser = getLoggedInUser();

    if (!currentUser || !currentUser.mobileNumber1Verified) {
      setShowLoginModal(true);
      return;
    }

    setValue(newValue);
    navigate(`/write-review/${businessId}/${newValue}`);
  };
    return (
        <>
            <Box sx={{
                alignItems: 'center',
                background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 48%, #eff6ff 100%)',
                border: '1px solid #e5edf7',
                borderRadius: '14px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minHeight: 112,
                px: 2,
                py: 1.5,
            }}>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Start your review</p>
                <Rating
                    name="user-rating-input"
                    value={value}
                    precision={0.5}
                    onChange={handleRatingChange}

                    onChangeActive={(event, newHover) => setHover(newHover)}

                    emptyIcon={<StarIcon style={{ opacity: 0.2 }} fontSize="inherit" />}
                    size="large"
                    sx={{
                        '& .MuiRating-icon': {
                            fontSize: '2rem',
                            marginInline: '1px',
                        },
                        '& .MuiRating-iconFilled, & .MuiRating-iconHover': {
                            color: CUSTOM_STAR_COLOR,
                        },
                        '& .MuiRating-iconEmpty': {
                            color: '#cbd5e1',
                        },
                    }}
                />

                {value !== null && (
                    <Box sx={{
                        background: '#ffffff',
                        border: '1px solid #dbeafe',
                        borderRadius: '999px',
                        color: '#0f5fd7',
                        fontSize: '13px',
                        fontWeight: 800,
                        lineHeight: 1,
                        mt: 1,
                        px: 1.4,
                        py: 0.75,
                    }}>
                        {labels[hover !== -1 ? hover : value] || 'Rate Now'}
                    </Box>
                )}
            </Box>
            <OTPLoginModel open={showLoginModal} handleClose={() => setShowLoginModal(false)} />

        </>
    );
}
