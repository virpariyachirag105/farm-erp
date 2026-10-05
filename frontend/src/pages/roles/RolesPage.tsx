import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Checkbox,
  Button,
  InputAdornment,
  Grid,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import SearchIcon from '@mui/icons-material/Search';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import StatusChip from '../../components/common/StatusChip';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

import roleService from '../../services/roleService';
import permissionService from '../../services/permissionService';
import { ModulePermissions, Permission, Role, RoleRequest } from '../../types/rbac';

export const RolesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can, hasPermission } = useAuth();

  const canCreate = can('create', 'role');
  const canEdit = can('update', 'role') || hasPermission('role.assign_permissions');
  const canDelete = can('delete', 'role');

  const [roles, setRoles] = useState<Role[]>([]);
  const [modulePermissions, setModulePermissions] = useState<ModulePermissions[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);

  // Form fields
  const [roleName, setRoleName] = useState<string>('');
  const [roleDescription, setRoleDescription] = useState<string>('');
  const [roleIsActive, setRoleIsActive] = useState<boolean>(true);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  // Permission search in modal
  const [permSearch, setPermSearch] = useState<string>('');

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchRolesAndPermissions = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData, allPerms] = await Promise.all([
        roleService.getAll(),
        permissionService.getByModule(),
        permissionService.getAll(),
      ]);
      setRoles(rolesData);
      setModulePermissions(permsData);
      setAllPermissions(allPerms);
    } catch (e) {
      showError('Failed to load roles and permissions.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleDescription('');
    setRoleIsActive(true);
    setSelectedPermissionIds([]);
    setPermSearch('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (role: Role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setRoleIsActive(role.is_active);
    setPermSearch('');
    setModalError(null);
    setIsModalOpen(true);

    // Fetch full role details with permissions
    try {
      const fullRole = await roleService.getById(role.id);
      setSelectedPermissionIds(fullRole.permissions?.map((p) => p.id) || []);
    } catch {
      setSelectedPermissionIds(role.permissions?.map((p) => p.id) || []);
    }
  };

  const handleTogglePermission = (permId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleToggleModuleAll = (modulePerms: Permission[]) => {
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      // Deselect all in module
      setSelectedPermissionIds((prev) => prev.filter((id) => !modulePermIds.includes(id)));
    } else {
      // Select all in module
      setSelectedPermissionIds((prev) => Array.from(new Set([...prev, ...modulePermIds])));
    }
  };

  const handleSelectAllGlobal = () => {
    if (selectedPermissionIds.length === allPermissions.length) {
      setSelectedPermissionIds([]);
    } else {
      setSelectedPermissionIds(allPermissions.map((p) => p.id));
    }
  };

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      setModalError('Role name is required.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: RoleRequest = {
      name: roleName.trim(),
      description: roleDescription.trim() || null,
      is_active: roleIsActive,
      permission_ids: selectedPermissionIds,
    };

    try {
      if (editingRoleId) {
        await roleService.update(editingRoleId, payload);
        showSuccess('Role and permissions updated successfully!');
      } else {
        await roleService.create(payload);
        showSuccess('New role created successfully!');
      }
      setIsModalOpen(false);
      fetchRolesAndPermissions();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save role.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    setDeleteLoading(true);

    try {
      await roleService.delete(roleToDelete.id);
      showSuccess(`Role "${roleToDelete.name}" deleted.`);
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRolesAndPermissions();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete role.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter modules/permissions based on search query
  const filteredModulePermissions = useMemo(() => {
    if (!permSearch.trim()) return modulePermissions;
    const q = permSearch.toLowerCase();
    return modulePermissions
      .map((group) => ({
        module: group.module,
        permissions: group.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.module.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }, [modulePermissions, permSearch]);

  const columns: Column<Role>[] = [
    {
      id: 'name',
      label: 'Role Name',
      minWidth: 180,
      sortValue: (row) => row.name,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: row.name.toUpperCase() === 'ADMIN' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: row.name.toUpperCase() === 'ADMIN' ? '#16a34a' : '#2563eb',
            }}
          >
            {row.name.toUpperCase() === 'ADMIN' ? <LockOutlinedIcon fontSize="small" /> : <SecurityIcon fontSize="small" />}
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {row.name}
              </Typography>
              {row.name.toUpperCase() === 'ADMIN' && (
                <Chip label="Superadmin" size="small" color="success" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {row.description || 'No description provided'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'permissions',
      label: 'Granted Permissions',
      minWidth: 180,
      sortValue: (row) => row.permissions?.length || 0,
      render: (row) => {
        const count = row.permissions?.length || 0;
        const total = allPermissions.length;
        const isAll = count >= total && total > 0;
        return (
          <Chip
            icon={<SecurityIcon style={{ fontSize: 14 }} />}
            label={isAll ? `All Permissions (${count}/${total})` : `${count} Permissions`}
            size="small"
            sx={{
              fontWeight: 600,
              bgcolor: isAll ? 'rgba(34, 197, 94, 0.12)' : 'rgba(100, 116, 139, 0.12)',
              color: isAll ? '#16a34a' : '#334155',
            }}
          />
        );
      },
    },
    {
      id: 'is_active',
      label: 'Status',
      minWidth: 110,
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => <StatusChip status={row.is_active} />,
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 140,
            sortable: false,
            render: (row: Role) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Configure Role & Permissions">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && row.name.toUpperCase() !== 'ADMIN' && (
                  <Tooltip title="Delete Role">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setRoleToDelete(row);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ color: '#ef4444' }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
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
        title="Roles & Access Control (RBAC)"
        subtitle="Define user roles, manage granular system permissions, and configure access levels"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Roles & Permissions' }]}
        actionLabel={canCreate ? 'Create Role' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={roles}
        loading={loading}
        defaultSortBy="name"
        searchPlaceholder="Search roles by name or description..."
        searchField={(row) => `${row.name} ${row.description || ''}`}
        emptyMessage="No roles configured."
      />

      {/* Create / Edit Role Modal */}
      <FormModal
        open={isModalOpen}
        title={editingRoleId ? `Edit Role: ${roleName}` : 'Create New Role'}
        subtitle="Configure role credentials and assign granular permissions across all ERP modules"
        maxWidth="md"
        loading={modalLoading}
        error={modalError}
        submitLabel={editingRoleId ? 'Update Role & Permissions' : 'Create Role'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Role Name"
            required
            fullWidth
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="e.g. Dispatch Officer"
            disabled={roleName.toUpperCase() === 'ADMIN' && editingRoleId !== null}
          />
          <FormControlLabel
            control={
              <Switch
                checked={roleIsActive}
                onChange={(e) => setRoleIsActive(e.target.checked)}
                color="primary"
                disabled={roleName.toUpperCase() === 'ADMIN' && editingRoleId !== null}
              />
            }
            label="Active Role"
            sx={{ minWidth: 140 }}
          />
        </Box>

        <TextField
          label="Role Description"
          fullWidth
          multiline
          rows={2}
          value={roleDescription}
          onChange={(e) => setRoleDescription(e.target.value)}
          placeholder="Brief description of the responsibilities and access granted by this role"
        />

        {/* Permissions Section Header & Controls */}
        <Box sx={{ mt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1.5,
              mb: 1.5,
              pb: 1,
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Module Permissions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Selected: {selectedPermissionIds.length} of {allPermissions.length} permissions
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={handleSelectAllGlobal}
                startIcon={
                  selectedPermissionIds.length === allPermissions.length ? (
                    <CheckBoxOutlineBlankIcon fontSize="small" />
                  ) : (
                    <CheckBoxIcon fontSize="small" />
                  )
                }
              >
                {selectedPermissionIds.length === allPermissions.length ? 'Deselect All' : 'Select All Permissions'}
              </Button>
            </Box>
          </Box>

          {/* Quick Filter Input */}
          <TextField
            size="small"
            fullWidth
            placeholder="Filter permissions by keyword (e.g. create, dealer, delete)..."
            value={permSearch}
            onChange={(e) => setPermSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          {/* Module Cards Grid */}
          <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
            <Grid container spacing={2}>
              {filteredModulePermissions.map((group) => {
                const groupPermIds = group.permissions.map((p) => p.id);
                const selectedInGroup = groupPermIds.filter((id) => selectedPermissionIds.includes(id)).length;
                const isAllGroupSelected = groupPermIds.length > 0 && selectedInGroup === groupPermIds.length;
                const isSomeGroupSelected = selectedInGroup > 0 && !isAllGroupSelected;

                return (
                  <Grid size={{ xs: 12, sm: 6 }} key={group.module}>
                    <Card
                      variant="outlined"
                      sx={{
                        borderRadius: 2.5,
                        borderColor: isAllGroupSelected ? 'primary.main' : '#e2e8f0',
                        bgcolor: isAllGroupSelected ? 'rgba(34, 197, 94, 0.03)' : '#ffffff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        {/* Module Header with Select All toggle */}
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            pb: 1,
                            mb: 1,
                            borderBottom: '1px solid #f1f5f9',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Checkbox
                              size="small"
                              checked={isAllGroupSelected}
                              indeterminate={isSomeGroupSelected}
                              onChange={() => handleToggleModuleAll(group.permissions)}
                              color="primary"
                            />
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                              {group.module.replace(/_/g, ' ')}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${selectedInGroup}/${group.permissions.length}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              bgcolor: selectedInGroup > 0 ? 'primary.light' : '#f1f5f9',
                              color: selectedInGroup > 0 ? 'primary.contrastText' : '#64748b',
                            }}
                          />
                        </Box>

                        {/* Permission checkboxes in module */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, pl: 0.5 }}>
                          {group.permissions.map((perm) => {
                            const isChecked = selectedPermissionIds.includes(perm.id);
                            return (
                              <FormControlLabel
                                key={perm.id}
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.id)}
                                    color="primary"
                                    sx={{ py: 0.25 }}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: '0.8125rem',
                                        fontWeight: isChecked ? 600 : 400,
                                        color: isChecked ? 'text.primary' : 'text.secondary',
                                      }}
                                    >
                                      {perm.action.replace(/_/g, ' ')}
                                      <Typography component="span" variant="caption" sx={{ color: '#94a3b8', ml: 0.75 }}>
                                        ({perm.name})
                                      </Typography>
                                    </Typography>
                                    {perm.description && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                        {perm.description}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                                sx={{ m: 0, alignItems: 'flex-start' }}
                              />
                            );
                          })}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </Box>
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Role"
        message="Are you sure you want to permanently delete this role? This cannot be undone."
        itemName={roleToDelete?.name}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setRoleToDelete(null);
        }}
      />
    </Box>
  );
};

export default RolesPage;
