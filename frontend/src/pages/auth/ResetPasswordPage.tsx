import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GrassIcon from '@mui/icons-material/Grass';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { useToast } from '../../context/ToastContext';
import authService from '../../services/authService';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Password reset token is required.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authService.resetPassword({
        token: token.trim(),
        new_password: newPassword,
      });

      setSuccess(true);
      showSuccess(res.message || 'Password has been reset successfully!');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2500);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to reset password. The link or token may be invalid or expired.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card
        sx={{
          maxWidth: 460,
          width: '100%',
          borderRadius: 3.5,
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(16px)',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Brand Header */}
        <Box
          sx={{
            py: 3.5,
            px: 3,
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, transparent 100%)',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 54,
              height: 54,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(22, 163, 74, 0.3)',
              mb: 1.5,
            }}
          >
            <GrassIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Set New Password
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Create a secure new password for your Bhagavati Farm ERP account
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 56, color: 'success.main', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Password Reset Successfully!
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 1, mb: 3 }}>
                Your account password has been updated. Redirecting you to the sign-in page...
              </Typography>
              <Button component={Link} to="/login" variant="contained" fullWidth sx={{ py: 1.2, fontWeight: 700 }}>
                Go to Sign In
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleResetPassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {!tokenFromUrl && (
                <TextField
                  label="Reset Token"
                  type="text"
                  required
                  fullWidth
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your reset token from the email"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}

              <TextField
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                required
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                required
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={Boolean(confirmPassword && newPassword !== confirmPassword)}
                helperText={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={<CheckCircleOutlinedIcon />}
                sx={{
                  py: 1.4,
                  fontWeight: 700,
                  fontSize: '1rem',
                  mt: 0.5,
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm New Password'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Button
                  component={Link}
                  to="/login"
                  startIcon={<ArrowBackIcon />}
                  sx={{ color: '#64748b', textTransform: 'none', fontWeight: 600 }}
                >
                  Back to Sign In
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPasswordPage;
