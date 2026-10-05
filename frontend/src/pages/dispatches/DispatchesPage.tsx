import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import DataTable, { Column } from '../../components/common/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

import dispatchService from '../../services/dispatchService';
import seasonService from '../../services/seasonService';
import dealerService from '../../services/dealerService';

import { DispatchListItem } from '../../types/dispatch';
import { Season } from '../../types/season';
import { Dealer } from '../../types/dealer';
import { formatDate } from '../../utils/dateUtils';

export const DispatchesPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { can } = useAuth();
  const navigate = useNavigate();

  const canCreate = can('create', 'dispatch');
  const canView = can('view', 'dispatch');
  const canEdit = can('update', 'dispatch');
  const canDelete = can('delete', 'dispatch');

  const [dispatches, setDispatches] = useState<DispatchListItem[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters persisted in sessionStorage
  const [seasonFilter, setSeasonFilter] = useState<string>(() => {
    return sessionStorage.getItem('dispatches_season_filter') || '';
  });
  const [dealerFilter, setDealerFilter] = useState<string>(() => {
    return sessionStorage.getItem('dispatches_dealer_filter') || 'ALL';
  });

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [dispatchToDelete, setDispatchToDelete] = useState<DispatchListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Filter dealers to only those associated with the currently selected season
  const filteredDealers = React.useMemo(() => {
    if (seasonFilter === 'ALL' || !seasonFilter) {
      return dealers;
    }
    const seasonId = Number(seasonFilter);
    const seasonDealerIds = new Set(
      dispatches
        .filter((d) => d.season_id === seasonId && d.dealer_id)
        .map((d) => d.dealer_id)
    );
    return dealers.filter((d) => seasonDealerIds.has(d.id));
  }, [seasonFilter, dispatches, dealers]);

  const handleSeasonFilterChange = (val: string) => {
    setSeasonFilter(val);
    sessionStorage.setItem('dispatches_season_filter', val);

    if (val !== 'ALL' && val !== '') {
      const sId = Number(val);
      const sDealerIds = new Set(
        dispatches.filter((d) => d.season_id === sId && d.dealer_id).map((d) => d.dealer_id)
      );
      if (dealerFilter !== 'ALL' && !sDealerIds.has(Number(dealerFilter))) {
        setDealerFilter('ALL');
        sessionStorage.setItem('dispatches_dealer_filter', 'ALL');
      }
    }
  };

  const handleDealerFilterChange = (val: string) => {
    setDealerFilter(val);
    sessionStorage.setItem('dispatches_dealer_filter', val);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dispatchData, seasonData, dealerData] = await Promise.all([
        dispatchService.getAll(),
        seasonService.getAll(),
        dealerService.getAll(),
      ]);
      setDispatches(dispatchData);
      setSeasons(seasonData);
      setDealers(dealerData);

      // Restore saved season or fallback to active/latest season
      const savedSeason = sessionStorage.getItem('dispatches_season_filter');
      let effectiveSeason = 'ALL';
      if (savedSeason && (savedSeason === 'ALL' || seasonData.some((s) => String(s.id) === savedSeason))) {
        setSeasonFilter(savedSeason);
        effectiveSeason = savedSeason;
      } else if (seasonData && seasonData.length > 0) {
        const latestSeason =
          seasonData.find((s) => s.status === 'ACTIVE') ||
          [...seasonData].sort((a, b) => {
            const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
            const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;
            return b.id - a.id;
          })[0];

        if (latestSeason) {
          const defaultSeasonId = String(latestSeason.id);
          setSeasonFilter(defaultSeasonId);
          sessionStorage.setItem('dispatches_season_filter', defaultSeasonId);
          effectiveSeason = defaultSeasonId;
        }
      }

      // Restore saved dealer if valid for the effective season
      const savedDealer = sessionStorage.getItem('dispatches_dealer_filter');
      if (savedDealer && savedDealer !== 'ALL') {
        const isDealerInSeason =
          effectiveSeason === 'ALL' ||
          dispatchData.some(
            (d) => d.season_id === Number(effectiveSeason) && String(d.dealer_id) === savedDealer
          );
        if (isDealerInSeason && dealerData.some((d) => String(d.id) === savedDealer)) {
          setDealerFilter(savedDealer);
        } else {
          setDealerFilter('ALL');
          sessionStorage.setItem('dispatches_dealer_filter', 'ALL');
        }
      } else {
        setDealerFilter('ALL');
      }
    } catch (e) {
      showError('Failed to load dispatches.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!dispatchToDelete) return;
    setDeleteLoading(true);

    try {
      await dispatchService.delete(dispatchToDelete.id);
      showSuccess(`Dispatch deleted successfully.`);
      setDeleteDialogOpen(false);
      setDispatchToDelete(null);
      fetchData();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string } } };
      const msg = errorObj?.response?.data?.detail || 'Failed to delete dispatch.';
      showError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredDispatches = dispatches
    .filter((disp) => {
      if (seasonFilter !== 'ALL' && disp.season_id !== Number(seasonFilter)) return false;
      if (dealerFilter !== 'ALL' && disp.dealer_id !== Number(dealerFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
      const dateB = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return b.id - a.id;
    });

  const columns: Column<DispatchListItem>[] = [
    {
      id: 'dispatch_date',
      label: 'Date',
      minWidth: 120,
      sortValue: (row) => row.dispatch_date || '',
      render: (row) => (
        <Typography
          onClick={() => navigate(`/dispatches/${row.id}`)}
          sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          {formatDate(row.dispatch_date)}
        </Typography>
      ),
    },
    {
      id: 'dealer',
      label: 'Dealer',
      minWidth: 160,
      sortValue: (row) => row.dealer?.name || '',
      render: (row) => row.dealer?.name || 'Unassigned',
    },
    {
      id: 'season',
      label: 'Season',
      minWidth: 160,
      sortValue: (row) => row.season?.name || '',
      render: (row) => row.season?.name || 'Unassigned',
    },
    {
      id: 'total_boxes',
      label: 'Boxes',
      align: 'right',
      minWidth: 100,
      sortValue: (row) => Number(row.total_boxes || 0),
      render: (row) => Number(row.total_boxes || 0).toLocaleString(),
    },
    {
      id: 'transport_charge',
      label: 'Transport (₹)',
      align: 'right',
      minWidth: 120,
      sortValue: (row) => Number(row.transport_charge || 0),
      render: (row) => `₹${Number(row.transport_charge || 0).toLocaleString('en-IN')}`,
    },
    {
      id: 'total_amount',
      label: 'Total Valuation',
      align: 'right',
      minWidth: 140,
      sortValue: (row) => Number(row.total_amount || 0),
      render: (row) => (
        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>
          ₹{Math.round(Number(row.total_amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Typography>
      ),
    },
    ...(canView || canEdit || canDelete
      ? [
          {
            id: 'actions',
            label: 'Actions',
            align: 'right' as const,
            minWidth: 130,
            sortable: false,
            render: (row: DispatchListItem) => (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                {canView && (
                  <Tooltip title="View Details">
                    <IconButton size="small" onClick={() => navigate(`/dispatches/${row.id}`)} sx={{ color: '#0284c7' }}>
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canEdit && (
                  <Tooltip title="Edit Dispatch (New Tab)">
                    <IconButton
                      size="small"
                      component="a"
                      href={`/dispatches/edit/${row.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/dispatches/edit/${row.id}`, '_blank');
                      }}
                      sx={{ color: '#16a34a' }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {canDelete && (
                  <Tooltip title="Delete Dispatch">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDispatchToDelete(row);
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
        title="Dispatches Management"
        subtitle="Track harvest shipments, vehicle transports, and wholesale consignments"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Dispatches' }]}
        actionLabel={canCreate ? 'New Dispatch' : undefined}
        onAction={canCreate ? () => navigate('/dispatches/create') : undefined}
      />

      <DataTable
        columns={columns}
        data={filteredDispatches}
        loading={loading}
        defaultSortBy="dispatch_date"
        defaultSortDirection="desc"
        searchPlaceholder="Search date, dealer, season, or #..."
        searchField={(row) => `${row.dispatch_date || ''} ${row.dealer?.name || ''} ${row.season?.name || ''} ${row.dispatch_no || ''}`}
        filterComponent={
          <>
            <TextField
              select
              size="small"
              label="Season"
              value={seasonFilter}
              onChange={(e) => handleSeasonFilterChange(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="ALL">All Seasons</MenuItem>
              {seasons.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name} {s.status === 'ACTIVE' ? '🟢' : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label={
                seasonFilter !== 'ALL' && seasonFilter !== ''
                  ? `Dealer (${filteredDealers.length})`
                  : 'Dealer'
              }
              value={dealerFilter}
              onChange={(e) => handleDealerFilterChange(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="ALL">All Dealers</MenuItem>
              {filteredDealers.map((d) => (
                <MenuItem key={d.id} value={String(d.id)}>
                  {d.name} {d.city ? `(${d.city})` : ''}
                </MenuItem>
              ))}
            </TextField>
          </>
        }
        emptyMessage="No dispatches recorded yet."
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Dispatch"
        message="Are you sure you want to delete this dispatch? All nested items and settlements will be removed."
        itemName={dispatchToDelete?.dispatch_no}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDispatchToDelete(null);
        }}
      />
    </Box>
  );
};

export default DispatchesPage;
