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
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

import seasonPartnerService from '../../services/seasonPartnerService';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';
import userService from '../../services/userService';

import { SeasonPartner, SeasonPartnerRequest } from '../../types/seasonPartner';
import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import { User } from '../../types/auth';
import { formatDate } from '../../utils/dateUtils';

export const PartnersPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();

  const canCreate = can('create', 'season_partner');
  const canEdit = can('update', 'season_partner');
  const canDelete = can('delete', 'season_partner');

  const [partners, setPartners] = useState<SeasonPartner[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<SeasonPartner | null>(null);

  // Form fields
  const [formData, setFormData] = useState<SeasonPartnerRequest>({
    season_id: 0,
    farm_id: 0,
    user_id: null,
    partner_name: '',
    partnership_percentage: 50,
    agreement_date: '',
    remarks: '',
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [partnerToDelete, setPartnerToDelete] = useState<SeasonPartner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partnerData, seasonData] = await Promise.all([
        seasonPartnerService.getAll(),
        seasonService.getAll(),
      ]);
      setPartners(partnerData);
      setSeasons(seasonData);
    } catch (e) {
      showError('Failed to load season partners data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const ensureFormData = async () => {
    if (farms.length === 0 || users.length === 0) {
      try {
        const [farmData, userData] = await Promise.all([
          farms.length === 0 ? farmService.getAll().catch(() => []) : Promise.resolve(farms),
          users.length === 0 ? userService.getAll().catch(() => []) : Promise.resolve(users),
        ]);
        if (farms.length === 0) setFarms(farmData);
        if (users.length === 0) setUsers(userData || []);
        return { farms: farmData, users: userData || [] };
      } catch (e) {
        console.error('Error loading modal dependencies', e);
      }
    }
    return { farms, users };
  };

  const handleOpenCreate = async () => {
    setEditingPartner(null);
    const deps = await ensureFormData();
    setFormData({
      season_id: seasons[0]?.id || 0,
      farm_id: deps.farms[0]?.id || farms[0]?.id || 0,
      user_id: null,
      partner_name: '',
      partnership_percentage: 50,
      agreement_date: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (item: SeasonPartner) => {
    setEditingPartner(item);
    await ensureFormData();
    setFormData({
      season_id: item.season_id,
      farm_id: item.farm_id,
      user_id: item.user_id || null,
      partner_name: item.partner_name || '',
      partnership_percentage: item.partnership_percentage ?? 50,
      agreement_date: item.agreement_date || '',
      remarks: item.remarks || '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.season_id || !formData.farm_id) {
      setModalError('Please select both a Season and a Farm.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: SeasonPartnerRequest = {
      season_id: Number(formData.season_id),
      farm_id: Number(formData.farm_id),
      user_id: formData.user_id ? Number(formData.user_id) : null,
      partner_name: formData.partner_name || null,
      partnership_percentage: formData.partnership_percentage !== null ? Number(formData.partnership_percentage) : null,
      agreement_date: formData.agreement_date || null,
      remarks: formData.remarks || '',
    };

    try {
      if (editingPartner) {
        await seasonPartnerService.update(editingPartner.id, payload);
        showSuccess('Season partner updated successfully!');
      } else {
        await seasonPartnerService.create(payload);
        showSuccess('Season partner added successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save season partner.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!partnerToDelete) return;
    setDeleteLoading(true);

    try {
      await seasonPartnerService.delete(partnerToDelete.id);
      showSuccess('Season partner allocation removed.');
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to remove season partner. Linked settlements may exist.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getSeasonName = (row: SeasonPartner) => row.season?.name || seasons.find((s) => s.id === row.season_id)?.name || `Season #${row.season_id}`;
  const getFarmName = (row: SeasonPartner) => row.farm?.name || farms.find((f) => f.id === row.farm_id)?.name || `Farm #${row.farm_id}`;
  const getUserName = (row: SeasonPartner) => {
    if (row.user?.name) return `${row.user.name} (${row.user.email || ''})`;
    if (!row.user_id) return '-';
    const u = users.find((x) => x.id === row.user_id);
    return u ? `${u.name} (${u.email})` : `User #${row.user_id}`;
  };

  const filteredPartners = partners.filter((p) => {
    if (seasonFilter === 'ALL') return true;
    return p.season_id === Number(seasonFilter);
  });

  const columns: Column<SeasonPartner>[] = [
    {
      id: 'partner_name',
      label: 'Partner Name',
      minWidth: 160,
      sortValue: (row) => row.partner_name || 'Self / Primary',
      render: (row) => row.partner_name || 'Self / Primary',
    },
    {
      id: 'user_id',
      label: 'Linked Account',
      minWidth: 160,
      sortValue: (row) => getUserName(row),
      render: (row) => getUserName(row),
    },
    {
      id: 'season_id',
      label: 'Season',
      minWidth: 160,
      sortValue: (row) => getSeasonName(row),
      render: (row) => getSeasonName(row),
    },
    {
      id: 'farm_id',
      label: 'Farm',
      minWidth: 160,
      sortValue: (row) => getFarmName(row),
      render: (row) => getFarmName(row),
    },
    {
      id: 'partnership_percentage',
      label: 'Share %',
      minWidth: 100,
      sortValue: (row) => Number(row.partnership_percentage || 0),
      render: (row) => (row.partnership_percentage !== null ? `${row.partnership_percentage}%` : '-'),
    },
    {
      id: 'agreement_date',
      label: 'Agreement Date',
      minWidth: 140,
      sortValue: (row) => row.agreement_date || '',
      render: (row) => formatDate(row.agreement_date),
    },
    {
      id: 'remarks',
      label: 'Remarks',
      minWidth: 160,
      sortValue: (row) => row.remarks || '',
      render: (row) => row.remarks || '-',
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: SeasonPartner) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Partner">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Partner">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setPartnerToDelete(row);
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
        title="Season Partners"
        subtitle="Manage farm partnership allocations, equity sharing, and agreements per season"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Season Partners' }]}
        actionLabel={canCreate ? 'Add Season Partner' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={filteredPartners}
        loading={loading}
        searchPlaceholder="Search partner name or remarks..."
        searchField={(row) => `${row.partner_name || ''} ${getFarmName(row)} ${row.remarks || ''}`}
        filterComponent={
          <TextField
            select
            size="small"
            label="Filter Season"
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="ALL">All Seasons</MenuItem>
            {seasons.map((s) => (
              <MenuItem key={s.id} value={String(s.id)}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        }
        emptyMessage="No season partners recorded yet."
      />

      {/* Create / Edit Modal */}
      <FormModal
        open={isModalOpen}
        title={editingPartner ? 'Edit Season Partner' : 'Add Season Partner'}
        subtitle="Specify partner allocation for a farm in a season"
        loading={modalLoading}
        error={modalError}
        submitLabel={editingPartner ? 'Update Partner' : 'Save Partner'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Partner Name"
            fullWidth
            value={formData.partner_name || ''}
            onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
            placeholder="e.g. Suresh Patel"
          />

          {users.length > 0 && (
            <TextField
              select
              label="Linked User Login"
              fullWidth
              value={formData.user_id || ''}
              onChange={(e) => setFormData({ ...formData, user_id: e.target.value ? Number(e.target.value) : null })}
              helperText="Assign to user login for scoped portal access"
            >
              <MenuItem value="">
                <em>None / Not Linked</em>
              </MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name} ({u.email}) [{u.role || 'User'}]
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Season"
            required
            fullWidth
            value={formData.season_id || ''}
            onChange={(e) => setFormData({ ...formData, season_id: Number(e.target.value) })}
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Farm"
            required
            fullWidth
            value={formData.farm_id || ''}
            onChange={(e) => setFormData({ ...formData, farm_id: Number(e.target.value) })}
          >
            {farms.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name} ({f.farm_type})
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Partnership Percentage (%)"
            type="number"
            fullWidth
            value={formData.partnership_percentage ?? ''}
            onChange={(e) => setFormData({ ...formData, partnership_percentage: parseFloat(e.target.value) || 0 })}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
          />

          <TextField
            label="Agreement Date"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            value={formData.agreement_date || ''}
            onChange={(e) => setFormData({ ...formData, agreement_date: e.target.value })}
          />
        </Box>

        <TextField
          label="Remarks / Notes"
          fullWidth
          multiline
          rows={2}
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="e.g. 50% profit share after box packaging deductions"
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Season Partner"
        message="Are you sure you want to remove this season partnership?"
        itemName={partnerToDelete?.partner_name || `Partner #${partnerToDelete?.id}`}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPartnerToDelete(null);
        }}
      />
    </Box>
  );
};

export default PartnersPage;
