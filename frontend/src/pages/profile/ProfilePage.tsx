import React, { useState, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Grid,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import KeyIcon from '@mui/icons-material/Key';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import authService from '../../services/authService';
import userService from '../../services/userService';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !email.trim()) {
      showError('Name and Email are required.');
      return;
    }

    setProfileLoading(true);
    try {
      await userService.update(user.id, {
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim() || null,
      });
      await refreshUser();
      showSuccess('Profile details updated successfully!');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to update profile.';
      showError(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    setImageLoading(true);
    try {
      await userService.uploadImage(user.id, file);
      await refreshUser();
      showSuccess('Profile avatar updated successfully!');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to upload image.';
      showError(msg);
    } finally {
      setImageLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      showSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to update password. Verify your current password.';
      setPasswordError(msg);
      showError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="My Profile & Security"
        subtitle="Manage your personal profile details, account credentials, and reset password"
      />

      <Grid container spacing={3}>
        {/* Top: Avatar & User Summary Card */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={user?.image || undefined}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                <IconButton
                  size="small"
                  disabled={imageLoading}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    '&:hover': { backgroundColor: '#f1f5f9' },
                  }}
                >
                  {imageLoading ? <CircularProgress size={16} /> : <PhotoCameraIcon fontSize="small" color="primary" />}
                </IconButton>
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {user?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  {user?.email}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={user?.role_rel?.name || user?.role || 'STAFF'}
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                  />
                  <Chip
                    label={user?.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    variant="outlined"
                    color={user?.is_active ? 'success' : 'default'}
                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Side-by-Side: 1. Edit Profile Form Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 18px rgba(0,0,0,0.06)', height: '100%' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonOutlinedIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Edit Profile Information
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                Update your account's public name, email address, and contact number.
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              <Box component="form" onSubmit={handleUpdateProfile} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                <TextField
                  label="Full Name"
                  required
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
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

                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={profileLoading}
                    sx={{
                      py: 1.2,
                      fontWeight: 700,
                      alignSelf: 'flex-start',
                      px: 3,
                    }}
                  >
                    {profileLoading ? <CircularProgress size={22} color="inherit" /> : 'Save Profile Changes'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Side-by-Side: 2. Change / Reset Password Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 18px rgba(0,0,0,0.06)', height: '100%' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <KeyIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Reset / Change Password
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                Keep your account secure by choosing a strong password with at least 6 characters.
              </Typography>
              <Divider sx={{ mb: 2.5 }} />

              {passwordError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setPasswordError(null)}>
                  {passwordError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
                <TextField
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" size="small">
                            {showCurrentPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="New Password (min 6 characters)"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  fullWidth
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={Boolean(currentPassword && newPassword && currentPassword === newPassword)}
                  helperText={
                    currentPassword && newPassword && currentPassword === newPassword
                      ? 'New password cannot be the same as your current password'
                      : ''
                  }
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small">
                            {showNewPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <TextField
                  label="Confirm New Password"
                  type={showNewPassword ? 'text' : 'password'}
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
                          <CheckCircleIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Box sx={{ mt: 'auto', pt: 1 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={passwordLoading}
                    sx={{
                      py: 1.2,
                      fontWeight: 700,
                      alignSelf: 'flex-start',
                      px: 3,
                    }}
                  >
                    {passwordLoading ? <CircularProgress size={22} color="inherit" /> : 'Update Password'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bottom: Role & Permissions Card */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <SecurityIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Assigned Role & Permissions
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5 }}>
                Your current role is <strong>{user?.role_rel?.name || user?.role || 'Staff'}</strong> with the following system capabilities:
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {user?.permissions && user.permissions.length > 0 ? (
                  user.permissions.map((perm) => (
                    <Chip
                      key={perm}
                      label={perm}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.75rem',
                        borderColor: '#cbd5e1',
                        color: '#334155',
                        backgroundColor: '#f8fafc',
                      }}
                    />
                  ))
                ) : (
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    Standard staff permissions
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
