import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import paymentService from '../../services/paymentService';
import dealerService from '../../services/dealerService';
import seasonService from '../../services/seasonService';

import { DealerPayment, DealerPaymentRequest } from '../../types/payment';
import { Dealer } from '../../types/dealer';
import { Season } from '../../types/season';
import { formatDate } from '../../utils/dateUtils';

export const PaymentsPage: React.FC = () => {
  const { user, can } = useAuth();
  const { showSuccess, showError } = useToast();

  const canCreate = can('create', 'dealer_payment');
  const canEdit = can('update', 'dealer_payment');
  const canDelete = can('delete', 'dealer_payment');

  const [payments, setPayments] = useState<DealerPayment[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [dealerFilter, setDealerFilter] = useState<string>('ALL');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<DealerPayment | null>(null);

  // Form fields
  const [formData, setFormData] = useState<DealerPaymentRequest>({
    dealer_id: 0,
    season_id: undefined,
    payment_date: new Date().toISOString().split('T')[0],
    amount: 10000,
    payment_mode: 'Bank Transfer',
    reference_no: '',
    received_by: '',
    remarks: '',
    created_by: 1,
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [paymentToDelete, setPaymentToDelete] = useState<DealerPayment | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const selectedDealerId = dealerFilter !== 'ALL' ? Number(dealerFilter) : undefined;
      const selectedSeasonId =
        seasonFilter === 'ALL'
          ? undefined
          : seasonFilter === 'UNASSIGNED'
          ? -1
          : Number(seasonFilter);

      const [paymentData, dealerData, seasonData] = await Promise.all([
        paymentService.getAll(selectedDealerId, selectedSeasonId),
        dealerService.getAll(),
        seasonService.getAll(),
      ]);
      setPayments(paymentData);
      setDealers(dealerData);
      setSeasons(seasonData);
    } catch (e) {
      showError('Failed to load dealer payments.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dealerFilter, seasonFilter]);

  const handleOpenCreate = () => {
    setEditingPayment(null);
    const activeSeason = seasons.find((s) => s.status === 'ACTIVE') || seasons[0];
    setFormData({
      dealer_id: dealers[0]?.id || 0,
      season_id: activeSeason?.id || undefined,
      payment_date: new Date().toISOString().split('T')[0],
      amount: 10000,
      payment_mode: 'Bank Transfer',
      reference_no: '',
      received_by: user?.name || '',
      remarks: '',
      created_by: user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (payment: DealerPayment) => {
    setEditingPayment(payment);
    setFormData({
      dealer_id: payment.dealer_id,
      season_id: payment.season_id || undefined,
      payment_date: payment.payment_date || '',
      amount: Number(payment.amount),
      payment_mode: payment.payment_mode || 'Bank Transfer',
      reference_no: payment.reference_no || '',
      received_by: payment.received_by || '',
      remarks: payment.remarks || '',
      created_by: payment.created_by || user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.dealer_id) {
      setModalError('Please select a wholesale dealer.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setModalError('Payment amount must be greater than zero.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: DealerPaymentRequest = {
      dealer_id: Number(formData.dealer_id),
      season_id: formData.season_id ? Number(formData.season_id) : null,
      payment_date: formData.payment_date || null,
      amount: Number(formData.amount),
      payment_mode: formData.payment_mode || null,
      reference_no: formData.reference_no || null,
      received_by: formData.received_by || null,
      remarks: formData.remarks || null,
      created_by: user?.id || 1,
    };

    try {
      if (editingPayment) {
        await paymentService.update(editingPayment.id, payload);
        showSuccess('Payment updated successfully!');
      } else {
        await paymentService.create(payload);
        showSuccess('Dealer payment recorded successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to record payment.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!paymentToDelete) return;
    setDeleteLoading(true);

    try {
      await paymentService.delete(paymentToDelete.id);
      showSuccess('Payment record deleted.');
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete payment.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalAmountReceived = payments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const columns: Column<DealerPayment>[] = [
    {
      id: 'dealer',
      label: 'Dealer Name',
      minWidth: 160,
      sortValue: (row) => row.dealer?.name || `Dealer #${row.dealer_id}`,
      render: (row) => row.dealer?.name || `Dealer #${row.dealer_id}`,
    },
    {
      id: 'season',
      label: 'Season',
      minWidth: 130,
      sortValue: (row) => row.season?.name || (row.season_id ? `Season #${row.season_id}` : 'Unassigned'),
      render: (row) =>
        row.season?.name ? (
          <Chip
            label={row.season.name}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, color: '#0369a1', borderColor: '#bae6fd', backgroundColor: '#f0f9ff' }}
          />
        ) : (
          <Chip
            label="Unassigned / General"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500, color: '#64748b', borderColor: '#e2e8f0', backgroundColor: '#f8fafc' }}
          />
        ),
    },
    {
      id: 'payment_date',
      label: 'Date',
      minWidth: 120,
      sortValue: (row) => row.payment_date || '',
      render: (row) => formatDate(row.payment_date),
    },
    {
      id: 'amount',
      label: 'Amount Received',
      align: 'right',
      minWidth: 140,
      sortValue: (row) => Number(row.amount || 0),
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: 'success.main' }}>
          ₹{Number(row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: 'payment_mode',
      label: 'Payment Mode',
      minWidth: 130,
      sortValue: (row) => row.payment_mode || 'Cash',
      render: (row) => row.payment_mode || 'Cash',
    },
    {
      id: 'reference_no',
      label: 'Reference / UTR',
      minWidth: 140,
      sortValue: (row) => row.reference_no || '',
      render: (row) => row.reference_no || '-',
    },
    {
      id: 'received_by',
      label: 'Received By',
      minWidth: 130,
      sortValue: (row) => row.received_by || '',
      render: (row) => row.received_by || '-',
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: DealerPayment) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Payment">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Payment">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setPaymentToDelete(row);
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
        title="Dealer Payments"
        subtitle="Record bank collections, cash receipts, and payments from wholesale buyers"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Dealer Payments' }]}
        actionLabel={canCreate ? 'Record Payment' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
        extraActions={
          <Box
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: 2,
              backgroundColor: '#dcfce7',
              border: '1px solid #bbf7d0',
            }}
          >
            <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, display: 'block' }}>
              Total Received
            </Typography>
            <Typography variant="subtitle2" sx={{ color: '#15803d', fontWeight: 800 }}>
              ₹{totalAmountReceived.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        }
      />

      <DataTable
        columns={columns}
        data={payments}
        loading={loading}
        defaultSortBy="payment_date"
        defaultSortDirection="desc"
        searchPlaceholder="Search by dealer, season, or reference #..."
        searchField={(row) => `${row.dealer?.name || ''} ${row.season?.name || ''} ${row.reference_no || ''} ${row.payment_mode || ''}`}
        filterComponent={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Filter Season"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="ALL">All Seasons</MenuItem>
              <MenuItem value="UNASSIGNED">Unassigned / General</MenuItem>
              {seasons.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} {s.status === 'ACTIVE' ? '🟢' : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Filter Dealer"
              value={dealerFilter}
              onChange={(e) => setDealerFilter(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="ALL">All Dealers</MenuItem>
              {dealers.map((d) => (
                <MenuItem key={d.id} value={String(d.id)}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        }
        emptyMessage="No payments recorded."
      />

      {/* Modal */}
      <FormModal
        open={isModalOpen}
        title={editingPayment ? 'Edit Payment Record' : 'Record Dealer Payment'}
        subtitle="Log received payment against dealer consignments"
        loading={modalLoading}
        error={modalError}
        submitLabel={editingPayment ? 'Update Payment' : 'Save Payment'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
        <TextField
          select
          label="Wholesale Dealer"
          required
          fullWidth
          value={formData.dealer_id || ''}
          onChange={(e) => setFormData({ ...formData, dealer_id: Number(e.target.value) })}
        >
          {dealers.map((d) => (
            <MenuItem key={d.id} value={d.id}>
              {d.name} {d.city ? `(${d.city})` : ''}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Season (Optional / Recommended)"
          fullWidth
          value={formData.season_id ?? 0}
          onChange={(e) => {
            const val = Number(e.target.value);
            setFormData({ ...formData, season_id: val > 0 ? val : undefined });
          }}
          helperText="Associate this payment with a specific season for accurate seasonal calculations"
        >
          <MenuItem value={0}>Unassigned / General Payment</MenuItem>
          {seasons.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name} {s.status === 'ACTIVE' ? '(Active 🟢)' : ''}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Payment Date"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            value={formData.payment_date || ''}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          />

          <TextField
            label="Amount (₹)"
            type="number"
            required
            fullWidth
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="Payment Mode"
            fullWidth
            value={formData.payment_mode || 'Bank Transfer'}
            onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
          >
            <MenuItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</MenuItem>
            <MenuItem value="UPI">UPI / QR</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
          </TextField>

          <TextField
            label="Reference / UTR / Cheque No"
            fullWidth
            value={formData.reference_no || ''}
            onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
            placeholder="e.g. UTR12345678"
          />
        </Box>

        <TextField
          label="Received By (Staff / Collector Name)"
          fullWidth
          value={formData.received_by || ''}
          onChange={(e) => setFormData({ ...formData, received_by: e.target.value })}
        />

        <TextField
          label="Remarks / Notes"
          fullWidth
          multiline
          rows={2}
          value={formData.remarks || ''}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          placeholder="e.g. Part payment for season 2026..."
        />
      </FormModal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Payment"
        message="Are you sure you want to delete this payment record?"
        itemName={`Payment of ₹${paymentToDelete?.amount} from ${paymentToDelete?.dealer?.name}`}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setPaymentToDelete(null);
        }}
      />
    </Box>
  );
};

export default PaymentsPage;

