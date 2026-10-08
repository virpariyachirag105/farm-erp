import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Divider,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Paper,
  Chip,
} from '@mui/material';
import AgricultureIcon from '@mui/icons-material/Agriculture';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ScaleIcon from '@mui/icons-material/Scale';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useNavigate } from 'react-router-dom';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import StatusChip from '../../components/common/StatusChip';
import { useAuth } from '../../context/AuthContext';

import farmService from '../../services/farmService';
import seasonService from '../../services/seasonService';
import dealerService from '../../services/dealerService';
import dispatchService from '../../services/dispatchService';
import seasonPartnerService from '../../services/seasonPartnerService';
import dealerCalculationService from '../../services/dealerCalculationService';

import { DispatchItem, DispatchListItem } from '../../types/dispatch';
import { Farm } from '../../types/farm';
import { Season } from '../../types/season';
import { Dealer } from '../../types/dealer';
import { SeasonPartner } from '../../types/seasonPartner';
import { DealerSummary } from '../../types/dealerCalculation';
import { formatDate } from '../../utils/dateUtils';
import { isUserAdmin } from '../../utils/permissions';

const CHART_COLORS = [
  '#10b981', // Emerald
  '#0284c7', // Sky blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#84cc16', // Lime
  '#06b6d4', // Cyan
];

const formatCurrency = (val: number) =>
  `₹${Math.round(Number(val || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const DashboardPage: React.FC = () => {
  const { user, hasPermission, hasModuleAccess } = useAuth();
  const navigate = useNavigate();

  const canViewDispatch = hasPermission('dispatch.view');
  const canAccessFarms = hasModuleAccess('farm');

  const isUnscoped = isUserAdmin(user) || user?.role_id === 4;

  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [seasonPartners, setSeasonPartners] = useState<SeasonPartner[]>([]);
  const [dispatches, setDispatches] = useState<DispatchListItem[]>([]);
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [dealerSummaries, setDealerSummaries] = useState<DealerSummary[]>([]);

  // Filter States
  const [selectedSeason, setSelectedSeason] = useState<string>('ALL');
  const [selectedFarm, setSelectedFarm] = useState<string>('ALL');

  // Refs to prevent premature and duplicate summary requests
  const isInitializedRef = React.useRef(false);
  const prevFetchKeyRef = React.useRef<string>('');

  // Allowed farms for the logged-in user filtered by selected season
  const userAllowedFarms = useMemo(() => {
    let baseFarms = farms;

    // 1. If a specific season is selected, only show farms associated with that season
    if (selectedSeason !== 'ALL') {
      const sId = Number(selectedSeason);
      const seasonFarmIdSet = new Set<number>();

      // Farms registered in season_partners for this season
      seasonPartners
        .filter((sp) => sp.season_id === sId)
        .forEach((sp) => seasonFarmIdSet.add(sp.farm_id));

      // Include any farms having dispatches/items in this season
      dispatchItems.forEach((it) => {
        const d = dispatches.find((disp) => disp.id === it.dispatch_id);
        if (d?.season_id === sId && it.farm_id) {
          seasonFarmIdSet.add(it.farm_id);
        }
      });

      baseFarms = baseFarms.filter((f) => seasonFarmIdSet.has(f.id));
    }

    // 2. If Partner user (not admin/owner), restrict only to their assigned farms
    if (!isUnscoped) {
      if (user?.partner_farm_ids && user.partner_farm_ids.length > 0) {
        const pSet = new Set(user.partner_farm_ids);
        baseFarms = baseFarms.filter((f) => pSet.has(f.id));
      } else if (user?.id) {
        const pFarmIds = new Set(
          seasonPartners
            .filter((sp) => sp.user_id === user.id)
            .map((sp) => sp.farm_id)
        );
        baseFarms = baseFarms.filter((f) => pFarmIds.has(f.id));
      }
    }

    return baseFarms;
  }, [farms, selectedSeason, seasonPartners, dispatchItems, dispatches, user, isUnscoped]);

  // When selectedSeason or userAllowedFarms changes, refresh selectedFarm
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (userAllowedFarms.length === 0) {
      if (selectedFarm !== 'ALL') setSelectedFarm('ALL');
      return;
    }

    // Automatically select the single farm if only 1 farm exists for this season
    if (userAllowedFarms.length === 1) {
      const singleFarmId = String(userAllowedFarms[0].id);
      if (selectedFarm !== singleFarmId) {
        setSelectedFarm(singleFarmId);
      }
      return;
    }

    if (selectedFarm !== 'ALL' && !userAllowedFarms.some((f) => String(f.id) === selectedFarm)) {
      setSelectedFarm('ALL');
    }
  }, [userAllowedFarms, selectedSeason]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        farmData,
        seasonData,
        dealerData,
        partnerData,
        dispatchData,
        itemData,
      ] = await Promise.all([
        farmService.getAll().catch(() => []),
        seasonService.getAll().catch(() => []),
        dealerService.getAll().catch(() => []),
        seasonPartnerService.getAll().catch(() => []),
        dispatchService.getAll().catch(() => []),
        dispatchService.getDispatchItems().catch(() => []),
      ]);

      // Determine target season: preserve existing selection if valid, or default to ACTIVE/first season
      let targetSeasonId = selectedSeason;
      if (!isInitializedRef.current || targetSeasonId === 'ALL') {
        const defaultSeason = seasonData.find((s: Season) => s.status === 'ACTIVE') || seasonData[0];
        targetSeasonId = defaultSeason ? String(defaultSeason.id) : 'ALL';
      }

      const seasonNum = targetSeasonId === 'ALL' ? 0 : Number(targetSeasonId);

      // Determine allowed farms for this target season
      let initialAllowedFarms = farmData;
      if (targetSeasonId !== 'ALL') {
        const sId = Number(targetSeasonId);
        const sFarmIds = new Set<number>();
        partnerData.filter((sp: SeasonPartner) => sp.season_id === sId).forEach((sp: SeasonPartner) => sFarmIds.add(sp.farm_id));
        itemData.forEach((it: DispatchItem) => {
          const d = dispatchData.find((disp: DispatchListItem) => disp.id === it.dispatch_id);
          if (d?.season_id === sId && it.farm_id) sFarmIds.add(it.farm_id);
        });
        initialAllowedFarms = initialAllowedFarms.filter((f: Farm) => sFarmIds.has(f.id));
      }
      if (!isUnscoped) {
        if (user?.partner_farm_ids && user.partner_farm_ids.length > 0) {
          const pSet = new Set(user.partner_farm_ids);
          initialAllowedFarms = initialAllowedFarms.filter((f: Farm) => pSet.has(f.id));
        } else if (user?.id) {
          const pFarmIds = new Set(
            partnerData.filter((sp: SeasonPartner) => sp.user_id === user.id).map((sp: SeasonPartner) => sp.farm_id)
          );
          initialAllowedFarms = initialAllowedFarms.filter((f: Farm) => pFarmIds.has(f.id));
        }
      }

      let targetFarmId = selectedFarm;
      if (!isInitializedRef.current || (targetFarmId !== 'ALL' && !initialAllowedFarms.some((f: Farm) => String(f.id) === targetFarmId))) {
        targetFarmId = initialAllowedFarms.length === 1 ? String(initialAllowedFarms[0].id) : 'ALL';
      }
      const farmNum = targetFarmId === 'ALL' ? undefined : Number(targetFarmId);

      // Fetch dealer summary exactly once for the resolved season & farm
      const fetchKey = `${seasonNum}_${farmNum ?? 'ALL'}`;
      prevFetchKeyRef.current = fetchKey;

      const initialSummaries = await dealerCalculationService
        .getSeasonSummary(seasonNum, farmNum)
        .catch(() => []);

      setFarms(farmData);
      setSeasons(seasonData);
      setDealers(dealerData);
      setSeasonPartners(partnerData);
      setDispatches(dispatchData);
      setDispatchItems(itemData);
      setDealerSummaries(initialSummaries);
      setSelectedSeason(targetSeasonId);
      setSelectedFarm(targetFarmId);
      isInitializedRef.current = true;
    } catch (e) {
      console.error('Error fetching dashboard metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch dealer calculations dynamically ONLY when user changes season or farm after initial load
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const sId = selectedSeason === 'ALL' ? 0 : Number(selectedSeason);
    const fId = selectedFarm === 'ALL' ? undefined : Number(selectedFarm);
    const currentKey = `${sId}_${fId ?? 'ALL'}`;

    // Skip if already fetched during fetchDashboardData or previous effect
    if (prevFetchKeyRef.current === currentKey) {
      return;
    }

    prevFetchKeyRef.current = currentKey;
    let isCurrent = true;

    dealerCalculationService
      .getSeasonSummary(sId, fId)
      .then((data) => {
        if (isCurrent) {
          setDealerSummaries(data || []);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setDealerSummaries([]);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedSeason, selectedFarm]);

  // Filtered Datasets based on selected season & farm
  const {
    filteredDispatches,
    filteredFarms,
    totalRevenue,
    netRevenue,
    totalWeightKg,
    totalBoxes,
    count5kg,
    count10kg,
    count20kg,
    countDozen,
    dealerRevenueData,
    locationRevenueData,
    farmRevenueData,
  } = useMemo(() => {
    const isAll = selectedSeason === 'ALL';
    const seasonIdNum = Number(selectedSeason);
    const isFarmAll = selectedFarm === 'ALL';
    const farmIdNum = Number(selectedFarm);

    const partnerFarmIdSet = !isUnscoped && user?.partner_farm_ids && user.partner_farm_ids.length > 0
      ? new Set(user.partner_farm_ids)
      : null;

    // Filter dispatches based on selected season and farm
    const fDispatches = dispatches.filter((d) => {
      if (!isAll && d.season_id !== seasonIdNum) return false;
      if (!isFarmAll) {
        return dispatchItems.some((it) => it.dispatch_id === d.id && it.farm_id === farmIdNum);
      }
      if (partnerFarmIdSet) {
        return dispatchItems.some((it) => it.dispatch_id === d.id && it.farm_id && partnerFarmIdSet.has(it.farm_id));
      }
      return true;
    });

    const fDispatchIdSet = new Set(fDispatches.map((d) => d.id));

    // Filter dispatch items
    const fItems = dispatchItems.filter((it) => {
      if (!fDispatchIdSet.has(it.dispatch_id)) return false;
      if (!isFarmAll) {
        return it.farm_id === farmIdNum;
      }
      if (partnerFarmIdSet) {
        return it.farm_id && partnerFarmIdSet.has(it.farm_id);
      }
      return true;
    });

    // Filter farms
    const fFarms = isFarmAll
      ? userAllowedFarms
      : userAllowedFarms.filter((f) => f.id === farmIdNum);

    // KPI Metrics:
    // If specific farm or partner is selected, isolate that farm's items revenue
    // If All Farms is selected by Admin, sum total dispatches
    const rev = !isFarmAll || !isUnscoped
      ? fItems.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0)
      : fDispatches.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);

    // Net Revenue from dealer summaries calculated by backend for the selected season & farm
    const netRev = dealerSummaries.reduce((acc, d) => acc + Number(d.totals?.net_amount || 0), 0);

    const boxes = !isFarmAll || !isUnscoped
      ? fItems.reduce((acc, curr) => acc + Number(curr.box_quantity || 0), 0)
      : fDispatches.reduce((acc, curr) => acc + Number(curr.total_boxes || 0), 0);

    const weight = fItems.reduce((acc, curr) => {
      if (curr.total_weight_kg && Number(curr.total_weight_kg) > 0) {
        return acc + Number(curr.total_weight_kg);
      }
      const size = Number(curr.box_size_kg);
      if (!isNaN(size) && size > 0) {
        return acc + (Number(curr.box_quantity || 0) * size);
      }
      return acc;
    }, 0);

    // Box Breakdown counts
    const c5 = fItems
      .filter((it) => it.box_size_kg === '5')
      .reduce((sum, it) => sum + Number(it.box_quantity || 0), 0);
    const c10 = fItems
      .filter((it) => it.box_size_kg === '10')
      .reduce((sum, it) => sum + Number(it.box_quantity || 0), 0);
    const c20 = fItems
      .filter((it) => it.box_size_kg === '20')
      .reduce((sum, it) => sum + Number(it.box_quantity || 0), 0);
    const cDzn = fItems
      .filter((it) => String(it.box_size_kg).toUpperCase() === 'DOZEN')
      .reduce((sum, it) => sum + Number(it.box_quantity || 0), 0);

    // 1. Revenue by Dealers
    const dealerMap = new Map<number, { name: string; revenue: number; boxes: number; count: number }>();
    if (!isFarmAll || !isUnscoped) {
      fItems.forEach((it) => {
        const dispatch = fDispatches.find((d) => d.id === it.dispatch_id);
        const dId = dispatch?.dealer_id || 0;
        const dName = dealers.find((dl) => dl.id === dId)?.name || dispatch?.dealer?.name || 'Direct / Unknown';
        const existing = dealerMap.get(dId) || { name: dName, revenue: 0, boxes: 0, count: 0 };
        existing.revenue += Number(it.total_amount || 0);
        existing.boxes += Number(it.box_quantity || 0);
        dealerMap.set(dId, existing);
      });
      dealerMap.forEach((val, dId) => {
        val.count = new Set(
          fItems
            .filter((it) => {
              const dispatch = fDispatches.find((d) => d.id === it.dispatch_id);
              return (dispatch?.dealer_id || 0) === dId;
            })
            .map((it) => it.dispatch_id)
        ).size;
      });
    } else {
      fDispatches.forEach((d) => {
        const dId = d.dealer_id || 0;
        const dName = dealers.find((dl) => dl.id === dId)?.name || d.dealer?.name || 'Direct / Unknown';
        const existing = dealerMap.get(dId) || { name: dName, revenue: 0, boxes: 0, count: 0 };
        existing.revenue += Number(d.total_amount || 0);
        existing.boxes += Number(d.total_boxes || 0);
        existing.count += 1;
        dealerMap.set(dId, existing);
      });
    }

    const dRevenueData = Array.from(dealerMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((d) => ({
        name: d.name,
        revenue: Math.round(d.revenue),
        boxes: d.boxes,
        dispatches: d.count,
      }));

    // 2. Revenue by Dealer Location (City)
    const locationMap = new Map<string, { location: string; revenue: number; dispatches: number }>();
    if (!isFarmAll || !isUnscoped) {
      fItems.forEach((it) => {
        const dispatch = fDispatches.find((d) => d.id === it.dispatch_id);
        const dealer = dealers.find((dl) => dl.id === dispatch?.dealer_id);
        const loc = dealer?.city?.trim() || 'General / Local';
        const existing = locationMap.get(loc) || { location: loc, revenue: 0, dispatches: 0 };
        existing.revenue += Number(it.total_amount || 0);
        locationMap.set(loc, existing);
      });
      locationMap.forEach((val, loc) => {
        val.dispatches = new Set(
          fItems
            .filter((it) => {
              const dispatch = fDispatches.find((d) => d.id === it.dispatch_id);
              const dealer = dealers.find((dl) => dl.id === dispatch?.dealer_id);
              return (dealer?.city?.trim() || 'General / Local') === loc;
            })
            .map((it) => it.dispatch_id)
        ).size;
      });
    } else {
      fDispatches.forEach((d) => {
        const dealer = dealers.find((dl) => dl.id === d.dealer_id);
        const loc = dealer?.city?.trim() || 'General / Local';
        const existing = locationMap.get(loc) || { location: loc, revenue: 0, dispatches: 0 };
        existing.revenue += Number(d.total_amount || 0);
        existing.dispatches += 1;
        locationMap.set(loc, existing);
      });
    }

    const locRevenueData = Array.from(locationMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((l) => ({
        name: l.location,
        value: Math.round(l.revenue),
        dispatches: l.dispatches,
      }));

    // 3. Revenue by Farms
    const farmMap = new Map<number, { name: string; revenue: number; weight: number; boxes: number }>();
    fItems.forEach((it) => {
      const fId = it.farm_id || 0;
      const farmObj = farms.find((f) => f.id === fId);
      const fName = farmObj?.name || it.farm?.name || 'Unassigned / Market';
      const existing = farmMap.get(fId) || { name: fName, revenue: 0, weight: 0, boxes: 0 };
      existing.revenue += Number(it.total_amount || 0);
      existing.weight += Number(it.total_weight_kg || 0);
      existing.boxes += Number(it.box_quantity || 0);
      farmMap.set(fId, existing);
    });

    const fRevenueData = Array.from(farmMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((f) => ({
        name: f.name,
        revenue: Math.round(f.revenue),
        weightKg: Math.round(f.weight),
        boxes: Math.round(f.boxes),
      }));

    return {
      filteredDispatches: fDispatches,
      filteredItems: fItems,
      filteredFarms: fFarms,
      totalRevenue: rev,
      netRevenue: netRev,
      totalWeightKg: weight,
      totalBoxes: boxes,
      count5kg: c5,
      count10kg: c10,
      count20kg: c20,
      countDozen: cDzn,
      dealerRevenueData: dRevenueData,
      locationRevenueData: locRevenueData,
      farmRevenueData: fRevenueData,
    };
  }, [
    selectedSeason,
    selectedFarm,
    dispatches,
    dispatchItems,
    farms,
    dealers,
    seasonPartners,
    dealerSummaries,
    userAllowedFarms,
    isUnscoped,
    user,
  ]);

  if (loading) {
    return <LoadingScreen message="Loading Bhagavati Farm metrics..." />;
  }

  const selectedSeasonObj = seasons.find((s) => String(s.id) === selectedSeason);
  const selectedFarmObj = farms.find((f) => String(f.id) === selectedFarm);
  const totalMaunds = totalWeightKg / 20;

  return (
    <Box>
      <PageHeader
        title={`Welcome back, ${user?.name || 'Administrator'}!`}
        subtitle="Operational overview, crop logistics, and revenue analytics"
        breadcrumbs={[{ label: 'Dashboard' }]}
        extraActions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="Season"
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              sx={{
                minWidth: 180,
                backgroundColor: '#ffffff',
                borderRadius: 2,
              }}
            >
              <MenuItem value="ALL">
                <em>🌟 All Seasons</em>
              </MenuItem>
              {seasons.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} {s.status === 'ACTIVE' ? '🟢' : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Farm"
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              sx={{
                minWidth: 180,
                backgroundColor: '#ffffff',
                borderRadius: 2,
              }}
            >
              {isUnscoped && (
                <MenuItem value="ALL">
                  <em>🌟 All Farms ({userAllowedFarms.length})</em>
                </MenuItem>
              )}
              {!isUnscoped && userAllowedFarms.length > 1 && (
                <MenuItem value="ALL">
                  <em>🌟 All Assigned Farms ({userAllowedFarms.length})</em>
                </MenuItem>
              )}
              {userAllowedFarms.map((f) => (
                <MenuItem key={f.id} value={String(f.id)}>
                  {f.name} {f.location ? `(${f.location})` : ''}
                </MenuItem>
              ))}
            </TextField>

            <Tooltip title="Refresh Dashboard">
              <IconButton onClick={fetchDashboardData} sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      {/* Primary Season KPI Summary Cards */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Total Farms / Selected Farm */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title={selectedFarm !== 'ALL' ? 'Selected Farm' : 'Total Farms'}
            value={selectedFarm !== 'ALL' ? (selectedFarmObj?.name || 'Farm') : filteredFarms.length}
            subtitle={
              selectedFarm !== 'ALL'
                ? (selectedFarmObj?.location ? `Location: ${selectedFarmObj.location}` : 'Assigned Farm')
                : selectedSeason === 'ALL'
                  ? `${filteredFarms.filter((f) => f.farm_type === 'OWN').length} Owned • ${filteredFarms.filter((f) => f.farm_type === 'MARKET').length} Market`
                  : `Active in ${selectedSeasonObj?.name || 'selected season'}`
            }
            icon={<AgricultureIcon />}
            color="#16a34a"
            onClick={() => navigate('/farms')}
          />
        </Grid>

        {/* Total Dispatches with Sub-Calculation of Maunds & KGs */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Dispatches"
            value={`${filteredDispatches.length}`}
            subtitle={`${totalMaunds.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Maund ( ${totalBoxes.toLocaleString()} Boxes)`}
            icon={<LocalShippingIcon />}
            color="#0284c7"
            onClick={() => navigate('/dispatches')}
          />
        </Grid>

        {/* Total Revenue */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Revenue"
            value={formatCurrency(totalRevenue)}
            subtitle={`${filteredDispatches.length} dispatches consigned`}
            icon={<AttachMoneyIcon />}
            color="#d97706"
            onClick={() => navigate('/dispatches')}
          />
        </Grid>

        {/* Net Revenue */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Net Revenue"
            value={formatCurrency(netRevenue)}
            subtitle="After commission, transport & loss"
            icon={<AccountBalanceWalletOutlinedIcon />}
            color="#10b981"
            onClick={() => navigate('/calculations/dealer')}
          />
        </Grid>
      </Grid>

      {/* Box Breakdown Sub-Calculation Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3.5,
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
          <ScaleIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Dispatch Weight & Box Sub-Calculations ({selectedSeason === 'ALL' ? 'All Seasons' : selectedSeasonObj?.name}):
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={
              <span>
                <strong>Weight:</strong> {totalMaunds.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Maund (20kg)
                <span style={{ opacity: 0.75, marginLeft: '6px', fontSize: '0.75rem' }}>
                  ({totalWeightKg.toLocaleString('en-IN')} KG)
                </span>
              </span>
            }
            sx={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 600, border: '1px solid #bae6fd' }}
          />
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
            label={<span><strong>Total:</strong> {totalBoxes.toLocaleString()} boxes</span>}
            sx={{ backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 700 }}
          />
        </Box>
      </Paper>

      {/* Analytics & Graphs Section */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Graph 1: Revenue by Dealers */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <StorefrontIcon sx={{ color: '#0284c7' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      Revenue by Dealers
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sales distribution across consigned buyers
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${dealerRevenueData.length} Dealers`}
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {dealerRevenueData.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No dealer revenue recorded for this season.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dealerRevenueData.slice(0, 8)}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Revenue']}
                        contentStyle={{
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Graph 2: Revenue by Dealer's Location */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <LocationOnIcon sx={{ color: '#ec4899' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      Revenue by Dealer Location
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Geographic market concentration & hub breakdown
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${locationRevenueData.length} Locations`}
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {locationRevenueData.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No location data recorded for this season.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 320, display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={locationRevenueData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={105}
                        innerRadius={55}
                        paddingAngle={3}
                        label={({ name, percent }: { name?: string; percent?: number }) =>
                          `${name || ''} (${((percent || 0) * 100).toFixed(0)}%)`
                        }
                      >
                        {locationRevenueData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Revenue']}
                        contentStyle={{
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Graph 3: Revenue by Farms */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <AgricultureIcon sx={{ color: '#16a34a' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      Revenue by Farms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Harvest sales contribution by farm source
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={`${farmRevenueData.length} Contributing Farms`}
                  size="small"
                  sx={{ fontWeight: 600, bgcolor: '#f1f5f9' }}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {farmRevenueData.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No farm harvest sales data recorded for this season.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={farmRevenueData}
                      margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      />
                      <RechartsTooltip
                        formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Farm Revenue']}
                        contentStyle={{
                          borderRadius: 8,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '1px solid #e2e8f0',
                        }}
                      />
                      <Bar dataKey="revenue" fill="#16a34a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Row: Recent Dispatches & Farm Summary */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Recent Dispatches ({filteredDispatches.length})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Latest shipments and delivery consignments
                  </Typography>
                </Box>
                <Button
                  endIcon={<ArrowForwardIcon />}
                  size="small"
                  onClick={() => navigate('/dispatches')}
                >
                  View All
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              {filteredDispatches.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No dispatches recorded for this season yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {filteredDispatches.slice(0, 5).map((disp) => (
                    <Box
                      key={disp.id}
                      onClick={() => canViewDispatch && navigate(`/dispatches/${disp.id}`)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.75,
                        borderRadius: 2,
                        border: '1px solid #f1f5f9',
                        cursor: canViewDispatch ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                        '&:hover': canViewDispatch ? { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' } : {},
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 2,
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <LocalShippingIcon fontSize="small" />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {disp.dispatch_no}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {disp.dealer?.name || 'Unknown Dealer'} • {formatDate(disp.dispatch_date)}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          ₹{Number(disp.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {disp.total_boxes} boxes
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%', borderRadius: 2.5 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Farms Overview
                </Typography>
                {canAccessFarms && (
                  <Button size="small" onClick={() => navigate('/farms')}>
                    Manage
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />

              {filteredFarms.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No farms registered for this season.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {filteredFarms.slice(0, 4).map((farm) => (
                    <Box
                      key={farm.id}
                      sx={{
                        p: 1.75,
                        borderRadius: 2,
                        border: '1px solid #f1f5f9',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {farm.name}
                        </Typography>
                        <StatusChip status={farm.farm_type} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Owner: {farm.owner_name}
                      </Typography>
                      {farm.location && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Location: {farm.location}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
