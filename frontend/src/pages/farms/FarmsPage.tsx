import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import StatusChip from '../../components/common/StatusChip';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import farmService from '../../services/farmService';
import { Farm, FarmRequest, FarmType } from '../../types/farm';

export const FarmsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();

  const canCreate = can('create', 'farm');
  const canEdit = can('update', 'farm');
  const canDelete = can('delete', 'farm');

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);

  // Form fields
  const [formData, setFormData] = useState<FarmRequest>({
    name: '',
    location: '',
    owner_name: '',
    farm_type: 'OWN',
    is_active: true,
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchFarms = async () => {
    setLoading(true);
    try {
      const data = await farmService.getAll();
      setFarms(data);
    } catch (e) {
      showError('Failed to load farms list.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarms();
  }, []);

  const handleOpenCreate = () => {
    setEditingFarm(null);
    setFormData({
      name: '',
      location: '',
      owner_name: '',
      farm_type: 'OWN',
      is_active: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (farm: Farm) => {
    setEditingFarm(farm);
    setFormData({
      name: farm.name,
      location: farm.location || '',
      owner_name: farm.owner_name,
      farm_type: farm.farm_type,
      is_active: farm.is_active,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.owner_name.trim()) {
      setModalError('Farm Name and Owner Name are required.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      if (editingFarm) {
        await farmService.update(editingFarm.id, formData);
        showSuccess('Farm updated successfully!');
      } else {
        await farmService.create(formData);
        showSuccess('Farm created successfully!');
      }
      setIsModalOpen(false);
      fetchFarms();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save farm. Please check input values.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!farmToDelete) return;
    setDeleteLoading(true);

    try {
      await farmService.delete(farmToDelete.id);
      showSuccess(`Farm "${farmToDelete.name}" deleted successfully.`);
      setDeleteDialogOpen(false);
      setFarmToDelete(null);
      fetchFarms();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete farm. It may have associated records.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredFarms = farms.filter((f) => {
    if (typeFilter === 'ALL') return true;
    return f.farm_type === typeFilter;
  });

  const columns: Column<Farm>[] = [
    { id: 'name', label: 'Farm Name', minWidth: 160, sortValue: (row) => row.name },
    { id: 'owner_name', label: 'Owner Name', minWidth: 150, sortValue: (row) => row.owner_name },
    { id: 'location', label: 'Location', minWidth: 150, sortValue: (row) => row.location || '', render: (row) => row.location || '-' },
    {
      id: 'farm_type',
      label: 'Type',
      minWidth: 100,
      sortValue: (row) => row.farm_type,
      render: (row) => <StatusChip status={row.farm_type} />,
    },
    {
      id: 'is_active',
      label: 'Status',
      minWidth: 100,
      sortValue: (row) => (row.is_active ? 1 : 0),
      render: (row) => <StatusChip status={row.is_active} />,
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: Farm) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Farm">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Farm">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFarmToDelete(row);
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
        title="Farms Management"
        subtitle="Manage owned agricultural land parcels and sourcing markets"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Farms' }]}
        actionLabel={canCreate ? 'Add Farm' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={filteredFarms}
        loading={loading}
        defaultSortBy="name"
        searchPlaceholder="Search by farm, owner or location..."
        searchField={(row) => `${row.name} ${row.owner_name} ${row.location || ''}`}
        filterComponent={
          <TextField
            select
            size="small"
            label="Filter Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">All Types</MenuItem>
            <MenuItem value="OWN">Owned Farms</MenuItem>
            <MenuItem value="MARKET">Market Sourced</MenuItem>
          </TextField>
        }
        emptyMessage="No farms found. Click 'Add Farm' to register your first farm."
      />

      {/* Create / Edit Modal */}
      <FormModal
        open={isModalOpen}
        title={editingFarm ? 'Edit Farm' : 'Register New Farm'}
        subtitle={editingFarm ? `Updating details for ${editingFarm.name}` : 'Enter the farm details below'}
        loading={modalLoading}
        error={modalError}
        submitLabel={editingFarm ? 'Update Farm' : 'Create Farm'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Farm Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Green Valley Farm"
        />

        <TextField
          label="Owner Name"
          required
          fullWidth
          value={formData.owner_name}
          onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
          placeholder="e.g. Ramesh Patel"
        />

        <TextField
          label="Location / Region"
          fullWidth
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g. Talala, Gir Somnath"
        />

        <TextField
          select
          label="Farm Type"
          required
          fullWidth
          value={formData.farm_type}
          onChange={(e) => setFormData({ ...formData, farm_type: e.target.value as FarmType })}
        >
          <MenuItem value="OWN">OWN (Owned Land)</MenuItem>
          <MenuItem value="MARKET">MARKET (Procurement Source)</MenuItem>
        </TextField>

        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              color="primary"
            />
          }
          label="Farm Active"
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Farm"
        message="Are you sure you want to delete this farm? This action cannot be undone if dispatches are linked."
        itemName={farmToDelete?.name}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setFarmToDelete(null);
        }}
      />
    </Box>
  );
};

export default FarmsPage;
