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
import dealerService from '../../services/dealerService';
import { Dealer, DealerRequest, DealerType } from '../../types/dealer';

export const DealersPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();

  const canCreate = can('create', 'dealer');
  const canEdit = can('update', 'dealer');
  const canDelete = can('delete', 'dealer');

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter
  const [commissionFilter, setCommissionFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);

  // Form fields
  const [formData, setFormData] = useState<DealerRequest>({
    name: '',
    city: '',
    mobile: '',
    address: '',
    commission_type: 'PERCENTAGE',
    commission_value: 10.0,
    is_active: true,
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [dealerToDelete, setDealerToDelete] = useState<Dealer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchDealers = async () => {
    setLoading(true);
    try {
      const data = await dealerService.getAll();
      setDealers(data);
    } catch (e) {
      showError('Failed to load dealers.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDealers();
  }, []);

  const handleOpenCreate = () => {
    setEditingDealer(null);
    setFormData({
      name: '',
      city: '',
      mobile: '',
      address: '',
      commission_type: 'PERCENTAGE',
      commission_value: 10.0,
      is_active: true,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dealer: Dealer) => {
    setEditingDealer(dealer);
    setFormData({
      name: dealer.name,
      city: dealer.city || '',
      mobile: dealer.mobile || '',
      address: dealer.address || '',
      commission_type: dealer.commission_type,
      commission_value: Number(dealer.commission_value),
      is_active: dealer.is_active,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setModalError('Dealer Name is required.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      if (editingDealer) {
        await dealerService.update(editingDealer.id, formData);
        showSuccess('Dealer updated successfully!');
      } else {
        await dealerService.create(formData);
        showSuccess('Dealer registered successfully!');
      }
      setIsModalOpen(false);
      fetchDealers();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save dealer.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!dealerToDelete) return;
    setDeleteLoading(true);

    try {
      await dealerService.delete(dealerToDelete.id);
      showSuccess(`Dealer "${dealerToDelete.name}" deleted.`);
      setDeleteDialogOpen(false);
      setDealerToDelete(null);
      fetchDealers();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete dealer. Check for linked dispatches or payments.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredDealers = dealers.filter((d) => {
    if (commissionFilter === 'ALL') return true;
    return d.commission_type === commissionFilter;
  });

  const columns: Column<Dealer>[] = [
    { id: 'name', label: 'Dealer Name', minWidth: 160, sortValue: (row) => row.name },
    { id: 'city', label: 'City', minWidth: 120, sortValue: (row) => row.city || '', render: (row) => row.city || '-' },
    { id: 'mobile', label: 'Mobile', minWidth: 130, sortValue: (row) => row.mobile || '', render: (row) => row.mobile || '-' },
    {
      id: 'commission_type',
      label: 'Commission Type',
      minWidth: 130,
      sortValue: (row) => row.commission_type,
      render: (row) => <StatusChip status={row.commission_type} />,
    },
    {
      id: 'commission_value',
      label: 'Commission',
      minWidth: 110,
      sortValue: (row) => Number(row.commission_value || 0),
      render: (row) =>
        row.commission_type === 'PERCENTAGE'
          ? `${row.commission_value}%`
          : row.commission_type === 'FIXED'
          ? `₹${row.commission_value}`
          : 'None',
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
            render: (row: Dealer) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Dealer">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Dealer">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDealerToDelete(row);
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
        title="Dealers & Commission"
        subtitle="Manage wholesale buyers, market traders, and commission agreements"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Dealers' }]}
        actionLabel={canCreate ? 'Add Dealer' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={filteredDealers}
        loading={loading}
        defaultSortBy="name"
        searchPlaceholder="Search dealer by name, city, or phone..."
        searchField={(row) => `${row.name} ${row.city || ''} ${row.mobile || ''}`}
        filterComponent={
          <TextField
            select
            size="small"
            label="Commission"
            value={commissionFilter}
            onChange={(e) => setCommissionFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">All Types</MenuItem>
            <MenuItem value="PERCENTAGE">Percentage</MenuItem>
            <MenuItem value="FIXED">Fixed</MenuItem>
            <MenuItem value="NONE">None</MenuItem>
          </TextField>
        }
        emptyMessage="No dealers registered yet."
      />

      {/* Create / Edit Modal */}
      <FormModal
        open={isModalOpen}
        title={editingDealer ? 'Edit Dealer' : 'Register New Dealer'}
        subtitle={editingDealer ? `Editing ${editingDealer.name}` : 'Enter wholesale buyer details'}
        loading={modalLoading}
        error={modalError}
        submitLabel={editingDealer ? 'Update Dealer' : 'Create Dealer'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Dealer / Firm Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Gujarat Fruit Traders"
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="City"
            fullWidth
            value={formData.city || ''}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="e.g. Ahmedabad"
          />
          <TextField
            label="Mobile Number"
            fullWidth
            value={formData.mobile || ''}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="e.g. 9876543210"
          />
        </Box>

        <TextField
          label="Address / Market Yard"
          fullWidth
          multiline
          rows={2}
          value={formData.address || ''}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Shop No., APMC Market Yard..."
        />

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Commission Type"
            required
            fullWidth
            value={formData.commission_type}
            onChange={(e) => setFormData({ ...formData, commission_type: e.target.value as DealerType })}
          >
            <MenuItem value="PERCENTAGE">Percentage (%)</MenuItem>
            <MenuItem value="FIXED">Fixed Amount (₹)</MenuItem>
            <MenuItem value="NONE">None (0)</MenuItem>
          </TextField>

          <TextField
            label="Commission Value"
            type="number"
            required
            fullWidth
            value={formData.commission_value}
            onChange={(e) => setFormData({ ...formData, commission_value: parseFloat(e.target.value) || 0 })}
            slotProps={{ htmlInput: { min: 0, step: 0.1 } }}
          />
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              color="primary"
            />
          }
          label="Dealer Active"
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Dealer"
        message="Are you sure you want to delete this dealer?"
        itemName={dealerToDelete?.name}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDealerToDelete(null);
        }}
      />
    </Box>
  );
};

export default DealersPage;
