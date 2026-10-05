import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
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
import seasonService from '../../services/seasonService';
import { Season, SeasonRequest, SeasonStatus } from '../../types/season';
import { formatDate } from '../../utils/dateUtils';

export const SeasonsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();

  const canCreate = can('create', 'season');
  const canEdit = can('update', 'season');
  const canDelete = can('delete', 'season');

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);

  // Form fields
  const [formData, setFormData] = useState<SeasonRequest>({
    name: '',
    start_date: '',
    end_date: '',
    status: 'ACTIVE',
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchSeasons = async () => {
    setLoading(true);
    try {
      const data = await seasonService.getAll();
      setSeasons(data);
    } catch (e) {
      showError('Failed to load seasons.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const handleOpenCreate = () => {
    setEditingSeason(null);
    setFormData({
      name: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'ACTIVE',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (season: Season) => {
    setEditingSeason(season);
    setFormData({
      name: season.name,
      start_date: season.start_date || '',
      end_date: season.end_date || '',
      status: season.status,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setModalError('Season Name is required.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: SeasonRequest = {
      name: formData.name,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status,
    };

    try {
      if (editingSeason) {
        await seasonService.update(editingSeason.id, payload);
        showSuccess('Season updated successfully!');
      } else {
        await seasonService.create(payload);
        showSuccess('Season created successfully!');
      }
      setIsModalOpen(false);
      fetchSeasons();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save season. Please verify inputs.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!seasonToDelete) return;
    setDeleteLoading(true);

    try {
      await seasonService.delete(seasonToDelete.id);
      showSuccess(`Season "${seasonToDelete.name}" deleted.`);
      setDeleteDialogOpen(false);
      setSeasonToDelete(null);
      fetchSeasons();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete season. It might be linked to other records.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredSeasons = seasons.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  const columns: Column<Season>[] = [
    { id: 'name', label: 'Season Name', minWidth: 180, sortValue: (row) => row.name },
    {
      id: 'start_date',
      label: 'Start Date',
      minWidth: 130,
      sortValue: (row) => row.start_date || '',
      render: (row) => formatDate(row.start_date),
    },
    {
      id: 'end_date',
      label: 'End Date',
      minWidth: 130,
      sortValue: (row) => row.end_date || '',
      render: (row) => formatDate(row.end_date),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      sortValue: (row) => row.status,
      render: (row) => <StatusChip status={row.status} />,
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: Season) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Season">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Season">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSeasonToDelete(row);
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
        title="Seasons Management"
        subtitle="Organize production cycles, harvest periods, and crop seasons"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Seasons' }]}
        actionLabel={canCreate ? 'Add Season' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={filteredSeasons}
        loading={loading}
        defaultSortBy="start_date"
        defaultSortDirection="desc"
        searchPlaceholder="Search season by name..."
        searchField={(row) => row.name}
        filterComponent={
          <TextField
            select
            size="small"
            label="Filter Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="ALL">All Statuses</MenuItem>
            <MenuItem value="UPCOMING">Upcoming</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="CLOSED">Closed</MenuItem>
          </TextField>
        }
        emptyMessage="No seasons registered yet."
      />

      {/* Create / Edit Modal */}
      <FormModal
        open={isModalOpen}
        title={editingSeason ? 'Edit Season' : 'Create New Season'}
        subtitle={editingSeason ? `Editing ${editingSeason.name}` : 'Set season dates and status'}
        loading={modalLoading}
        error={modalError}
        submitLabel={editingSeason ? 'Update Season' : 'Create Season'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          label="Season Name"
          required
          fullWidth
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g. Mango Season 2026"
        />

        <TextField
          label="Start Date"
          type="date"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          value={formData.start_date || ''}
          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
        />

        <TextField
          label="End Date"
          type="date"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          value={formData.end_date || ''}
          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
        />

        <TextField
          select
          label="Status"
          required
          fullWidth
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as SeasonStatus })}
        >
          <MenuItem value="UPCOMING">Upcoming</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="CLOSED">Closed</MenuItem>
        </TextField>
      </FormModal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Season"
        message="Are you sure you want to delete this season?"
        itemName={seasonToDelete?.name}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSeasonToDelete(null);
        }}
      />
    </Box>
  );
};

export default SeasonsPage;
