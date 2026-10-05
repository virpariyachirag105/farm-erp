import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import AgricultureIcon from '@mui/icons-material/Agriculture';

interface LoadingScreenProps {
  message?: string;
  minHeight?: string | number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading Bhagavati Farm...',
  minHeight = '60vh',
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        gap: 2,
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress size={56} thickness={3.6} sx={{ color: 'primary.main' }} />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AgricultureIcon sx={{ color: 'primary.main', fontSize: 24 }} />
        </Box>
      </Box>
      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingScreen;
