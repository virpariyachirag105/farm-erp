import React, { useEffect, useRef, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Box,
  Typography,
  Button,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import settlementService from '../../services/settlementService';
import seasonPartnerService from '../../services/seasonPartnerService';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';
import boxCostService from '../../services/boxCostService';

import { PartnerSettlement, PartnerSettlementRequest } from '../../types/settlement';
import { SeasonPartner } from '../../types/seasonPartner';
import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import { formatDate } from '../../utils/dateUtils';

export const SettlementsPage: React.FC = () => {
  const { user, can, hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();

  const canCreate = can('create', 'partner_settlement');
  const canEdit = can('update', 'partner_settlement');
  const canDelete = can('delete', 'partner_settlement');
  const canUploadImage = hasPermission('partner_settlement.upload_image');

  const [settlements, setSettlements] = useState<PartnerSettlement[]>([]);
  const [seasonPartners, setSeasonPartners] = useState<SeasonPartner[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [farmFilter, setFarmFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<PartnerSettlement | null>(null);

  // Image Upload state & ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [previewImageDialogUrl, setPreviewImageDialogUrl] = useState<string | null>(null);

  // Auto-fetch state for box packaging costs
  const [fetchingBoxCost, setFetchingBoxCost] = useState<boolean>(false);
  const [lastCalculatedBoxCost, setLastCalculatedBoxCost] = useState<number>(0);

  // Form fields
  const [formData, setFormData] = useState<PartnerSettlementRequest>({
    season_partner_id: 0,
    settlement_date: new Date().toISOString().split('T')[0],
    total_sales: 100000,
    total_expenses: 0,
    partner_percentage: 50,
    amount_paid: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'Bank Transfer',
    reference_no: '',
    remarks: '',
    image: null,
    created_by: 1,
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [settlementToDelete, setSettlementToDelete] = useState<PartnerSettlement | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sId = seasonFilter !== 'ALL' ? Number(seasonFilter) : undefined;
      const fId = farmFilter !== 'ALL' ? Number(farmFilter) : undefined;

      const [settlementData, partnerData, seasonData, farmData] = await Promise.all([
        settlementService.getAll(sId, fId),
        seasonPartnerService.getAll(),
        seasonService.getAll(),
        farmService.getAll(),
      ]);

      setSettlements(settlementData);
      setSeasonPartners(partnerData);
      setSeasons(seasonData);
      setFarms(farmData);
    } catch (e) {
      showError('Failed to load partner settlements.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [seasonFilter, farmFilter]);

  // Helper: Fetch Box Packaging Costs for a Season Partner's Season & Farm
  const fetchBoxCostsForPartner = async (partner: SeasonPartner): Promise<number> => {
    try {
      const boxCosts = await boxCostService.getAll(partner.season_id, partner.farm_id);
      const totalBoxCost = boxCosts.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
      return totalBoxCost;
    } catch (err) {
      console.error('Failed to fetch box packaging costs for partner:', err);
      return 0;
    }
  };

  // When Season Partner changes in the dropdown -> auto-populate Total Expense from Box Packaging Cost
  const handlePartnerSelectChange = async (partnerId: number) => {
    const matchedPartner = seasonPartners.find((sp) => sp.id === partnerId);
    if (!matchedPartner) return;

    setFetchingBoxCost(true);
    const boxCostTotal = await fetchBoxCostsForPartner(matchedPartner);
    setFetchingBoxCost(false);
    setLastCalculatedBoxCost(boxCostTotal);

    setFormData((prev) => ({
      ...prev,
      season_partner_id: partnerId,
      partner_percentage: matchedPartner.partnership_percentage ?? 50,
      total_expenses: boxCostTotal,
    }));
  };

  const handleOpenCreate = async () => {
    setEditingSettlement(null);
    const firstPartner = seasonPartners[0];
    const partnerId = firstPartner?.id || 0;

    let initialBoxExpense = 0;
    if (firstPartner) {
      setFetchingBoxCost(true);
      initialBoxExpense = await fetchBoxCostsForPartner(firstPartner);
      setFetchingBoxCost(false);
    }
    setLastCalculatedBoxCost(initialBoxExpense);

    setFormData({
      season_partner_id: partnerId,
      settlement_date: new Date().toISOString().split('T')[0],
      total_sales: 100000,
      total_expenses: initialBoxExpense,
      partner_percentage: firstPartner?.partnership_percentage ?? 50,
      amount_paid: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'Bank Transfer',
      reference_no: '',
      remarks: '',
      image: null,
      created_by: user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (st: PartnerSettlement) => {
    setEditingSettlement(st);
    setLastCalculatedBoxCost(Number(st.total_expenses));
    setFormData({
      season_partner_id: st.season_partner_id,
      settlement_date: st.settlement_date || '',
      total_sales: Number(st.total_sales),
      total_expenses: Number(st.total_expenses),
      partner_percentage: Number(st.partner_percentage),
      amount_paid: Number(st.amount_paid),
      payment_date: st.payment_date || '',
      payment_mode: st.payment_mode || 'Bank Transfer',
      reference_no: st.reference_no || '',
      remarks: st.remarks || '',
      image: st.image || null,
      created_by: st.created_by || user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('Please select a valid image file (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setModalError('Image size must be 2MB or less.');
      return;
    }

    setUploadingImage(true);
    setModalError(null);
    try {
      const res = await settlementService.uploadImage(file);
      setFormData((prev) => ({ ...prev, image: res.image_url }));
      showSuccess('Receipt image uploaded successfully.');
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to upload receipt image.';
      setModalError(msg);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!formData.season_partner_id) {
      setModalError('Please select a Season Partner allocation.');
      return;
    }
    if (formData.total_sales < 0 || formData.total_expenses < 0) {
      setModalError('Total Sales and Total Expenses cannot be negative.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: PartnerSettlementRequest = {
      season_partner_id: Number(formData.season_partner_id),
      settlement_date: formData.settlement_date || null,
      total_sales: Number(formData.total_sales),
      total_expenses: Number(formData.total_expenses),
      partner_percentage: Number(formData.partner_percentage),
      amount_paid: Number(formData.amount_paid),
      payment_date: formData.payment_date || null,
      payment_mode: formData.payment_mode || null,
      reference_no: formData.reference_no || null,
      remarks: formData.remarks || null,
      image: formData.image || null,
      created_by: user?.id || 1,
    };

    try {
      if (editingSettlement) {
        await settlementService.update(editingSettlement.id, payload);
        showSuccess('Partner settlement updated successfully!');
      } else {
        await settlementService.create(payload);
        showSuccess('Partner settlement calculated and saved!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to process settlement.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!settlementToDelete) return;
    setDeleteLoading(true);

    try {
      await settlementService.delete(settlementToDelete.id);
      showSuccess('Settlement entry deleted.');
      setDeleteDialogOpen(false);
      setSettlementToDelete(null);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete settlement.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper live preview calculation
  const calcNetProfit = Math.max(0, (Number(formData.total_sales) || 0) - (Number(formData.total_expenses) || 0));
  const calcPartnerShare = (calcNetProfit * (Number(formData.partner_percentage) || 0)) / 100;

  const columns: Column<PartnerSettlement>[] = [
    {
      id: 'partner',
      label: 'Partner / Farm',
      minWidth: 170,
      sortValue: (row) => `${row.season_partner?.farm?.name || ''} ${row.season_partner?.season?.name || ''}`,
      render: (row) => `${row.season_partner?.farm?.name || 'Farm'} (${row.season_partner?.season?.name || 'Season'})`,
    },
    {
      id: 'settlement_date',
      label: 'Settlement Date',
      minWidth: 120,
      sortValue: (row) => row.settlement_date || '',
      render: (row) => formatDate(row.settlement_date),
    },
    {
      id: 'total_sales',
      label: 'Sales (₹)',
      align: 'right',
      minWidth: 120,
      sortValue: (row) => Number(row.total_sales || 0),
      render: (row) => `₹${Number(row.total_sales).toLocaleString('en-IN')}`,
    },
    {
      id: 'total_expenses',
      label: 'Expenses (₹)',
      align: 'right',
      minWidth: 120,
      sortValue: (row) => Number(row.total_expenses || 0),
      render: (row) => `₹${Number(row.total_expenses).toLocaleString('en-IN')}`,
    },
    {
      id: 'net_profit',
      label: 'Net Profit (₹)',
      align: 'right',
      minWidth: 130,
      sortValue: (row) => Number(row.net_profit || 0),
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: 'success.main' }}>
          ₹{Number(row.net_profit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: 'partner_percentage',
      label: 'Share %',
      align: 'right',
      minWidth: 90,
      sortValue: (row) => Number(row.partner_percentage || 0),
      render: (row) => `${row.partner_percentage}%`,
    },
    {
      id: 'partner_amount',
      label: 'Partner Due (₹)',
      align: 'right',
      minWidth: 130,
      sortValue: (row) => Number(row.partner_amount || 0),
      render: (row) => `₹${Number(row.partner_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
    },
    {
      id: 'amount_paid',
      label: 'Paid (₹)',
      align: 'right',
      minWidth: 120,
      sortValue: (row) => Number(row.amount_paid || 0),
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: '#15803d' }}>
          ₹{Number(row.amount_paid).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: 'image',
      label: 'Receipt',
      align: 'center',
      minWidth: 90,
      sortable: false,
      render: (row) =>
        row.image ? (
          <Tooltip title="Click to view full receipt">
            <Avatar
              src={row.image}
              variant="rounded"
              onClick={() => setPreviewImageDialogUrl(row.image || null)}
              sx={{
                width: 36,
                height: 36,
                mx: 'auto',
                cursor: 'pointer',
                border: '1px solid #e2e8f0',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.15)', boxShadow: 2, borderColor: 'primary.main' },
              }}
            >
              <ImageOutlinedIcon fontSize="small" />
            </Avatar>
          </Tooltip>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            -
          </Typography>
        ),
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: PartnerSettlement) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Settlement">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Settlement">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSettlementToDelete(row);
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
        title="Partner Profit Settlements"
        subtitle="Calculate net profits (sales minus farm operational costs) and settle partner equity payouts"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Partner Settlements' }]}
        actionLabel={canCreate ? 'Create Settlement' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
      />

      <DataTable
        columns={columns}
        data={settlements}
        loading={loading}
        defaultSortBy="settlement_date"
        defaultSortDirection="desc"
        searchPlaceholder="Search settlements..."
        searchField={(row) => `${row.season_partner?.farm?.name || ''} ${row.season_partner?.season?.name || ''} ${row.reference_no || ''}`}
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
        emptyMessage="No partner settlements recorded."
      />

      {/* Modal with Auto-Populated Total Expense and Image Upload */}
      <FormModal
        open={isModalOpen}
        title={editingSettlement ? 'Edit Settlement' : 'Calculate Partner Settlement'}
        subtitle="Formulate net profit and partner share distribution"
        loading={modalLoading}
        error={modalError}
        submitLabel={editingSettlement ? 'Update Settlement' : 'Save Settlement'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          select
          label="Season Partner Allocation"
          required
          fullWidth
          value={formData.season_partner_id || ''}
          onChange={(e) => handlePartnerSelectChange(Number(e.target.value))}
        >
          {seasonPartners.map((sp) => {
            const seasonName = seasons.find((s) => s.id === sp.season_id)?.name || `Season #${sp.season_id}`;
            const farmName = farms.find((f) => f.id === sp.farm_id)?.name || `Farm #${sp.farm_id}`;
            return (
              <MenuItem key={sp.id} value={sp.id}>
                {sp.partner_name || 'Primary'} - {farmName} ({seasonName}) [{sp.partnership_percentage}%]
              </MenuItem>
            );
          })}
        </TextField>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <TextField
              label="Gross Sales Revenue (₹)"
              type="number"
              required
              fullWidth
              value={formData.total_sales}
              onChange={(e) => setFormData({ ...formData, total_sales: parseFloat(e.target.value) || 0 })}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <TextField
              label="Total Farm Expenses (₹)"
              type="number"
              required
              fullWidth
              value={formData.total_expenses}
              onChange={(e) => setFormData({ ...formData, total_expenses: parseFloat(e.target.value) || 0 })}
              slotProps={{ htmlInput: { min: 0, step: 'any' } }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, px: 0.5 }}>
              <Typography variant="caption" sx={{ color: fetchingBoxCost ? '#0284c7' : '#16a34a', fontWeight: 600 }}>
                {fetchingBoxCost
                  ? '⏳ Fetching box packaging costs...'
                  : `📦 Box Costs for Season/Farm: ₹${lastCalculatedBoxCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
              </Typography>
              {formData.total_expenses !== lastCalculatedBoxCost && !fetchingBoxCost && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setFormData({ ...formData, total_expenses: lastCalculatedBoxCost })}
                  sx={{ fontSize: '0.725rem', p: 0, minWidth: 'auto', textTransform: 'none', color: 'primary.main', fontWeight: 700 }}
                >
                  Sync (₹{lastCalculatedBoxCost.toLocaleString('en-IN')})
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Partner Share (%)"
            type="number"
            required
            fullWidth
            value={formData.partner_percentage}
            onChange={(e) => setFormData({ ...formData, partner_percentage: parseFloat(e.target.value) || 0 })}
            slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
          />

          <TextField
            label="Amount Paid to Partner (₹)"
            type="number"
            required
            fullWidth
            value={formData.amount_paid}
            onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          />
        </Box>

        {/* Live Calculation Preview Banner */}
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">Calculated Net Profit</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
              ₹{calcNetProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">Partner Share Entitlement</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              ₹{calcPartnerShare.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Settlement Date"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            value={formData.settlement_date || ''}
            onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
          />

          <TextField
            select
            label="Payment Mode"
            fullWidth
            value={formData.payment_mode || 'Bank Transfer'}
            onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
          >
            <MenuItem value="Bank Transfer">Bank Transfer / NEFT</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
          </TextField>
        </Box>

        <TextField
          label="Payment Reference / Cheque No"
          fullWidth
          value={formData.reference_no || ''}
          onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
        />

        {/* Upload Image Section */}
        {canUploadImage && (
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              Receipt / Payment Proof Image
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            {formData.image ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={formData.image}
                    variant="rounded"
                    sx={{ width: 56, height: 56, border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    onClick={() => setPreviewImageDialogUrl(formData.image || null)}
                  />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Receipt Image Attached
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'primary.main', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
                      onClick={() => setPreviewImageDialogUrl(formData.image || null)}
                    >
                      <OpenInNewOutlinedIcon sx={{ fontSize: 13 }} /> View Full Image
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    Change
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={uploadingImage}
                    onClick={handleRemoveImage}
                    sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                sx={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: 2,
                  p: 2.5,
                  textAlign: 'center',
                  cursor: uploadingImage ? 'default' : 'pointer',
                  backgroundColor: '#f8fafc',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: '#f0f9ff',
                  },
                }}
              >
                {uploadingImage ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={24} />
                    <Typography variant="caption" color="text.secondary">Uploading image...</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Click to upload settlement receipt or cheque image
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Supported: JPG, PNG, WEBP, GIF (Max 2MB)
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}

        <TextField
          label="Remarks / Settlement Notes"
          fullWidth
          multiline
          rows={2}
          value={formData.remarks || ''}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
        />
      </FormModal>

      {/* Image Preview Lightbox Dialog */}
      <Dialog
        open={Boolean(previewImageDialogUrl)}
        onClose={() => setPreviewImageDialogUrl(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">Settlement Receipt / Proof</Typography>
          <IconButton size="small" onClick={() => setPreviewImageDialogUrl(null)}>
            <CloseOutlinedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', p: 2 }}>
          {previewImageDialogUrl && (
            <Box
              component="img"
              src={previewImageDialogUrl}
              alt="Settlement Receipt"
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: 1,
                boxShadow: 1,
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewImageDialogUrl(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Settlement Record"
        message="Are you sure you want to delete this partner settlement?"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSettlementToDelete(null);
        }}
      />
    </Box>
  );
};

export default SettlementsPage;
