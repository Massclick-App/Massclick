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
      console.error('Error parsing authUser:', err);
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
            <Box sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#FF8C00' }}>Click to Rate</p>
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
                        },
                        '& .MuiRating-iconFilled, & .MuiRating-iconHover': {
                            color: CUSTOM_STAR_COLOR,
                        },
                    }}
                />

                {value !== null && (
                    <Box sx={{ mt: 1, fontSize: '14px', color: '#1a73e8' }}>
                        {labels[hover !== -1 ? hover : value] || 'Rate Now'}
                    </Box>
                )}
            </Box>
            <OTPLoginModel open={showLoginModal} handleClose={() => setShowLoginModal(false)} />

        </>
    );
}