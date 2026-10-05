import React, { useEffect, useState, useRef } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Avatar,
  Typography,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import StatusChip from '../../components/common/StatusChip';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import userService from '../../services/userService';
import roleService from '../../services/roleService';
import authService from '../../services/authService';
import { User, UserRequest } from '../../types/auth';
import { Role } from '../../types/rbac';

export const UsersPage: React.FC = () => {
  const { user: currentUser, can, hasPermission, isAdmin } = useAuth();
  const { showSuccess, showError } = useToast();

  const canCreate = can('create', 'user');
  const canEdit = can('update', 'user');
  const canDelete = can('delete', 'user');
  const canUpload = hasPermission('user.upload_image');
  const canResendLink = canEdit || canCreate || isAdmin;

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form fields
  const [formData, setFormData] = useState<UserRequest>({
    name: '',
    email: '',
    password: '',
    mobile: '',
    role_id: undefined,
    role: 'STAFF',
    is_active: true,
    is_verified: false,
  });

  // Permanent Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Resend verification link per-user state
  const [resendingUserId, setResendingUserId] = useState<number | null>(null);

  // Hidden file input for image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingUserId, setUploadingUserId] = useState<number | null>(null);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        userService.getAll(),
        roleService.getAll(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (e) {
      showError('Failed to load user accounts.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleOpenCreate = () => {
    setEditingUser(null);
    const defaultStaffRole = roles.find((r) => r.name.toUpperCase() === 'STAFF') || roles[0];
    setFormData({
      name: '',
      email: '',
      password: '',
      mobile: '',
      role_id: defaultStaffRole?.id,
      role: defaultStaffRole?.name || 'STAFF',
      is_active: true,
      is_verified: false,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Leave blank unless updating
      mobile: user.mobile || '',
      role_id: user.role_id || user.role_rel?.id,
      role: user.role_rel?.name || user.role || 'STAFF',
      is_active: user.is_active,
      is_verified: user.is_verified,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setModalError('Name and Email are required.');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setModalError('Password must be at least 6 characters for a new account.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: UserRequest = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password ? formData.password : undefined,
      mobile: formData.mobile?.trim() || null,
      role_id: formData.role_id,
      role: formData.role,
      is_active: formData.is_active,
      is_verified: formData.is_verified,
    };

    try {
      if (editingUser) {
        await userService.update(editingUser.id, payload);
        showSuccess(`User "${formData.name}" updated successfully!`);
      } else {
        await userService.create(payload);
        showSuccess(`User "${formData.name}" created successfully!`);
      }
      setIsModalOpen(false);
      fetchUsersAndRoles();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save user account.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSendVerificationLink = async (targetUser: User) => {
    setResendingUserId(targetUser.id);
    try {
      const response = await authService.resendVerification(targetUser.email);
      showSuccess(response.message || `Verification link sent to ${targetUser.email}`);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || `Failed to send verification link to ${targetUser.email}`;
      showError(msg);
    } finally {
      setResendingUserId(null);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);

    try {
      await userService.delete(userToDelete.id);
      showSuccess(`User "${userToDelete.name}" and all assigned permissions have been permanently deleted.`);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsersAndRoles();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to permanently delete user.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleTriggerUpload = (userId: number) => {
    setUploadingUserId(userId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !uploadingUserId) return;
    const file = e.target.files[0];

    try {
      await userService.uploadImage(uploadingUserId, file);
      showSuccess('Profile avatar updated successfully!');
      fetchUsersAndRoles();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to upload user image.';
      showError(msg);
    } finally {
      setUploadingUserId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const columns: Column<User>[] = [
    {
      id: 'name',
      label: 'User Account',
      minWidth: 200,
      sortValue: (row) => row.name,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={row.image || undefined}
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}
          >
            {row.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {row.name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'role',
      label: 'Role & Permissions',
      minWidth: 160,
      sortValue: (row) => row.role_rel?.name || row.role || '',
      render: (row) => {
        const roleName = row.role_rel?.name || row.role || 'STAFF';
        const permsCount = row.permissions?.length || 0;
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
            <StatusChip status={roleName} />
            {permsCount > 0 && (
              <Chip
                icon={<SecurityIcon style={{ fontSize: 12 }} />}
                label={`${permsCount} perms`}
                size="small"
                variant="outlined"
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Box>
        );
      },
    },
    {
      id: 'mobile',
      label: 'Mobile',
      minWidth: 120,
      sortValue: (row) => row.mobile || '',
      render: (row) => row.mobile || '-',
    },
    {
      id: 'is_active',
      label: 'Account Status',
      minWidth: 120,
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => (
        <StatusChip
          status={row.is_active ? 'ACTIVE' : 'INACTIVE'}
          label={row.is_active ? 'Active' : 'Inactive'}
        />
      ),
    },
    {
      id: 'is_verified',
      label: 'Email Verification',
      minWidth: 220,
      sortValue: (row) => (row.is_verified ? 1 : 0),
      render: (row) => {
        const isResending = resendingUserId === row.id;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {row.is_verified ? (
              <Chip
                icon={<CheckCircleOutlinedIcon style={{ fontSize: 15, color: '#16a34a' }} />}
                label="Verified"
                size="small"
                sx={{
                  bgcolor: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            ) : (
              <>
                <Chip
                  icon={<MarkEmailUnreadOutlinedIcon style={{ fontSize: 15, color: '#b45309' }} />}
                  label="Not Verified"
                  size="small"
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                />
                {canResendLink && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={isResending}
                    onClick={() => handleSendVerificationLink(row)}
                    startIcon={
                      isResending ? (
                        <CircularProgress size={12} color="inherit" />
                      ) : (
                        <SendOutlinedIcon style={{ fontSize: 13 }} />
                      )
                    }
                    sx={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      py: 0.2,
                      px: 1,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      height: 24,
                      borderColor: '#f59e0b',
                      color: '#d97706',
                      '&:hover': {
                        borderColor: '#d97706',
                        bgcolor: 'rgba(245, 158, 11, 0.08)',
                      },
                    }}
                  >
                    {isResending ? 'Sending...' : 'Send Link'}
                  </Button>
                )}
              </>
            )}
          </Box>
        );
      },
    },
    ...(canUpload || canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 140,
            sortable: false,
            render: (row: User) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canUpload && (
                  <Tooltip title="Upload Profile Picture">
                    <IconButton size="small" onClick={() => handleTriggerUpload(row.id)} sx={{ color: '#64748b' }}>
                      <PhotoCameraIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canEdit && (
                  <Tooltip title="Edit User">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && row.id !== currentUser?.id && (
                  <Tooltip title="Permanently Delete User">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setUserToDelete(row);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{
                        color: '#ef4444',
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                      }}
                    >
                      <DeleteForeverOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            ),
          },
        ]
      : []),
  ];

  return (
    <Box>
      <PageHeader
        title="User Accounts & Access"
        subtitle="Manage user credentials, verification status, active states, and assign system access roles"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Users' }]}
        actionLabel={canCreate ? 'Add User' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      {/* Hidden file input for picture upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        style={{ display: 'none' }}
        accept="image/*"
      />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        defaultSortBy="name"
        searchPlaceholder="Search by name, email, or mobile..."
        searchField={(row) => `${row.name} ${row.email} ${row.mobile || ''} ${row.role_rel?.name || row.role || ''}`}
        emptyMessage="No users registered."
      />

      {/* Create / Edit Modal */}
      <FormModal
        open={isModalOpen}
        title={editingUser ? 'Edit User Account' : 'Register New User'}
        subtitle={editingUser ? `Updating account for ${editingUser.name}` : 'Set login credentials and role'}
        loading={modalLoading}
        error={modalError}
        submitLabel={editingUser ? 'Update Account' : 'Create User'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Full Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Ramesh Patel"
        />

        <TextField
          label="Email Address"
          type="email"
          required
          fullWidth
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="e.g. ramesh@farm-erp.com"
        />

        <TextField
          label={editingUser ? 'Password (leave blank to keep unchanged)' : 'Initial Password'}
          type="password"
          required={!editingUser}
          fullWidth
          value={formData.password || ''}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Min 6 characters"
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Mobile Number"
            fullWidth
            value={formData.mobile || ''}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="e.g. 9876543210"
          />

          <TextField
            select
            label="Role & Access"
            required
            fullWidth
            value={formData.role_id || ''}
            onChange={(e) => {
              const selectedRoleId = Number(e.target.value);
              const selectedRoleObj = roles.find((r) => r.id === selectedRoleId);
              setFormData({
                ...formData,
                role_id: selectedRoleId,
                role: selectedRoleObj?.name || 'STAFF',
              });
            }}
          >
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.name} {r.description ? `(${r.description})` : ''}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, pt: 1, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Account Active ({formData.is_active ? 'Active' : 'Inactive'})
              </Typography>
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={Boolean(formData.is_verified)}
                onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                color="success"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Email Verified ({formData.is_verified ? 'Verified' : 'Not Verified'})
              </Typography>
            }
          />
        </Box>
      </FormModal>

      {/* Permanent Deletion Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Permanently Delete User"
        message="Are you sure you want to permanently delete this user? This will delete the user account, login credentials, and all role assignments associated with this user. This action cannot be undone."
        itemName={userToDelete ? `${userToDelete.name} (${userToDelete.email})` : undefined}
        confirmText="Delete Permanently"
        confirmColor="error"
        loading={deleteLoading}
        onConfirm={handleConfirmPermanentDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
      />
    </Box>
  );
};

export default UsersPage;
