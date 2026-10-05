import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  TextField,
  MenuItem,
  Paper,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import { useNavigate, useParams } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import StatusChip from '../../components/common/StatusChip';
import LoadingScreen from '../../components/common/LoadingScreen';
import FormModal from '../../components/forms/FormModal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

import dispatchService from '../../services/dispatchService';
import {
  Dispatch,
  DispatchSettlement,
  DispatchSettlementRequest,
  FreeDispatchItem,
  FreeDispatchItemRequest,
} from '../../types/dispatch';
import { formatDate } from '../../utils/dateUtils';

export const DispatchDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();

  const canEditDispatch = can('update', 'dispatch');
  const canCreateDispatch = can('create', 'dispatch');
  const canCreateFreeItem = can('create', 'free_dispatch_item');
  const canDeleteFreeItem = can('delete', 'free_dispatch_item');
  const canCreateSettlement = can('create', 'dispatch_settlement');
  const canDeleteSettlement = can('delete', 'dispatch_settlement');

  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [freeItems, setFreeItems] = useState<FreeDispatchItem[]>([]);
  const [settlements, setSettlements] = useState<DispatchSettlement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<number>(0);

  // Free Item Modal
  const [isFreeModalOpen, setIsFreeModalOpen] = useState<boolean>(false);
  const [freeModalLoading, setFreeModalLoading] = useState<boolean>(false);
  const [freeModalError, setFreeModalError] = useState<string | null>(null);
  const [freeFormData, setFreeFormData] = useState<FreeDispatchItemRequest>({
    dispatch_id: Number(id),
    dispatch_item_id: undefined,
    distribution_date: new Date().toISOString().split('T')[0],
    box_quantity: 1,
    remarks: '',
  });

  // Settlement Modal
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [settlementModalLoading, setSettlementModalLoading] = useState<boolean>(false);
  const [settlementModalError, setSettlementModalError] = useState<string | null>(null);
  const [settlementFormData, setSettlementFormData] = useState<DispatchSettlementRequest>({
    dispatch_id: Number(id),
    settlement_date: new Date().toISOString().split('T')[0],
    loss_amount: 0,
    loss_remarks: '',
    remarks: '',
  });

  // Delete Dialog for Free Item / Settlement
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'free' | 'settlement';
    id: number;
    title: string;
  }>({
    open: false,
    type: 'free',
    id: 0,
    title: '',
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDispatchDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [disp, freeList, settList] = await Promise.all([
        dispatchService.getById(Number(id)),
        dispatchService.getFreeItems(Number(id)).catch(() => []),
        dispatchService.getSettlements(Number(id)).catch(() => []),
      ]);

      setDispatch(disp);
      setFreeItems(freeList);
      setSettlements(settList);
    } catch (e) {
      showError('Failed to load dispatch details.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatchDetails();
  }, [id]);

  // Handle Free Item Submit
  const handleCreateFreeItem = async () => {
    if (!freeFormData.box_quantity || freeFormData.box_quantity <= 0) {
      setFreeModalError('Box quantity must be greater than 0.');
      return;
    }

    setFreeModalLoading(true);
    setFreeModalError(null);

    try {
      await dispatchService.createFreeItem({
        dispatch_id: Number(id),
        dispatch_item_id: freeFormData.dispatch_item_id || null,
        distribution_date: freeFormData.distribution_date || null,
        box_quantity: Number(freeFormData.box_quantity),
        remarks: freeFormData.remarks || null,
      });
      showSuccess('Complimentary distribution box recorded!');
      setIsFreeModalOpen(false);
      fetchDispatchDetails();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to add free item.';
      setFreeModalError(msg);
    } finally {
      setFreeModalLoading(false);
    }
  };

  // Handle Settlement Submit
  const handleCreateSettlement = async () => {
    if (!settlementFormData.loss_amount || settlementFormData.loss_amount <= 0) {
      setSettlementModalError('Loss amount must be greater than 0.');
      return;
    }

    setSettlementModalLoading(true);
    setSettlementModalError(null);

    try {
      await dispatchService.createSettlement({
        dispatch_id: Number(id),
        settlement_date: settlementFormData.settlement_date || null,
        loss_amount: Number(settlementFormData.loss_amount),
        loss_remarks: settlementFormData.loss_remarks || null,
        remarks: settlementFormData.remarks || null,
      });
      showSuccess('Dispatch settlement / loss deduction recorded!');
      setIsSettlementModalOpen(false);
      fetchDispatchDetails();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to add settlement.';
      setSettlementModalError(msg);
    } finally {
      setSettlementModalLoading(false);
    }
  };

  // Confirm delete item
  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleteDialog.type === 'free') {
        await dispatchService.deleteFreeItem(deleteDialog.id);
        showSuccess('Free box record deleted.');
      } else {
        await dispatchService.deleteSettlement(deleteDialog.id);
        showSuccess('Settlement loss record deleted.');
      }
      setDeleteDialog({ ...deleteDialog, open: false });
      fetchDispatchDetails();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete record.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading dispatch records..." />;
  }

  if (!dispatch) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">Dispatch not found.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dispatches')} sx={{ mt: 2 }}>
          Back to Dispatches
        </Button>
      </Box>
    );
  }

  // Box Breakdown by Sizes
  const count5kg = dispatch.items?.filter((it) => it.box_size_kg === '5').reduce((sum, it) => sum + Number(it.box_quantity || 0), 0) || 0;
  const count10kg = dispatch.items?.filter((it) => it.box_size_kg === '10').reduce((sum, it) => sum + Number(it.box_quantity || 0), 0) || 0;
  const count20kg = dispatch.items?.filter((it) => it.box_size_kg === '20').reduce((sum, it) => sum + Number(it.box_quantity || 0), 0) || 0;
  const countDozen = dispatch.items?.filter((it) => String(it.box_size_kg).toUpperCase() === 'DOZEN').reduce((sum, it) => sum + Number(it.box_quantity || 0), 0) || 0;
  const totalBoxes = Number(dispatch.total_boxes || dispatch.items?.reduce((sum, it) => sum + Number(it.box_quantity || 0), 0) || 0);

  const totalFreeBoxes = freeItems.reduce((acc, fi) => acc + Number(fi.box_quantity || 0), 0);
  const totalLoss = Math.round(settlements.reduce((acc, s) => acc + Number(s.loss_amount || 0), 0));
  const grossAmount = Math.round(Number(dispatch.total_amount || 0));
  const netProduceValuation = Math.round(grossAmount - totalLoss);

  return (
    <Box>
      <PageHeader
        title={`Dispatch ${dispatch.dispatch_no}`}
        subtitle={`Consigned to ${dispatch.dealer?.name || 'Unknown Dealer'} • Date: ${formatDate(dispatch.dispatch_date)}`}
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Dispatches', path: '/dispatches' },
          { label: dispatch.dispatch_no },
        ]}
        extraActions={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dispatches')}
            >
              Back to List
            </Button>
            {canEditDispatch && (
              <Button
                component="a"
                href={`/dispatches/edit/${dispatch.id}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`/dispatches/edit/${dispatch.id}`, '_blank');
                }}
              >
                Edit Dispatch
              </Button>
            )}
            {canCreateDispatch && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => navigate(`/dispatches/create`)}
              >
                New Dispatch
              </Button>
            )}
          </Box>
        }
      />

      {/* Box Breakdown Banner */}
      {/* <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <InventoryIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Dispatch Box Breakdown:
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={<span><strong>5 KG:</strong> {count5kg.toLocaleString()} boxes</span>}
            sx={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600, border: '1px solid #bfdbfe' }}
          />
          <Chip
            label={<span><strong>10 KG:</strong> {count10kg.toLocaleString()} boxes</span>}
            sx={{ backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 600, border: '1px solid #bbf7d0' }}
          />
          <Chip
            label={<span><strong>20 KG:</strong> {count20kg.toLocaleString()} boxes</span>}
            sx={{ backgroundColor: '#faf5ff', color: '#7e22ce', fontWeight: 600, border: '1px solid #e9d5ff' }}
          />
          <Chip
            label={<span><strong>DOZEN:</strong> {countDozen.toLocaleString()} boxes</span>}
            sx={{ backgroundColor: '#fff7ed', color: '#c2410c', fontWeight: 600, border: '1px solid #fed7aa' }}
          />
          <Chip
            label={<span><strong>TOTAL:</strong> {totalBoxes.toLocaleString()} boxes</span>}
            sx={{ backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 700 }}
          />
        </Box>
      </Paper> */}

      {/* KPI Metrics */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Boxes"
            value={`${totalBoxes.toLocaleString()} Boxes`}
            subtitle={`5k: ${count5kg} | 10k: ${count10kg} | 20k: ${count20kg} | Dzn: ${countDozen}`}
            icon={<InventoryIcon />}
            color="#0284c7"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Gross Amount"
            value={`₹${grossAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`Transport: ₹${Math.round(Number(dispatch.transport_charge || 0)).toLocaleString('en-IN')}`}
            icon={<MonetizationOnIcon />}
            color="#16a34a"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Free Distribution"
            value={`${totalFreeBoxes.toLocaleString()} Boxes`}
            subtitle={`${freeItems.length} complimentary ${freeItems.length === 1 ? 'record' : 'records'}`}
            icon={<CardGiftcardIcon />}
            color="#f59e0b"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Losses"
            value={`₹${totalLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            subtitle={`Net payable: ₹${netProduceValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon={<PriceCheckIcon />}
            color={totalLoss > 0 ? '#ef4444' : '#64748b'}
          />
        </Grid>
      </Grid>

      {/* Logistics Header Info Card */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <LocalShippingIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Logistics & Consignment Information
              </Typography>
            </Box>
            <StatusChip status={dispatch.status || 'PENDING'} />
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Season</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dispatch.season?.name || '-'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Dealer</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dispatch.dealer?.name || '-'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Vehicle No</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dispatch.vehicle_no || '-'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Driver Name</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dispatch.driver_name || '-'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Transport Company</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dispatch.transport_name || '-'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Transport Charge</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{Number(dispatch.transport_charge || 0).toLocaleString('en-IN')}</Typography>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" color="text.secondary">Dispatch Remarks</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>{dispatch.remarks || 'None'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs: Produce Items, Free Distribution, Settlements */}
      <Paper sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: '1px solid #e2e8f0', px: 2, bgcolor: '#f8fafc' }}>
          <Tabs
            value={currentTab}
            onChange={(_, val) => setCurrentTab(val)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label={`Produce Items (${dispatch.items?.length || 0})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
            <Tab label={`Free Distribution (${freeItems.length})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
            <Tab label={`Settlements / Losses (${settlements.length})`} sx={{ fontWeight: 700, textTransform: 'none' }} />
          </Tabs>
        </Box>

        {/* Tab 0: Produce Items */}
        {currentTab === 0 && (
          <Box sx={{ p: 2.5 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Farm</TableCell>
                  <TableCell>Crop / Produce</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Variety</TableCell>
                  <TableCell>Grade</TableCell>
                  <TableCell>Box Size</TableCell>
                  <TableCell align="right">Boxes</TableCell>
                  <TableCell align="right">Weight (KG)</TableCell>
                  <TableCell align="right">Rate/Box (₹)</TableCell>
                  <TableCell align="right">Total (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dispatch.items && dispatch.items.length > 0 ? (
                  dispatch.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{item.farm?.name || '-'}</TableCell>
                      <TableCell>{item.product?.name || '-'}</TableCell>
                      <TableCell><StatusChip status={item.source_type} /></TableCell>
                      <TableCell>{item.variety || '-'}</TableCell>
                      <TableCell>{item.grade || '-'}</TableCell>
                      <TableCell>{item.box_size_kg === 'DOZEN' ? 'DOZEN' : `${item.box_size_kg} KG`}</TableCell>
                      <TableCell align="right">{Number(item.box_quantity).toLocaleString()}</TableCell>
                      <TableCell align="right">{Number(item.total_weight_kg).toLocaleString()} KG</TableCell>
                      <TableCell align="right">₹{Number(item.price_per_box).toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        ₹{Math.round(Number(item.total_amount)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      No produce line items found for this dispatch.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 1: Free Items */}
        {currentTab === 1 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Complimentary & Free Distribution Boxes
              </Typography>
              {canCreateFreeItem && (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setFreeFormData({
                      dispatch_id: Number(id),
                      dispatch_item_id: dispatch.items?.[0]?.id || undefined,
                      distribution_date: new Date().toISOString().split('T')[0],
                      box_quantity: 1,
                      remarks: '',
                    });
                    setFreeModalError(null);
                    setIsFreeModalOpen(true);
                  }}
                >
                  Add Free Distribution
                </Button>
              )}
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Item Reference</TableCell>
                  <TableCell align="right">Box Quantity</TableCell>
                  <TableCell>Remarks</TableCell>
                  {canDeleteFreeItem && <TableCell align="right">Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {freeItems.length > 0 ? (
                  freeItems.map((fi) => (
                    <TableRow key={fi.id} hover>
                      <TableCell>{formatDate(fi.distribution_date)}</TableCell>
                      <TableCell>Item #{fi.dispatch_item_id || 'N/A'}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {Number(fi.box_quantity).toLocaleString()} Boxes
                      </TableCell>
                      <TableCell>{fi.remarks || '-'}</TableCell>
                      {canDeleteFreeItem && (
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: 'free',
                                id: fi.id,
                                title: `Free Distribution (${fi.box_quantity} boxes)`,
                              })
                            }
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canDeleteFreeItem ? 5 : 4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      No free distribution items recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Tab 2: Dispatch Settlements */}
        {currentTab === 2 && (
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Transit Loss / Damage Deduction Settlements
              </Typography>
              {canCreateSettlement && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSettlementFormData({
                      dispatch_id: Number(id),
                      settlement_date: new Date().toISOString().split('T')[0],
                      loss_amount: 0,
                      loss_remarks: '',
                      remarks: '',
                    });
                    setSettlementModalError(null);
                    setIsSettlementModalOpen(true);
                  }}
                >
                  Record Loss Settlement
                </Button>
              )}
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Settlement Date</TableCell>
                  <TableCell align="right">Loss Amount (₹)</TableCell>
                  <TableCell>Damage / Loss Details</TableCell>
                  <TableCell>General Remarks</TableCell>
                  {canDeleteSettlement && <TableCell align="right">Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {settlements.length > 0 ? (
                  settlements.map((st) => (
                    <TableRow key={st.id} hover>
                      <TableCell>{formatDate(st.settlement_date)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#ef4444' }}>
                        ₹{Number(st.loss_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{st.loss_remarks || '-'}</TableCell>
                      <TableCell>{st.remarks || '-'}</TableCell>
                      {canDeleteSettlement && (
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                type: 'settlement',
                                id: st.id,
                                title: `Loss settlement of ₹${st.loss_amount}`,
                              })
                            }
                            sx={{ color: '#ef4444' }}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canDeleteSettlement ? 5 : 4} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      No damage/loss settlements recorded. Consignment intact!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Modal: Add Free Distribution Item */}
      <FormModal
        open={isFreeModalOpen}
        title="Record Free Distribution Boxes"
        subtitle="Specify complimentary box giveaway for this dispatch"
        loading={freeModalLoading}
        error={freeModalError}
        submitLabel="Record Free Item"
        onClose={() => setIsFreeModalOpen(false)}
        onSubmit={handleCreateFreeItem}
      >
        <TextField
          select
          label="Associated Produce Line"
          fullWidth
          value={freeFormData.dispatch_item_id || ''}
          onChange={(e) => setFreeFormData({ ...freeFormData, dispatch_item_id: Number(e.target.value) })}
        >
          {dispatch.items?.map((it) => (
            <MenuItem key={it.id} value={it.id}>
              {it.product?.name} - {it.variety || 'N/A'} - {it.grade || 'N/A'} - ({it.box_size_kg === 'DOZEN' ? 'DOZEN' : `${it.box_size_kg} KG`}) - {it.farm?.name || 'Farm'}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Distribution Date"
          type="date"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          value={freeFormData.distribution_date || ''}
          onChange={(e) => setFreeFormData({ ...freeFormData, distribution_date: e.target.value })}
        />

        <TextField
          label="Box Quantity"
          type="number"
          required
          fullWidth
          value={freeFormData.box_quantity}
          onChange={(e) => setFreeFormData({ ...freeFormData, box_quantity: parseFloat(e.target.value) || 0 })}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
        />

        <TextField
          label="Remarks / Recipient"
          fullWidth
          multiline
          rows={2}
          value={freeFormData.remarks || ''}
          onChange={(e) => setFreeFormData({ ...freeFormData, remarks: e.target.value })}
          placeholder="e.g. Complimentary tasting sample to dealer"
        />
      </FormModal>

      {/* Modal: Add Dispatch Settlement */}
      <FormModal
        open={isSettlementModalOpen}
        title="Record Transit Loss / Settlement"
        subtitle="Deduct damages or rotten produce from consignment"
        loading={settlementModalLoading}
        error={settlementModalError}
        submitLabel="Record Settlement"
        onClose={() => setIsSettlementModalOpen(false)}
        onSubmit={handleCreateSettlement}
      >
        <TextField
          label="Settlement Date"
          type="date"
          fullWidth
          slotProps={{ inputLabel: { shrink: true } }}
          value={settlementFormData.settlement_date || ''}
          onChange={(e) => setSettlementFormData({ ...settlementFormData, settlement_date: e.target.value })}
        />

        <TextField
          label="Loss Amount (₹)"
          type="number"
          required
          fullWidth
          value={settlementFormData.loss_amount}
          onChange={(e) => setSettlementFormData({ ...settlementFormData, loss_amount: parseFloat(e.target.value) || 0 })}
          slotProps={{ htmlInput: { min: 0, step: 'any' } }}
        />

        <TextField
          label="Damage / Loss Reason"
          fullWidth
          value={settlementFormData.loss_remarks || ''}
          onChange={(e) => setSettlementFormData({ ...settlementFormData, loss_remarks: e.target.value })}
          placeholder="e.g. 5 boxes spoiled due to transit delay"
        />

        <TextField
          label="General Settlement Remarks"
          fullWidth
          multiline
          rows={2}
          value={settlementFormData.remarks || ''}
          onChange={(e) => setSettlementFormData({ ...settlementFormData, remarks: e.target.value })}
          placeholder="e.g. Agreed 50% discount with dealer"
        />
      </FormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Record"
        message="Are you sure you want to remove this entry?"
        itemName={deleteDialog.title}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteDialog({ ...deleteDialog, open: false })}
      />
    </Box>
  );
};

export default DispatchDetailPage;
