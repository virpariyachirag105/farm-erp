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
  Chip,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import GrassIcon from '@mui/icons-material/Grass';

import { useNavigate, Navigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import authService from '../../services/authService';

type AuthMode = 'signin' | 'register' | 'forgot';

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Mode state: 'signin' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Sign In States
  const [loginEmail, setLoginEmail] = useState('chirag.admin@gamil.com');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Resend Verification States
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [unverifiedEmailForResend, setUnverifiedEmailForResend] = useState<string | null>(null);

  // Common States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleTabChange = (_: React.SyntheticEvent, newValue: 'signin' | 'register') => {
    setAuthMode(newValue);
    setError(null);
    setEmailSent(false);
    setRegisteredEmail(null);
    setResendSuccess(null);
    setUnverifiedEmailForResend(null);
  };

  // --- Handlers ---

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setResendSuccess(null);
    setUnverifiedEmailForResend(null);

    try {
      const response = await authService.login({ email: loginEmail, password: loginPassword });
      showSuccess(`Welcome back, ${response.user.name}!`);
      login(response.access_token, response.user);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number; data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(msg);
      showError(msg);
      if (errorObj?.response?.status === 403 || msg.toLowerCase().includes('verify')) {
        setUnverifiedEmailForResend(loginEmail.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    setError(null);
    setResendSuccess(null);

    try {
      const response = await authService.register({
        name: regName,
        email: regEmail,
        password: regPassword,
        mobile: regMobile.trim() || undefined,
      });

      setRegisteredEmail(regEmail);
      showSuccess(response.message || 'Registration successful! Verification email sent.');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Registration failed. Please try again.';
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (targetEmail: string) => {
    if (!targetEmail) return;
    setResendLoading(true);
    setResendSuccess(null);
    setError(null);

    try {
      const res = await authService.resendVerification(targetEmail);
      const msg = res.message || 'Verification link resent successfully! Check your inbox.';
      setResendSuccess(msg);
      showSuccess(msg);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to resend verification email. Please wait before retrying.';
      setError(msg);
      showError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.forgotPassword({ email: forgotEmail.trim() });
      setEmailSent(true);
      showSuccess('Password reset link sent successfully.');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to send password reset email. Please verify your email.';
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
          maxWidth: 480,
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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Bhagavati Farm
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            {authMode === 'signin' && 'Sign in to access your farm management portal'}
            {authMode === 'register' && 'Create your account to start managing farm operations'}
            {authMode === 'forgot' && 'Reset your account password'}
          </Typography>
        </Box>

        {/* Tab switcher for Sign In / Register (hidden on forgot password) */}
        {authMode !== 'forgot' && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1 }}>
            <Tabs
              value={authMode}
              onChange={handleTabChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{
                '& .MuiTab-root': {
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  py: 1.5,
                },
              }}
            >
              <Tab value="signin" label="Sign In" />
              <Tab value="register" label="Create Account" />
            </Tabs>
          </Box>
        )}

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {resendSuccess && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setResendSuccess(null)}>
              {resendSuccess}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
              {unverifiedEmailForResend && (
                <Box sx={{ mt: 1.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={resendLoading}
                    onClick={() => handleResendVerification(unverifiedEmailForResend)}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    {resendLoading ? <CircularProgress size={16} /> : 'Resend Verification Email'}
                  </Button>
                </Box>
              )}
            </Alert>
          )}

          {/* 1. SIGN IN VIEW */}
          {authMode === 'signin' && (
            <Box component="form" onSubmit={handleSignIn} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Email Address"
                type="email"
                required
                fullWidth
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
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

              <Box>
                <TextField
                  label="Password"
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowLoginPassword(!showLoginPassword)} edge="end" size="small">
                            {showLoginPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setAuthMode('forgot');
                      setForgotEmail(loginEmail);
                      setError(null);
                      setEmailSent(false);
                      setRegisteredEmail(null);
                    }}
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      color: 'primary.main',
                      p: 0,
                      '&:hover': { background: 'transparent', textDecoration: 'underline' },
                    }}
                  >
                    Forgot Password?
                  </Button>
                </Box>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.4,
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Divider sx={{ my: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  OR
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Don't have an account?{' '}
                  <Button
                    variant="text"
                    onClick={() => {
                      setAuthMode('register');
                      setError(null);
                      setRegisteredEmail(null);
                    }}
                    sx={{ fontWeight: 700, p: 0, minWidth: 'auto', textTransform: 'none' }}
                  >
                    Register Now
                  </Button>
                </Typography>
              </Box>

              {/* Demo credentials helper */}
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1, fontWeight: 600 }}>
                  Demo Admin Credentials
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    label="chirag.admin@gamil.com"
                    size="small"
                    variant="outlined"
                    onClick={() => setLoginEmail('chirag.admin@gamil.com')}
                    sx={{ fontSize: '0.75rem', cursor: 'pointer' }}
                  />
                  <Chip
                    label="Password: admin123"
                    size="small"
                    color="primary"
                    onClick={() => setLoginPassword('admin123')}
                    sx={{ fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  />
                </Box>
              </Box>
            </Box>
          )}

          {/* 2. REGISTER VIEW */}
          {authMode === 'register' && (
            registeredEmail ? (
              /* Post-Registration Verification Notice */
              <Box sx={{ textAlign: 'center', py: 1 }}>
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
                  <MarkEmailReadOutlinedIcon sx={{ fontSize: 38 }} />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                  Verify Your Email Address
                </Typography>

                <Typography variant="body2" sx={{ color: '#475569', mb: 2.5, lineHeight: 1.6 }}>
                  We've sent a verification link to:
                  <br />
                  <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>{registeredEmail}</strong>
                </Typography>

                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    mb: 3,
                    textAlign: 'left',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', lineHeight: 1.5 }}>
                    • Please check your inbox and click the <strong>Verify Email</strong> link.
                    <br />
                    • The link is valid for <strong>24 hours</strong>.
                    <br />
                    • If you don't see it, please check your spam or promotions folder.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    onClick={() => handleResendVerification(registeredEmail)}
                    disabled={resendLoading}
                    sx={{ py: 1.2, fontWeight: 700, textTransform: 'none' }}
                  >
                    {resendLoading ? <CircularProgress size={20} /> : 'Resend Verification Email'}
                  </Button>

                  <Button
                    variant="text"
                    onClick={() => {
                      setAuthMode('signin');
                      setLoginEmail(registeredEmail);
                      setRegisteredEmail(null);
                      setError(null);
                    }}
                    sx={{ color: '#64748b', fontWeight: 600, textTransform: 'none' }}
                  >
                    Back to Sign In
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Full Name"
                  type="text"
                  required
                  fullWidth
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Email Address"
                  type="email"
                  required
                  fullWidth
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
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

                <TextField
                  label="Mobile Number"
                  type="tel"
                  fullWidth
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="e.g. 9876543210 (optional)"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Password (min. 6 characters)"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowRegPassword(!showRegPassword)} edge="end" size="small">
                            {showRegPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Confirm Password"
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  error={Boolean(regConfirmPassword && regPassword !== regConfirmPassword)}
                  helperText={regConfirmPassword && regPassword !== regConfirmPassword ? 'Passwords do not match' : ''}
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
                  sx={{
                    py: 1.4,
                    fontWeight: 700,
                    fontSize: '1rem',
                    mt: 1,
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 1 }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Already registered?{' '}
                    <Button
                      variant="text"
                      onClick={() => {
                        setAuthMode('signin');
                        setError(null);
                      }}
                      sx={{ fontWeight: 700, p: 0, minWidth: 'auto', textTransform: 'none' }}
                    >
                      Sign In
                    </Button>
                  </Typography>
                </Box>
              </Box>
            )
          )}

          {/* 3. FORGOT PASSWORD (EMAIL DISPATCH) VIEW */}
          {authMode === 'forgot' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setAuthMode('signin');
                  setError(null);
                  setEmailSent(false);
                }}
                sx={{ alignSelf: 'flex-start', color: '#64748b', textTransform: 'none', fontWeight: 600, mb: 0.5 }}
              >
                Back to Sign In
              </Button>

              {!emailSent ? (
                /* Step 1: Input email to request reset link */
                <Box component="form" onSubmit={handleSendResetEmail} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                    Enter your registered account email below. We'll send a secure link to reset your password.
                  </Typography>

                  <TextField
                    label="Registered Email Address"
                    type="email"
                    required
                    fullWidth
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
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
                    disabled={loading}
                    startIcon={<SendOutlinedIcon />}
                    sx={{
                      py: 1.4,
                      fontWeight: 700,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Password Reset Link'}
                  </Button>
                </Box>
              ) : (
                /* Step 2: Confirmation screen after email is sent */
                <Box sx={{ textAlign: 'center', py: 1 }}>
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
                    <MarkEmailReadOutlinedIcon sx={{ fontSize: 38 }} />
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
                    Check Your Email
                  </Typography>

                  <Typography variant="body2" sx={{ color: '#475569', mb: 2.5, lineHeight: 1.6 }}>
                    We have sent a password reset link to:
                    <br />
                    <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>{forgotEmail}</strong>
                  </Typography>

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      mb: 3,
                      textAlign: 'left',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', lineHeight: 1.5 }}>
                      • Click the <strong>Reset Password</strong> button in the email to set a new password.
                      <br />
                      • The link is valid for <strong>30 minutes</strong>.
                      <br />
                      • If you don't see it in a few minutes, please check your spam folder.
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={() => handleSendResetEmail()}
                      disabled={loading}
                      sx={{ py: 1.2, fontWeight: 700, textTransform: 'none' }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Resend Email'}
                    </Button>

                    <Button
                      variant="text"
                      onClick={() => {
                        setAuthMode('signin');
                        setError(null);
                        setEmailSent(false);
                      }}
                      sx={{ color: '#64748b', fontWeight: 600, textTransform: 'none' }}
                    >
                      Back to Sign In
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
