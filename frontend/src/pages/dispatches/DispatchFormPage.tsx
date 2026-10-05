import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
  Typography,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import LoadingScreen from '../../components/common/LoadingScreen';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

import dispatchService from '../../services/dispatchService';
import seasonService from '../../services/seasonService';
import dealerService from '../../services/dealerService';
import farmService from '../../services/farmService';
import productService from '../../services/productService';
import seasonPartnerService from '../../services/seasonPartnerService';

import { Season } from '../../types/season';
import { Dealer } from '../../types/dealer';
import { Farm } from '../../types/farm';
import { Product } from '../../types/product';
import { SeasonPartner } from '../../types/seasonPartner';
import {
  BoxSize,
  DispatchCreateWithItems,
  DispatchItemRequest,
  DispatchItemUpdate,
  DispatchListItem,
  DispatchUpdateWithItems,
  SourceType,
} from '../../types/dispatch';

import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatDate } from '../../utils/dateUtils';

interface FormItemState extends DispatchItemRequest {
  id?: number | null;
}

interface DispatchDefaults {
  farm_id?: number;
  dispatch_date?: string;
  dealer_id?: number;
  product_id?: number;
  variety?: string;
  grade?: string;
  box_size_kg?: BoxSize;
  vehicle_no?: string;
  driver_name?: string;
  transport_name?: string;
}

const DISPATCH_DEFAULTS_KEY = 'farm_erp_dispatch_defaults';

export const DispatchFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<React.ReactNode | null>(null);

  // Lookups
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [seasonPartners, setSeasonPartners] = useState<SeasonPartner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [existingDispatches, setExistingDispatches] = useState<DispatchListItem[]>([]);

  // Dispatch Master Fields
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [seasonId, setSeasonId] = useState<number | ''>('');
  const [dealerId, setDealerId] = useState<number | ''>('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transportName, setTransportName] = useState('');
  const [transportCharge, setTransportCharge] = useState<number>(0);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState('COMPLETED');

  // Items
  const [items, setItems] = useState<FormItemState[]>([
    {
      farm_id: undefined,
      product_id: undefined,
      source_type: 'FARM',
      variety: 'Kesar',
      grade: 'A',
      box_size_kg: '10',
      box_quantity: 50,
      price_per_box: 1000,
      remarks: '',
    },
  ]);

  // Compute available farms associated with selected season
  const availableFarms = React.useMemo(() => {
    if (!seasonId) return [];
    const associatedFarmIds = new Set(
      seasonPartners
        .filter((sp) => sp.season_id === Number(seasonId))
        .map((sp) => sp.farm_id)
    );
    return farms.filter((f) => associatedFarmIds.has(f.id));
  }, [seasonId, seasonPartners, farms]);

  // Season Change Handler: Update season and align farm selections with the new season
  const handleSeasonChange = (newSeasonId: number) => {
    setSeasonId(newSeasonId);
    const newSeasonFarmIds = new Set(
      seasonPartners.filter((sp) => sp.season_id === newSeasonId).map((sp) => sp.farm_id)
    );
    const newAvailableFarms = farms.filter((f) => newSeasonFarmIds.has(f.id));
    const fallbackFarmId = newAvailableFarms[0]?.id || undefined;

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (!item.farm_id || !newSeasonFarmIds.has(item.farm_id)) {
          return { ...item, farm_id: fallbackFarmId };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        const [seasonList, dealerList, farmList, productList, dispatchList, seasonPartnerList] = await Promise.all([
          seasonService.getAll(),
          dealerService.getAll(),
          farmService.getAll(),
          productService.getAll(),
          dispatchService.getAll(),
          seasonPartnerService.getAll(),
        ]);

        setSeasons(seasonList);
        setDealers(dealerList);
        setFarms(farmList);
        setSeasonPartners(seasonPartnerList);
        setProducts(productList);
        setExistingDispatches(dispatchList);

        if (!isEdit) {
          // Check for saved defaults in localStorage
          let savedDefaults: DispatchDefaults | null = null;
          try {
            const rawDefaults = localStorage.getItem(DISPATCH_DEFAULTS_KEY);
            if (rawDefaults) {
              savedDefaults = JSON.parse(rawDefaults);
            }
          } catch (e) {
            console.error('Error reading dispatch defaults from localStorage', e);
          }

          const latestSeason =
            seasonList.find((s) => s.status === 'ACTIVE') ||
            [...seasonList].sort((a, b) => {
              const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
              const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
              if (dateB !== dateA) return dateB - dateA;
              return b.id - a.id;
            })[0];

          const initialSeasonId = latestSeason ? latestSeason.id : '';
          if (initialSeasonId) setSeasonId(initialSeasonId);

          // Compute season-associated farms for initial default
          const initialSeasonFarmIds = new Set(
            seasonPartnerList
              .filter((sp) => sp.season_id === Number(initialSeasonId))
              .map((sp) => sp.farm_id)
          );
          const initialAvailableFarms = farmList.filter((f) => initialSeasonFarmIds.has(f.id));

          // Apply saved date if available
          if (savedDefaults?.dispatch_date) {
            setDispatchDate(savedDefaults.dispatch_date);
          }

          // Apply saved dealer if available and valid
          if (savedDefaults?.dealer_id && dealerList.some((d) => d.id === savedDefaults!.dealer_id)) {
            setDealerId(savedDefaults.dealer_id);
          } else if (dealerList.length > 0) {
            setDealerId(dealerList[0].id);
          }

          // Apply saved transport / vehicle details if available
          if (savedDefaults?.vehicle_no) setVehicleNo(savedDefaults.vehicle_no);
          if (savedDefaults?.driver_name) setDriverName(savedDefaults.driver_name);
          if (savedDefaults?.transport_name) setTransportName(savedDefaults.transport_name);

          setStatus('COMPLETED');

          // Apply default farm (must be associated with selected season) and product to items
          const defaultFarmId =
            savedDefaults?.farm_id && initialAvailableFarms.some((f) => f.id === savedDefaults!.farm_id)
              ? savedDefaults.farm_id
              : initialAvailableFarms[0]?.id;

          const defaultProductId =
            savedDefaults?.product_id && productList.some((p) => p.id === savedDefaults!.product_id)
              ? savedDefaults.product_id
              : productList[0]?.id;

          const defaultVariety = savedDefaults?.variety ?? 'Kesar';
          const defaultGrade = savedDefaults?.grade ?? 'A';
          const defaultBoxSize = savedDefaults?.box_size_kg ?? '10';

          setItems([
            {
              farm_id: defaultFarmId,
              product_id: defaultProductId,
              source_type: 'FARM',
              variety: defaultVariety,
              grade: defaultGrade,
              box_size_kg: defaultBoxSize,
              box_quantity: 50,
              price_per_box: 1000,
              remarks: '',
            },
          ]);
        } else if (id) {
          // Edit mode: fetch existing dispatch details
          const dispatch = await dispatchService.getById(Number(id));
          setDispatchDate(dispatch.dispatch_date || '');
          setSeasonId(dispatch.season_id || '');
          setDealerId(dispatch.dealer_id || '');
          setVehicleNo(dispatch.vehicle_no || '');
          setDriverName(dispatch.driver_name || '');
          setTransportName(dispatch.transport_name || '');
          setTransportCharge(Number(dispatch.transport_charge || 0));
          setRemarks(dispatch.remarks || '');
          setStatus(dispatch.status || 'PENDING');

          if (dispatch.items && dispatch.items.length > 0) {
            setItems(
              dispatch.items.map((it) => ({
                id: it.id,
                farm_id: it.farm_id || undefined,
                product_id: it.product_id || undefined,
                source_type: it.source_type,
                variety: it.variety || '',
                grade: it.grade || '',
                box_size_kg: it.box_size_kg,
                box_quantity: Number(it.box_quantity),
                price_per_box: Number(it.price_per_box),
                remarks: it.remarks || '',
              }))
            );
          }
        }
      } catch (e) {
        showError('Failed to load dispatch form dependencies.');
        console.error(e);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [id, isEdit]);

  const saveCurrentDefaults = () => {
    try {
      const defaults: DispatchDefaults = {
        farm_id: items[0]?.farm_id ?? undefined,
        dispatch_date: dispatchDate,
        dealer_id: typeof dealerId === 'number' ? dealerId : undefined,
        product_id: items[0]?.product_id ?? undefined,
        variety: items[0]?.variety ?? undefined,
        grade: items[0]?.grade ?? undefined,
        box_size_kg: items[0]?.box_size_kg ?? undefined,
        vehicle_no: vehicleNo || undefined,
        driver_name: driverName || undefined,
        transport_name: transportName || undefined,
      };
      localStorage.setItem(DISPATCH_DEFAULTS_KEY, JSON.stringify(defaults));
      showSuccess('Current form selections saved as your default preferences!');
    } catch (e) {
      console.error('Failed to save defaults', e);
    }
  };

  const clearSavedDefaults = () => {
    localStorage.removeItem(DISPATCH_DEFAULTS_KEY);
    showSuccess('Saved defaults cleared. System defaults restored.');
  };

  const handleAddItemRow = () => {
    const lastItem = items[items.length - 1];
    const defaultFarmId =
      lastItem?.farm_id && availableFarms.some((f) => f.id === lastItem.farm_id)
        ? lastItem.farm_id
        : availableFarms[0]?.id;

    setItems([
      ...items,
      {
        farm_id: defaultFarmId,
        product_id: lastItem?.product_id ?? products[0]?.id,
        source_type: lastItem?.source_type ?? 'FARM',
        variety: lastItem?.variety ?? 'Kesar',
        grade: lastItem?.grade ?? '',
        box_size_kg: lastItem?.box_size_kg ?? '10',
        box_quantity: 1,
        price_per_box: 0,
        remarks: '',
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) {
      showError('A dispatch must have at least one crop item.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItemState, value: unknown) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalCalculatedBoxes = items.reduce((acc, it) => acc + (Number(it.box_quantity) || 0), 0);
  const totalCalculatedAmount = Math.round(
    items.reduce(
      (acc, it) => acc + (Number(it.box_quantity) || 0) * (Number(it.price_per_box) || 0),
      0
    )
  );

  const duplicateDispatch = existingDispatches.find(
    (d) =>
      d.dispatch_date === dispatchDate &&
      d.dealer_id === Number(dealerId) &&
      (!isEdit || d.id !== Number(id))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dealerId || !seasonId) {
      setErrorMessage('Please select both a Season and a Dealer.');
      return;
    }

    if (duplicateDispatch) {
      const selectedDealer = dealers.find((d) => d.id === Number(dealerId));
      setErrorMessage(
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <span>
            A dispatch for <strong>{selectedDealer?.name || 'this dealer'}</strong> on <strong>{formatDate(dispatchDate)}</strong> already exists (Dispatch #{duplicateDispatch.dispatch_no}).
          </span>
          <Button
            component="a"
            href={`/dispatches/edit/${duplicateDispatch.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/dispatches/edit/${duplicateDispatch.id}`, '_blank');
            }}
            color="error"
            variant="contained"
            size="small"
            startIcon={<OpenInNewIcon />}
            sx={{ fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Edit in New Tab
          </Button>
        </Box>
      );
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one dispatch line item.');
      return;
    }

    if (availableFarms.length === 0) {
      setErrorMessage('No farms are associated with the selected season. Please associate farms with this season in Season Partners before creating a dispatch.');
      return;
    }

    for (const it of items) {
      if (!it.farm_id || !availableFarms.some((f) => f.id === it.farm_id)) {
        setErrorMessage('Each crop item must have a valid Farm selected that is associated with the active season.');
        return;
      }
      if (!it.product_id) {
        setErrorMessage('Each item must have a Product selected.');
        return;
      }
      if (Number(it.box_quantity) <= 0) {
        setErrorMessage('Box quantity must be greater than 0.');
        return;
      }
      if (Number(it.price_per_box) < 0) {
        setErrorMessage('Price per box cannot be negative.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEdit && id) {
        const payload: DispatchUpdateWithItems = {
          dispatch_date: dispatchDate || null,
          season_id: Number(seasonId),
          dealer_id: Number(dealerId),
          vehicle_no: vehicleNo || null,
          driver_name: driverName || null,
          transport_name: transportName || null,
          transport_charge: Number(transportCharge) || 0,
          remarks: remarks || null,
          status: status || null,
          created_by: user?.id || 1,
          items: items.map((it) => ({
            id: it.id,
            farm_id: it.farm_id || null,
            product_id: it.product_id || null,
            source_type: it.source_type,
            variety: it.variety ? it.variety.trim() : null,
            grade: it.grade ? it.grade.trim() : null,
            box_size_kg: it.box_size_kg,
            box_quantity: Number(it.box_quantity),
            price_per_box: Number(it.price_per_box),
            remarks: it.remarks ? it.remarks.trim() : null,
          })) as DispatchItemUpdate[],
        };

        await dispatchService.updateWithItems(Number(id), payload);
        showSuccess('Dispatch updated successfully!');
        navigate(`/dispatches/${id}`);
      } else {
        const payload: DispatchCreateWithItems = {
          dispatch_date: dispatchDate || null,
          season_id: Number(seasonId),
          dealer_id: Number(dealerId),
          vehicle_no: vehicleNo || null,
          driver_name: driverName || null,
          transport_name: transportName || null,
          transport_charge: Number(transportCharge) || 0,
          remarks: remarks || null,
          status: status || 'PENDING',
          created_by: user?.id || 1,
          items: items.map((it) => ({
            farm_id: it.farm_id || null,
            product_id: it.product_id || null,
            source_type: it.source_type,
            variety: it.variety ? it.variety.trim() : null,
            grade: it.grade ? it.grade.trim() : null,
            box_size_kg: it.box_size_kg,
            box_quantity: Number(it.box_quantity),
            price_per_box: Number(it.price_per_box),
            remarks: it.remarks ? it.remarks.trim() : null,
          })),
        };

        const res = await dispatchService.createWithItems(payload);

        // Auto-remember last used defaults in browser
        try {
          const defaults: DispatchDefaults = {
            farm_id: items[0]?.farm_id ?? undefined,
            dispatch_date: dispatchDate,
            dealer_id: typeof dealerId === 'number' ? dealerId : undefined,
            product_id: items[0]?.product_id ?? undefined,
            variety: items[0]?.variety ?? undefined,
            grade: items[0]?.grade ?? undefined,
            box_size_kg: items[0]?.box_size_kg ?? undefined,
            vehicle_no: vehicleNo || undefined,
            driver_name: driverName || undefined,
            transport_name: transportName || undefined,
          };
          localStorage.setItem(DISPATCH_DEFAULTS_KEY, JSON.stringify(defaults));
        } catch (e) {
          console.error('Failed to auto-save dispatch defaults', e);
        }

        showSuccess('Dispatch created successfully!');
        navigate(`/dispatches/${res.id}`);
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to save dispatch. Please check form inputs.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return <LoadingScreen message="Loading dispatch dependencies..." />;
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? 'Edit Dispatch' : 'Create New Dispatch'}
        subtitle="Record consignments, vehicle logistics, and crop line items"
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Dispatches', path: '/dispatches' },
          { label: isEdit ? 'Edit' : 'Create' },
        ]}
        extraActions={
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isEdit && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<BookmarkBorderOutlinedIcon />}
                  onClick={saveCurrentDefaults}
                  title="Save current selections as default for future dispatches"
                >
                  Save as Defaults
                </Button>
                <Button
                  variant="text"
                  size="small"
                  color="inherit"
                  startIcon={<RestartAltIcon />}
                  onClick={clearSavedDefaults}
                  title="Clear remembered defaults"
                >
                  Reset Defaults
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/dispatches')}
            >
              Cancel
            </Button>
          </Box>
        }
      />

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {/* Dispatch Logistics & Dealer Card */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            Consignment & Transport Details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Assign dealer, active season, and vehicle tracking info
          </Typography>

          {duplicateDispatch && (
            <Alert
              severity="warning"
              sx={{ mb: 2.5, borderRadius: 2, alignItems: 'center' }}
              action={
                <Button
                  component="a"
                  href={`/dispatches/edit/${duplicateDispatch.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/dispatches/edit/${duplicateDispatch.id}`, '_blank');
                  }}
                  color="warning"
                  variant="contained"
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  sx={{ fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
                >
                  Edit in New Tab
                </Button>
              }
            >
              A dispatch already exists for{' '}
              <strong>{dealers.find((d) => d.id === dealerId)?.name || 'this dealer'}</strong> on{' '}
              <strong>{formatDate(dispatchDate)}</strong> (Dispatch #{duplicateDispatch.dispatch_no}). You cannot create duplicate
              dispatches for the same dealer on the same date.
            </Alert>
          )}

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Dispatch Date"
                type="date"
                required
                fullWidth
                error={Boolean(duplicateDispatch)}
                slotProps={{ inputLabel: { shrink: true } }}
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                label="Season"
                required
                fullWidth
                value={seasonId}
                onChange={(e) => handleSeasonChange(Number(e.target.value))}
                helperText={
                  seasonId && availableFarms.length === 0
                    ? 'No farms associated with this season'
                    : seasonId
                    ? `${availableFarms.length} farm(s) linked to season`
                    : undefined
                }
              >
                {seasons.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                label="Wholesale Dealer"
                required
                fullWidth
                error={Boolean(duplicateDispatch)}
                value={dealerId}
                onChange={(e) => setDealerId(Number(e.target.value))}
              >
                {dealers.map((d) => (
                  <MenuItem key={d.id} value={d.id}>
                    {d.name} {d.city ? `(${d.city})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                label="Dispatch Status"
                fullWidth
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Vehicle Number"
                fullWidth
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                placeholder="e.g. GJ-11-AB-1234"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Driver Name"
                fullWidth
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Salim Khan"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Transport Company"
                fullWidth
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                placeholder="e.g. Somnath Roadlines"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                label="Transport Charge (₹)"
                type="number"
                fullWidth
                value={transportCharge}
                onChange={(e) => setTransportCharge(parseFloat(e.target.value) || 0)}
                slotProps={{ htmlInput: { min: 0, step: 'any' } }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Dispatch Remarks / Gate Pass Notes"
                fullWidth
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional delivery instructions or notes..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Dispatched Crop Items Section */}
      <Card sx={{ mb: 3.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Dispatched Produce Items
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Specify source farm (associated with selected season), crop variety, box sizes, quantities, and rates
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddCircleOutlineOutlinedIcon />}
              onClick={handleAddItemRow}
              disabled={availableFarms.length === 0}
            >
              Add Crop Line
            </Button>
          </Box>

          {seasonId && availableFarms.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
              No farms are associated with this season. Please add farm partnerships under <strong>Season Partners</strong> before adding crop line items.
            </Alert>
          )}

          <Paper sx={{ width: '100%', overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 160 }}>Farm ({availableFarms.length})</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>Product</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>Source</TableCell>
                  <TableCell sx={{ minWidth: 110 }}>Variety</TableCell>
                  <TableCell sx={{ minWidth: 90 }}>Grade</TableCell>
                  <TableCell sx={{ minWidth: 100 }}>Box Size</TableCell>
                  <TableCell sx={{ minWidth: 110 }} align="right">Qty (Boxes)</TableCell>
                  <TableCell sx={{ minWidth: 120 }} align="right">Rate/Box (₹)</TableCell>
                  <TableCell sx={{ minWidth: 120 }} align="right">Amount (₹)</TableCell>
                  <TableCell sx={{ width: 50 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const lineAmount = Math.round((Number(item.box_quantity) || 0) * (Number(item.price_per_box) || 0));

                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={availableFarms.some((f) => f.id === item.farm_id) ? (item.farm_id || '') : ''}
                          onChange={(e) => handleItemChange(index, 'farm_id', Number(e.target.value))}
                          error={Boolean(!item.farm_id || !availableFarms.some((f) => f.id === item.farm_id))}
                          helperText={availableFarms.length === 0 ? 'No farms in season' : undefined}
                        >
                          {availableFarms.length === 0 ? (
                            <MenuItem disabled value="">
                              <em>No associated farms</em>
                            </MenuItem>
                          ) : (
                            availableFarms.map((f) => (
                              <MenuItem key={f.id} value={f.id}>
                                {f.name}
                              </MenuItem>
                            ))
                          )}
                        </TextField>
                      </TableCell>

                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={item.product_id || ''}
                          onChange={(e) => handleItemChange(index, 'product_id', Number(e.target.value))}
                        >
                          {products.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>

                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={item.source_type}
                          onChange={(e) => handleItemChange(index, 'source_type', e.target.value as SourceType)}
                        >
                          <MenuItem value="FARM">FARM</MenuItem>
                          <MenuItem value="MARKET">MARKET</MenuItem>
                        </TextField>
                      </TableCell>

                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={item.variety ?? ''}
                          onChange={(e) => handleItemChange(index, 'variety', e.target.value)}
                          placeholder="e.g. Kesar"
                        />
                      </TableCell>

                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={item.grade ?? ''}
                          onChange={(e) => handleItemChange(index, 'grade', e.target.value)}
                          placeholder="A/B/C"
                        />
                      </TableCell>

                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={item.box_size_kg}
                          onChange={(e) => handleItemChange(index, 'box_size_kg', e.target.value as BoxSize)}
                        >
                          <MenuItem value="5">5 KG</MenuItem>
                          <MenuItem value="10">10 KG</MenuItem>
                          <MenuItem value="20">20 KG</MenuItem>
                          <MenuItem value="DOZEN">DOZEN</MenuItem>
                        </TextField>
                      </TableCell>

                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={item.box_quantity}
                          onChange={(e) => handleItemChange(index, 'box_quantity', parseFloat(e.target.value) || 0)}
                          slotProps={{ htmlInput: { min: 1, step: 1, style: { textAlign: 'right' } } }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={item.price_per_box}
                          onChange={(e) => handleItemChange(index, 'price_per_box', parseFloat(e.target.value) || 0)}
                          slotProps={{ htmlInput: { min: 0, step: 'any', style: { textAlign: 'right' } } }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>
                          ₹{lineAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItemRow(index)}
                          sx={{ color: '#ef4444' }}
                          disabled={items.length <= 1}
                        >
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>

          {/* Totals Banner */}
          <Box
            sx={{
              mt: 2.5,
              p: 2,
              borderRadius: 2,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Dispatched Boxes
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {totalCalculatedBoxes.toLocaleString()} Boxes
              </Typography>
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">
                Total Produce Valuation
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
                ₹{totalCalculatedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Bottom Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pb: 4 }}>
        <Button variant="outlined" onClick={() => navigate('/dispatches')} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
          sx={{ px: 4, py: 1.25, fontWeight: 700 }}
        >
          {isEdit ? 'Save Changes' : 'Generate Dispatch'}
        </Button>
      </Box>
    </Box>
  );
};

export default DispatchFormPage;
