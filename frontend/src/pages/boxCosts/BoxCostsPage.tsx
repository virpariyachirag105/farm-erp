import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Box,
  Typography,
  Button,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import boxCostService from '../../services/boxCostService';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';
import seasonPartnerService from '../../services/seasonPartnerService';
import dispatchService from '../../services/dispatchService';

import { SeasonBoxCost, SeasonBoxCostRequest } from '../../types/boxCost';
import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import { SeasonPartner } from '../../types/seasonPartner';
import { BoxSize, DispatchListItem, DispatchItem } from '../../types/dispatch';

export const BoxCostsPage: React.FC = () => {
  const { user, can } = useAuth();
  const { showSuccess, showError } = useToast();

  const canCreate = can('create', 'season_box_cost');
  const canEdit = can('update', 'season_box_cost');
  const canDelete = can('delete', 'season_box_cost');

  const [boxCosts, setBoxCosts] = useState<SeasonBoxCost[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [seasonPartners, setSeasonPartners] = useState<SeasonPartner[]>([]);
  const [dispatches, setDispatches] = useState<DispatchListItem[]>([]);
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [farmFilter, setFarmFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingBoxCost, setEditingBoxCost] = useState<SeasonBoxCost | null>(null);

  // Form fields
  const [formData, setFormData] = useState<SeasonBoxCostRequest>({
    season_id: 0,
    farm_id: 0,
    box_size_kg: '10',
    total_boxes: 0,
    price_per_box: 45,
    remarks: '',
    created_by: 1,
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [costToDelete, setCostToDelete] = useState<SeasonBoxCost | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sId = seasonFilter !== 'ALL' ? Number(seasonFilter) : undefined;
      const fId = farmFilter !== 'ALL' ? Number(farmFilter) : undefined;

      const [costData, seasonData, farmData, partnerData, dispatchData, itemData] = await Promise.all([
        boxCostService.getAll(sId, fId),
        seasonService.getAll().catch(() => []),
        farmService.getAll().catch(() => []),
        seasonPartnerService.getAll().catch(() => []),
        dispatchService.getAll().catch(() => []),
        dispatchService.getDispatchItems().catch(() => []),
      ]);

      setBoxCosts(costData || []);
      setSeasons(seasonData || []);
      setFarms(farmData || []);
      setSeasonPartners(partnerData || []);
      setDispatches(dispatchData || []);
      setDispatchItems(itemData || []);
    } catch (e) {
      showError('Failed to load box packaging costs.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [seasonFilter, farmFilter]);

  // Helper: Get farms associated with a given season
  const getFarmsForSeason = (seasonId: number): Farm[] => {
    if (!seasonId) return [];

    // 1. Farms registered under Season Partners
    const partnerFarmIds = new Set(
      seasonPartners.filter((sp) => sp.season_id === seasonId).map((sp) => sp.farm_id)
    );

    // 2. Farms used in Dispatches for this season
    const seasonDispatchIds = new Set(
      dispatches.filter((d) => d.season_id === seasonId).map((d) => d.id)
    );
    const dispatchFarmIds = new Set(
      dispatchItems
        .filter((it) => it.dispatch_id && seasonDispatchIds.has(it.dispatch_id) && it.farm_id)
        .map((it) => it.farm_id as number)
    );

    const associatedIds = new Set([...partnerFarmIds, ...dispatchFarmIds]);
    const matchedFarms = farms.filter((f) => associatedIds.has(f.id));

    // Fallback: If no farms are explicitly linked yet, return active farms
    return matchedFarms.length > 0 ? matchedFarms : farms.filter((f) => f.is_active);
  };

  // Helper: Auto-calculate total dispatched boxes for (Season + Farm + BoxSize)
  const calculateDispatchBoxes = (
    seasonId: number,
    farmId: number,
    boxSize: BoxSize,
    allDispatches: DispatchListItem[] = dispatches,
    allItems: DispatchItem[] = dispatchItems
  ): number => {
    if (!seasonId || !farmId || !boxSize) return 0;

    const seasonDispatchIds = new Set(
      allDispatches.filter((d) => d.season_id === seasonId).map((d) => d.id)
    );

    const total = allItems
      .filter(
        (it) =>
          it.dispatch_id &&
          seasonDispatchIds.has(it.dispatch_id) &&
          it.farm_id === farmId &&
          it.box_size_kg === boxSize
      )
      .reduce((sum, it) => sum + Number(it.box_quantity || 0), 0);

    return total;
  };

  // Open Create Popup with Auto-Population
  const handleOpenCreate = () => {
    setEditingBoxCost(null);
    const initialSeasonId = seasons[0]?.id || 0;
    const associatedFarms = getFarmsForSeason(initialSeasonId);
    const initialFarmId = associatedFarms[0]?.id || farms[0]?.id || 0;
    const initialBoxSize: BoxSize = '10';

    const autoBoxes = calculateDispatchBoxes(
      initialSeasonId,
      initialFarmId,
      initialBoxSize,
      dispatches,
      dispatchItems
    );

    setFormData({
      season_id: initialSeasonId,
      farm_id: initialFarmId,
      box_size_kg: initialBoxSize,
      total_boxes: autoBoxes,
      price_per_box: 45,
      remarks: '',
      created_by: user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  // 1. Season Change Handler: Load associated farms & recalculate total boxes
  const handleSeasonChange = (newSeasonId: number) => {
    const associatedFarms = getFarmsForSeason(newSeasonId);
    const newFarmId = associatedFarms[0]?.id || 0;
    const currentBoxSize = formData.box_size_kg;

    const autoBoxes = calculateDispatchBoxes(
      newSeasonId,
      newFarmId,
      currentBoxSize,
      dispatches,
      dispatchItems
    );

    setFormData({
      ...formData,
      season_id: newSeasonId,
      farm_id: newFarmId,
      total_boxes: autoBoxes,
    });
  };

  // 2. Farm Change Handler: Recalculate total boxes for the newly selected farm
  const handleFarmChange = (newFarmId: number) => {
    const currentSeasonId = formData.season_id;
    const currentBoxSize = formData.box_size_kg;

    const autoBoxes = calculateDispatchBoxes(
      currentSeasonId,
      newFarmId,
      currentBoxSize,
      dispatches,
      dispatchItems
    );

    setFormData({
      ...formData,
      farm_id: newFarmId,
      total_boxes: autoBoxes,
    });
  };

  // 3. Box Size Change Handler: Recalculate total boxes for the new box size
  const handleBoxSizeChange = (newBoxSize: BoxSize) => {
    const currentSeasonId = formData.season_id;
    const currentFarmId = formData.farm_id;

    const autoBoxes = calculateDispatchBoxes(
      currentSeasonId,
      currentFarmId,
      newBoxSize,
      dispatches,
      dispatchItems
    );

    setFormData({
      ...formData,
      box_size_kg: newBoxSize,
      total_boxes: autoBoxes,
    });
  };

  const handleOpenEdit = (cost: SeasonBoxCost) => {
    setEditingBoxCost(cost);
    setFormData({
      season_id: cost.season_id,
      farm_id: cost.farm_id,
      box_size_kg: cost.box_size_kg,
      total_boxes: Number(cost.total_boxes),
      price_per_box: Number(cost.price_per_box),
      remarks: cost.remarks || '',
      created_by: cost.created_by || user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.season_id || !formData.farm_id) {
      setModalError('Please select both a Season and a Farm.');
      return;
    }
    if (formData.total_boxes < 0) {
      setModalError('Total boxes cannot be negative.');
      return;
    }
    if (!formData.price_per_box || formData.price_per_box <= 0) {
      setModalError('Price per box must be greater than zero.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: SeasonBoxCostRequest = {
      season_id: Number(formData.season_id),
      farm_id: Number(formData.farm_id),
      box_size_kg: formData.box_size_kg,
      total_boxes: Number(formData.total_boxes),
      price_per_box: Number(formData.price_per_box),
      remarks: formData.remarks || null,
      created_by: user?.id || 1,
    };

    try {
      if (editingBoxCost) {
        await boxCostService.update(editingBoxCost.id, payload);
        showSuccess('Box packaging cost updated!');
      } else {
        await boxCostService.create(payload);
        showSuccess('Box packaging cost recorded!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save box cost.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!costToDelete) return;
    setDeleteLoading(true);

    try {
      await boxCostService.delete(costToDelete.id);
      showSuccess('Box cost entry deleted.');
      setDeleteDialogOpen(false);
      setCostToDelete(null);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete box cost.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalBoxesPurchased = boxCosts.reduce((acc, curr) => acc + Number(curr.total_boxes || 0), 0);
  const totalPackagingCost = boxCosts.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

  // Associated farms available for currently selected season in the modal
  const modalFarms = getFarmsForSeason(formData.season_id);

  // Live calculated boxes for the modal's current inputs
  const liveDispatchedBoxes = calculateDispatchBoxes(
    formData.season_id,
    formData.farm_id,
    formData.box_size_kg
  );

  const columns: Column<SeasonBoxCost>[] = [
    {
      id: 'season',
      label: 'Season',
      minWidth: 150,
      sortValue: (row) => row.season?.name || '',
      render: (row) => row.season?.name || '-',
    },
    {
      id: 'farm',
      label: 'Farm',
      minWidth: 150,
      sortValue: (row) => row.farm?.name || '',
      render: (row) => row.farm?.name || '-',
    },
    {
      id: 'box_size_kg',
      label: 'Box Size',
      minWidth: 110,
      sortValue: (row) => (row.box_size_kg === 'DOZEN' ? 'DOZEN' : `${row.box_size_kg} KG`),
      render: (row) => (row.box_size_kg === 'DOZEN' ? 'DOZEN' : `${row.box_size_kg} KG`),
    },
    {
      id: 'total_boxes',
      label: 'Total Boxes',
      align: 'right',
      minWidth: 120,
      sortValue: (row) => Number(row.total_boxes || 0),
      render: (row) => Number(row.total_boxes).toLocaleString(),
    },
    {
      id: 'price_per_box',
      label: 'Rate / Box',
      align: 'right',
      minWidth: 120,
      sortValue: (row) => Number(row.price_per_box || 0),
      render: (row) => `₹${Number(row.price_per_box).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    },
    {
      id: 'total_amount',
      label: 'Total Cost (₹)',
      align: 'right',
      minWidth: 140,
      sortValue: (row) => Number(row.total_amount || 0),
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
          ₹{Number(row.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Typography>
      ),
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
            render: (row: SeasonBoxCost) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Box Cost">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Record">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCostToDelete(row);
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
        title="Season Box Packaging Costs"
        subtitle="Track procurement costs of corrugated packing boxes and crates per season"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Box Costs' }]}
        actionLabel={canCreate ? 'Add Box Cost' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
        extraActions={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ px: 2, py: 0.75, borderRadius: 2, backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                Total Boxes
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 800 }}>
                {totalBoxesPurchased.toLocaleString()} Boxes
              </Typography>
            </Box>
            <Box sx={{ px: 2, py: 0.75, borderRadius: 2, backgroundColor: '#e0f2fe', border: '1px solid #bae6fd' }}>
              <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 600, display: 'block' }}>
                Total Box Cost
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#0369a1', fontWeight: 800 }}>
                ₹{totalPackagingCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Box>
        }
      />

      <DataTable
        columns={columns}
        data={boxCosts}
        loading={loading}
        defaultSortBy="season"
        searchPlaceholder="Search by farm, season, or size..."
        searchField={(row) => `${row.season?.name || ''} ${row.farm?.name || ''} ${row.box_size_kg} ${row.remarks || ''}`}
        filterComponent={
          <>
            <TextField
              select
              size="small"
              label="Season"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All Seasons</MenuItem>
              {seasons.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Farm"
              value={farmFilter}
              onChange={(e) => setFarmFilter(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All Farms</MenuItem>
              {farms.map((f) => (
                <MenuItem key={f.id} value={String(f.id)}>
                  {f.name}
                </MenuItem>
              ))}
            </TextField>
          </>
        }
        emptyMessage="No box cost entries recorded."
      />

      {/* Modal with Auto-Population */}
      <FormModal
        open={isModalOpen}
        title={editingBoxCost ? 'Edit Box Packaging Cost' : 'Record Box Packaging Cost'}
        subtitle="Log box purchases allocated to a farm and season"
        loading={modalLoading}
        error={modalError}
        submitLabel={editingBoxCost ? 'Update Cost' : 'Save Cost'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 1. Select Season */}
          <TextField
            select
            label="Season"
            required
            fullWidth
            value={formData.season_id || ''}
            onChange={(e) => handleSeasonChange(Number(e.target.value))}
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>

          {/* 2. Load Associated Farms based on Season */}
          <TextField
            select
            label="Farm"
            required
            fullWidth
            value={formData.farm_id || ''}
            onChange={(e) => handleFarmChange(Number(e.target.value))}
            helperText={
              modalFarms.length === 0
                ? 'No farms associated with this season'
                : `${modalFarms.length} farm(s) linked to season`
            }
          >
            {modalFarms.length === 0 ? (
              <MenuItem disabled value={0}>
                No associated farms found
              </MenuItem>
            ) : (
              modalFarms.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name} ({f.farm_type})
                </MenuItem>
              ))
            )}
          </TextField>
        </Box>

        {/* 3. Select Box Size -> Recalculate Total Boxes */}
        <TextField
          select
          label="Box Size"
          required
          fullWidth
          value={formData.box_size_kg}
          onChange={(e) => handleBoxSizeChange(e.target.value as BoxSize)}
        >
          <MenuItem value="5">5 KG Box</MenuItem>
          <MenuItem value="10">10 KG Box</MenuItem>
          <MenuItem value="20">20 KG Box</MenuItem>
          <MenuItem value="DOZEN">DOZEN Crates</MenuItem>
        </TextField>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 4. Total Boxes (Auto-calculated from Dispatches) */}
          <Box sx={{ flex: 1 }}>
            <TextField
              label="Total Boxes"
              type="number"
              required
              fullWidth
              value={formData.total_boxes}
              onChange={(e) => setFormData({ ...formData, total_boxes: parseFloat(e.target.value) || 0 })}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                ⚡ Dispatched in Season: {liveDispatchedBoxes.toLocaleString()} boxes
              </Typography>
              {formData.total_boxes !== liveDispatchedBoxes && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setFormData({ ...formData, total_boxes: liveDispatchedBoxes })}
                  sx={{ fontSize: '0.725rem', p: 0, minWidth: 'auto', textTransform: 'none', color: 'primary.main', fontWeight: 700 }}
                >
                  Sync ({liveDispatchedBoxes})
                </Button>
              )}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <TextField
              label="Cost / Box (₹)"
              type="number"
              required
              fullWidth
              value={formData.price_per_box}
              onChange={(e) => setFormData({ ...formData, price_per_box: parseFloat(e.target.value) || 0 })}
              slotProps={{ htmlInput: { min: 0.01, step: 'any' } }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Estimated Total Box Expenditure:
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
            ₹{((Number(formData.total_boxes) || 0) * (Number(formData.price_per_box) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </Typography>
        </Box>

        <TextField
          label="Remarks / Supplier Info"
          fullWidth
          multiline
          rows={2}
          value={formData.remarks || ''}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="e.g. Printed 5-ply export quality boxes from Morbi Packaging"
        />
      </FormModal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Box Cost Record"
        message="Are you sure you want to delete this box cost record?"
        itemName={`${costToDelete?.total_boxes} boxes of ${costToDelete?.box_size_kg === 'DOZEN' ? 'DOZEN' : `${costToDelete?.box_size_kg} KG`}`}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCostToDelete(null);
        }}
      />
    </Box>
  );
};

export default BoxCostsPage;
