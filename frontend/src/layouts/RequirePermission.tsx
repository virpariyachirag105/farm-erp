import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/common/LoadingScreen';

interface RequirePermissionProps {
  permission?: string | string[];
  module?: string;
  action?: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  permission,
  module,
  action,
  children,
}) => {
  const { hasPermission, hasModuleAccess, can, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  let hasAccess = false;
  if (action && module) {
    hasAccess = can(action, module);
  } else if (module) {
    hasAccess = hasModuleAccess(module);
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return (
      <Box
        sx={{
          p: 4,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 5,
            maxWidth: 500,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
            Access Restricted
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            You do not have permission to view or manage this module. If you believe this is an error, please contact your system administrator.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ borderRadius: 2, px: 3, py: 1 }}
          >
            Back to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
};

export default RequirePermission;
