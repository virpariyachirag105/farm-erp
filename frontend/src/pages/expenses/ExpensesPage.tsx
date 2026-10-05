import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import expenseService from '../../services/expenseService';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';

import { Expense, ExpenseRequest } from '../../types/expense';
import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import { formatDate } from '../../utils/dateUtils';

export const ExpensesPage: React.FC = () => {
  const { user, can } = useAuth();
  const { showSuccess, showError } = useToast();

  const canCreate = can('create', 'expense');
  const canEdit = can('update', 'expense');
  const canDelete = can('delete', 'expense');

  const [expenses, setExpenses] = useState<Expense[]>([]);
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
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form fields
  const [formData, setFormData] = useState<ExpenseRequest>({
    season_id: 0,
    farm_id: 0,
    expense_date: new Date().toISOString().split('T')[0],
    expense_type: 'Labor',
    description: '',
    amount: 1000,
    paid_to: '',
    payment_mode: 'Cash',
    remarks: '',
    created_by: 1,
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sId = seasonFilter !== 'ALL' ? Number(seasonFilter) : undefined;
      const fId = farmFilter !== 'ALL' ? Number(farmFilter) : undefined;

      const [expenseData, seasonData, farmData] = await Promise.all([
        expenseService.getAll(sId, fId),
        seasonService.getAll(),
        farmService.getAll(),
      ]);

      setExpenses(expenseData);
      setSeasons(seasonData);
      setFarms(farmData);
    } catch (e) {
      showError('Failed to load expenses.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [seasonFilter, farmFilter]);

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormData({
      season_id: seasons[0]?.id || 0,
      farm_id: farms[0]?.id || 0,
      expense_date: new Date().toISOString().split('T')[0],
      expense_type: 'Labor',
      description: '',
      amount: 1000,
      paid_to: '',
      payment_mode: 'Cash',
      remarks: '',
      created_by: user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      season_id: expense.season_id,
      farm_id: expense.farm_id,
      expense_date: expense.expense_date || '',
      expense_type: expense.expense_type || 'Labor',
      description: expense.description || '',
      amount: Number(expense.amount),
      paid_to: expense.paid_to || '',
      payment_mode: expense.payment_mode || 'Cash',
      remarks: expense.remarks || '',
      created_by: expense.created_by || user?.id || 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.season_id || !formData.farm_id) {
      setModalError('Please select both a Season and a Farm.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setModalError('Expense amount must be greater than zero.');
      return;
    }

    setModalLoading(true);
    setModalError(null);

    const payload: ExpenseRequest = {
      season_id: Number(formData.season_id),
      farm_id: Number(formData.farm_id),
      expense_date: formData.expense_date || null,
      expense_type: formData.expense_type || null,
      description: formData.description || null,
      amount: Number(formData.amount),
      paid_to: formData.paid_to || null,
      payment_mode: formData.payment_mode || null,
      remarks: formData.remarks || null,
      created_by: user?.id || 1,
    };

    try {
      if (editingExpense) {
        await expenseService.update(editingExpense.id, payload);
        showSuccess('Expense updated successfully!');
      } else {
        await expenseService.create(payload);
        showSuccess('Expense logged successfully!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save expense.';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    setDeleteLoading(true);

    try {
      await expenseService.delete(expenseToDelete.id);
      showSuccess('Expense record deleted.');
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete expense.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalExpenseSum = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const columns: Column<Expense>[] = [
    {
      id: 'expense_date',
      label: 'Date',
      minWidth: 110,
      sortValue: (row) => row.expense_date || '',
      render: (row) => formatDate(row.expense_date),
    },
    {
      id: 'expense_type',
      label: 'Type',
      minWidth: 130,
      sortValue: (row) => row.expense_type || 'General',
      render: (row) => (
        <Box
          component="span"
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1,
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        >
          {row.expense_type || 'General'}
        </Box>
      ),
    },
    {
      id: 'amount',
      label: 'Amount (₹)',
      align: 'right',
      minWidth: 130,
      sortValue: (row) => Number(row.amount || 0),
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: '#dc2626' }}>
          ₹{Number(row.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: 'farm',
      label: 'Farm',
      minWidth: 150,
      sortValue: (row) => row.farm?.name || '',
      render: (row) => row.farm?.name || '-',
    },
    {
      id: 'season',
      label: 'Season',
      minWidth: 150,
      sortValue: (row) => row.season?.name || '',
      render: (row) => row.season?.name || '-',
    },
    {
      id: 'paid_to',
      label: 'Paid To',
      minWidth: 140,
      sortValue: (row) => row.paid_to || '',
      render: (row) => row.paid_to || '-',
    },
    {
      id: 'description',
      label: 'Description',
      minWidth: 180,
      sortValue: (row) => row.description || row.remarks || '',
      render: (row) => row.description || row.remarks || '-',
    },
    ...(canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 100,
            sortable: false,
            render: (row: Expense) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canEdit && (
                  <Tooltip title="Edit Expense">
                    <IconButton size="small" onClick={() => handleOpenEdit(row)} sx={{ color: '#0284c7' }}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Expense">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setExpenseToDelete(row);
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
        title="Farm & Season Expenses"
        subtitle="Track labor, irrigation, fertilizer, equipment, and agricultural operational costs"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Expenses' }]}
        actionLabel={canCreate ? 'Log Expense' : undefined}
        onAction={canCreate ? handleOpenCreate : undefined}
        extraActions={
          <Box
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: 2,
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
            }}
          >
            <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 600, display: 'block' }}>
              Total Expenses Filtered
            </Typography>
            <Typography variant="subtitle2" sx={{ color: '#b91c1c', fontWeight: 800 }}>
              ₹{totalExpenseSum.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        }
      />

      <DataTable
        columns={columns}
        data={expenses}
        loading={loading}
        defaultSortBy="expense_date"
        defaultSortDirection="desc"
        searchPlaceholder="Search expense type, recipient, description..."
        searchField={(row) => `${row.expense_type || ''} ${row.paid_to || ''} ${row.description || ''} ${row.farm?.name || ''}`}
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
        emptyMessage="No expenses logged for this filter."
      />

      {/* Modal */}
      <FormModal
        open={isModalOpen}
        title={editingExpense ? 'Edit Expense Record' : 'Log Operational Expense'}
        subtitle="Record expenses charged to a specific farm and season"
        loading={modalLoading}
        error={modalError}
        submitLabel={editingExpense ? 'Update Expense' : 'Save Expense'}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
      >
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
                {f.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Expense Date"
            type="date"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            value={formData.expense_date || ''}
            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
          />

          <TextField
            select
            label="Expense Category / Type"
            fullWidth
            value={formData.expense_type || 'Labor'}
            onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
          >
            <MenuItem value="Labor">Labor / Harvesting</MenuItem>
            <MenuItem value="Fertilizer">Fertilizer & Manure</MenuItem>
            <MenuItem value="Pesticide">Pesticide Spray</MenuItem>
            <MenuItem value="Irrigation">Irrigation / Electricity</MenuItem>
            <MenuItem value="Packaging">Packaging Materials</MenuItem>
            <MenuItem value="Transport">Internal Transport</MenuItem>
            <MenuItem value="Equipment">Tractor / Tools Repair</MenuItem>
            <MenuItem value="Other">Other / Miscellaneous</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Amount (₹)"
            type="number"
            required
            fullWidth
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
          />

          <TextField
            label="Paid To (Vendor / Contractor)"
            fullWidth
            value={formData.paid_to || ''}
            onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
            placeholder="e.g. Bharat Labor Group"
          />
        </Box>

        <TextField
          select
          label="Payment Mode"
          fullWidth
          value={formData.payment_mode || 'Cash'}
          onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
        >
          <MenuItem value="Cash">Cash</MenuItem>
          <MenuItem value="Bank Transfer">Bank Transfer / NEFT</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
          <MenuItem value="Cheque">Cheque</MenuItem>
        </TextField>

        <TextField
          label="Description / Purpose"
          fullWidth
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="e.g. 10 workers for 2 days mango plucking"
        />

        <TextField
          label="Additional Remarks"
          fullWidth
          multiline
          rows={2}
          value={formData.remarks || ''}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
        />
      </FormModal>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Expense"
        message="Are you sure you want to delete this expense entry?"
        itemName={`Expense of ₹${expenseToDelete?.amount} (${expenseToDelete?.expense_type})`}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setExpenseToDelete(null);
        }}
      />
    </Box>
  );
};

export default ExpensesPage;
