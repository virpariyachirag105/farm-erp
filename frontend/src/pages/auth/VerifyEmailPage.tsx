import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import GrassIcon from '@mui/icons-material/Grass';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { useToast } from '../../context/ToastContext';
import authService from '../../services/authService';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [verifying, setVerifying] = useState<boolean>(Boolean(token));
  const [verified, setVerified] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend state
  const [resendEmail, setResendEmail] = useState<string>('');
  const [resending, setResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMessage('No verification token found in link. Please enter your email below to receive a new link.');
      setVerifying(false);
      return;
    }

    const performVerification = async () => {
      setVerifying(true);
      setErrorMessage(null);
      try {
        const response = await authService.verifyEmail(token);
        setVerified(true);
        showSuccess(response.message || 'Email verified successfully!');
      } catch (err: unknown) {
        const errorObj = err as { response?: { data?: { detail?: string } } };
        const msg = errorObj?.response?.data?.detail || 'Invalid or expired verification link.';
        setErrorMessage(msg);
        showError(msg);
      } finally {
        setVerifying(false);
      }
    };

    performVerification();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      showError('Please enter your email address.');
      return;
    }

    setResending(true);
    setResendSuccess(null);

    try {
      const response = await authService.resendVerification(resendEmail.trim());
      setResendSuccess(response.message || 'Verification link sent! Please check your inbox.');
      showSuccess('Verification email sent successfully.');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to resend verification email.';
      showError(msg);
    } finally {
      setResending(false);
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
            Email Verification
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Bhagavati Farm Account Activation
          </Typography>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {/* 1. Loading State */}
          {verifying && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={48} color="primary" sx={{ mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Verifying your email...
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                Please wait while we validate your activation token.
              </Typography>
            </Box>
          )}

          {/* 2. Success State */}
          {!verifying && verified && (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: 'primary.main',
                  mb: 2,
                }}
              >
                <CheckCircleOutlinedIcon sx={{ fontSize: 42 }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                Email Verified!
              </Typography>

              <Typography variant="body2" sx={{ color: '#475569', mb: 3.5, lineHeight: 1.6 }}>
                Your email address has been successfully verified. Your account is now active and ready to use.
              </Typography>

              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={() => navigate('/login')}
                sx={{
                  py: 1.4,
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                }}
              >
                Sign In to Your Account
              </Button>
            </Box>
          )}

          {/* 3. Error or Resend State */}
          {!verifying && !verified && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {errorMessage && (
                <Alert
                  severity="error"
                  icon={<ErrorOutlineOutlinedIcon fontSize="inherit" />}
                  sx={{ borderRadius: 2 }}
                >
                  {errorMessage}
                </Alert>
              )}

              {resendSuccess && (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  {resendSuccess}
                </Alert>
              )}

              <Box component="form" onSubmit={handleResend} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Need a new verification link? Enter your registered email address below:
                </Typography>

                <TextField
                  label="Registered Email Address"
                  type="email"
                  required
                  fullWidth
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="user@example.com"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={resending}
                  startIcon={<SendOutlinedIcon />}
                  sx={{
                    py: 1.3,
                    fontWeight: 700,
                    fontSize: '0.95rem',
                  }}
                >
                  {resending ? <CircularProgress size={22} color="inherit" /> : 'Resend Verification Link'}
                </Button>
              </Box>

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

export default VerifyEmailPage;
