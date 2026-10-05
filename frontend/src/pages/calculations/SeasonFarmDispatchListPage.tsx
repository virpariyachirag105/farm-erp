import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ScaleOutlinedIcon from '@mui/icons-material/ScaleOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';
import seasonPartnerService from '../../services/seasonPartnerService';
import dealerCalculationService from '../../services/dealerCalculationService';

import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import { SeasonPartner } from '../../types/seasonPartner';
import {
  DispatchListCalcRow,
  DispatchCalculation,
  FarmBreakdown,
} from '../../types/dealerCalculation';
import { formatDate } from '../../utils/dateUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtN = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// ─── Sub-Component: Dispatch Detail Modal (with Smart Print Layout) ─────────

interface DispatchDetailModalProps {
  dispatchId: number | null;
  selectedFarm?: number;
  open: boolean;
  onClose: () => void;
}

const DispatchDetailModal: React.FC<DispatchDetailModalProps> = ({ dispatchId, selectedFarm, open, onClose }) => {
  const [calc, setCalc] = useState<DispatchCalculation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !dispatchId) return;
    setLoading(true);
    dealerCalculationService.getDispatchCalculation(dispatchId, selectedFarm || undefined)
      .then(setCalc)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, dispatchId, selectedFarm]);

  const handlePrint = () => window.print();
  const s = calc?.summary;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {calc?.dispatch_no || 'Dispatch Detail'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {calc?.dispatch_date} · {calc?.dealer_name} · {calc?.transport_name || ''} · {calc?.vehicle_no || ''}
            </Typography>
          </Box>
          <Tooltip title="Print / Save PDF">
            <IconButton onClick={handlePrint} sx={{ color: 'primary.main' }}>
              <PrintOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && calc && (
          <Box id="printable-dispatch" sx={{ fontFamily: 'inherit' }}>
            {/* ── Print-only Statement Header ── */}
            <Box
              sx={{
                display: 'none',
                '@media print': { display: 'block', mb: 2, pb: 1.5, borderBottom: '2px solid #0f172a' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>
                    Bhagavati Farm
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1' }}>
                    Dispatch Calculation Statement / Invoice
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    Dispatch #{calc.dispatch_no}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                    Date: {formatDate(calc.dispatch_date)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontSize: '0.82rem' }}>
                <Box>
                  <strong>Dealer:</strong> {calc.dealer_name} {calc.dealer_city ? `(${calc.dealer_city})` : ''}
                </Box>
                <Box>
                  <strong>Vehicle:</strong> {calc.vehicle_no || '-'} &nbsp;|&nbsp; <strong>Transport:</strong> {calc.transport_name || '-'}
                </Box>
              </Box>
            </Box>

            {/* ── Item Table ── */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  letterSpacing: 1,
                }}
              >
                Dispatch Items
              </Typography>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Farm / Source</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Variety · Grade</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Box Size</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Qty</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Price/Box</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Gross</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Free Boxes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Free Amt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calc.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {it.farm_name}
                        {it.farm_type === 'MARKET' && (
                          <Chip label="Market" size="small" sx={{ ml: 0.5, fontSize: '0.65rem', height: 16, backgroundColor: '#fef9c3', color: '#854d0e' }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{it.variety} {it.grade ? `· ${it.grade}` : ''}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{it.box_size_kg === 'DOZEN' ? 'DOZEN' : `${it.box_size_kg} KG`}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmtN(it.box_quantity)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(it.price_per_box)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmt(it.gross_amount)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#dc2626' }}>{it.free_boxes > 0 ? fmtN(it.free_boxes) : '-'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#dc2626' }}>{it.free_amount > 0 ? fmt(it.free_amount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {/* ── Settlements / Damage ── */}
            {calc.settlements.length > 0 && (
              <Box
                sx={{
                  mt: 2,
                  mb: 2.5,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ color: '#dc2626', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
                >
                  Damage / Settlements Recorded
                </Typography>
                {calc.settlements.map((st) => (
                  <Box key={st.id} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', mt: 0.5, color: '#dc2626' }}>
                    <span>{formatDate(st.settlement_date)} — {st.loss_remarks || 'Damage'}</span>
                    <strong>{fmt(st.loss_amount)}</strong>
                  </Box>
                ))}
              </Box>
            )}

            {/* ── Free / Relative Distribution (Free Items) ── */}
            {calc.free_items && calc.free_items.length > 0 && (
              <Box
                className="print-section-avoid-break free-items-container"
                sx={{
                  mb: 3,
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <Typography
                  variant="subtitle2"
                  className="print-heading"
                  sx={{
                    fontWeight: 700,
                    mb: 1,
                    color: '#dc2626',
                    textTransform: 'uppercase',
                    fontSize: '0.72rem',
                    letterSpacing: 1,
                    breakAfter: 'avoid',
                    pageBreakAfter: 'avoid',
                  }}
                >
                  Free / Complimentary Distribution Items ({calc.free_items.length})
                </Typography>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#fef2f2', display: 'table-header-group' }}>
                    <TableRow sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Farm</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Variety · Grade</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Box Size</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Free Boxes</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Price/Box</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Free Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {calc.free_items.map((fi) => (
                      <TableRow key={fi.id} sx={{ backgroundColor: '#fff5f5', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(fi.distribution_date)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{fi.farm_name || '-'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{fi.variety} {fi.grade ? `· ${fi.grade}` : ''}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fi.box_size_kg ? (fi.box_size_kg === 'DOZEN' ? 'DOZEN' : `${fi.box_size_kg} KG`) : '-'}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#dc2626' }}>{fmtN(fi.box_quantity)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(fi.price_per_box)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>{fmt(fi.free_amount)}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{fi.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {/* ── Source-wise Breakdowns ── */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  letterSpacing: 1,
                }}
              >
                Source-wise Calculation
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: calc.farm_breakdowns.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                  },
                  gap: 2,
                }}
              >
                {calc.farm_breakdowns.map((fb: FarmBreakdown, idx: number) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid',
                      borderColor: fb.farm_type === 'MARKET' ? '#fde047' : '#e2e8f0',
                      backgroundColor: fb.farm_type === 'MARKET' ? '#fefce8' : '#ffffff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, pb: 1, borderBottom: '1px solid', borderColor: fb.farm_type === 'MARKET' ? '#fef08a' : '#f1f5f9' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {fb.farm_name}
                        </Typography>
                        {fb.farm_type === 'MARKET' ? (
                          <Chip label="Market" size="small" sx={{ fontSize: '0.65rem', height: 18, backgroundColor: '#fef9c3', color: '#854d0e', fontWeight: 700 }} />
                        ) : (
                          <Chip label="Farm" size="small" sx={{ fontSize: '0.65rem', height: 18, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 600 }} />
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.8rem' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#64748b' }}>Gross Amount</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 700 }}>{fmt(fb.gross_amount)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#dc2626' }}>Less: Free/Relative</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>- {fmt(fb.free_deduction)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#dc2626' }}>Less: Commission</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>- {fmt(fb.commission)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#dc2626' }}>Less: Transport</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>- {fmt(fb.transport)}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', color: '#dc2626' }}>Less: Damage Share</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>- {fmt(fb.damage)}</Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1.25,
                        borderTop: '1.5px dashed',
                        borderColor: fb.farm_type === 'MARKET' ? '#fde047' : '#cbd5e1',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Net Amount
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#15803d' }}>
                        {fmt(fb.net_amount)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* ── Summary Box ── */}
            {s && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ gridColumn: '1/-1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', mb: 0.5 }}
                >
                  Dispatch Total Calculation
                </Typography>
                {[
                  ['Gross Amount', fmt(s.gross_amount), false],
                  ['Free/Relative', `- ${fmt(s.free_deduction)}`, true],
                  ['Commission', `- ${fmt(s.commission)}`, true],
                  ['Transport', `- ${fmt(s.transport)}`, true],
                  ['Damage / Settlement', `- ${fmt(s.damage)}`, true],
                ].map(([label, val, red]) => (
                  <React.Fragment key={label as string}>
                    <Typography variant="body2" sx={{ color: red ? '#fca5a5' : '#e2e8f0', fontSize: '0.8rem' }}>{label}</Typography>
                    <Typography variant="body2" sx={{ textAlign: 'right', color: red ? '#fca5a5' : '#f1f5f9', fontWeight: 600, fontSize: '0.8rem' }}>{val}</Typography>
                  </React.Fragment>
                ))}
                <Divider sx={{ gridColumn: '1/-1', borderColor: 'rgba(255,255,255,0.15)', my: 0.5 }} />
                <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Calculated Net Amount</Typography>
                <Typography sx={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#4ade80' }}>{fmt(s.net_amount)}</Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button onClick={handlePrint} variant="contained" startIcon={<PrintOutlinedIcon />}>
          Print / PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export const SeasonFarmDispatchListPage: React.FC = () => {
  const { showError } = useToast();
  const navigate = useNavigate();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allFarms, setAllFarms] = useState<Farm[]>([]);
  const [seasonPartners, setSeasonPartners] = useState<SeasonPartner[]>([]);

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<number>(0);

  const [dispatches, setDispatches] = useState<DispatchListCalcRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // View modal
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState<boolean>(false);

  // 1. Initial Reference Data Loading
  useEffect(() => {
    Promise.all([seasonService.getAll(), farmService.getAll(), seasonPartnerService.getAll()])
      .then(([sList, fList, spList]) => {
        setSeasons(sList);
        setAllFarms(fList);
        setSeasonPartners(spList);

        // Auto-select latest active season or first season in list
        const active = sList.find((x: Season) => x.status === 'ACTIVE') || sList[0];
        if (active) {
          setSelectedSeason(active.id);
        } else {
          setSelectedSeason(0);
        }
      })
      .catch(() => showError('Failed to load reference data.'));
  }, []);

  // 2. Compute Farms associated with the Selected Season
  const seasonFarms = React.useMemo(() => {
    if (!selectedSeason || selectedSeason === 0) return [];
    return allFarms.filter((f) =>
      seasonPartners.some((sp) => sp.season_id === selectedSeason && sp.farm_id === f.id)
    );
  }, [selectedSeason, allFarms, seasonPartners]);

  // When season changes, reset or pick the first farm of the season
  useEffect(() => {
    if (selectedSeason && seasonFarms.length > 0) {
      if (!seasonFarms.some((f) => f.id === selectedFarm)) {
        setSelectedFarm(seasonFarms[0].id);
      }
    } else {
      setSelectedFarm(0);
      setDispatches([]);
    }
  }, [selectedSeason, seasonFarms, selectedFarm]);

  // 3. Fetch Dispatches for Selected Season + Farm with stale-request guard
  useEffect(() => {
    if (!selectedSeason || !selectedFarm) {
      setDispatches([]);
      return;
    }

    let isCurrent = true;
    setLoading(true);

    dealerCalculationService
      .getSeasonFarmDispatches(selectedSeason, selectedFarm)
      .then((data) => {
        if (isCurrent) {
          const sorted = [...data].sort((a, b) => {
            const dateA = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
            const dateB = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
            if (dateA !== dateB) return dateA - dateB;
            return a.dispatch_id - b.dispatch_id;
          });
          setDispatches(sorted);
          setPage(0);
        }
      })
      .catch(() => {
        if (isCurrent) {
          showError('Failed to fetch farm dispatch calculations.');
        }
      })
      .finally(() => {
        if (isCurrent) {
          setLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedSeason, selectedFarm]);

  // Drag and Drop row reordering handlers
  const handleResetSequence = () => {
    const sorted = [...dispatches].sort((a, b) => {
      const dateA = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
      const dateB = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return a.dispatch_id - b.dispatch_id;
    });
    setDispatches(sorted);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const globalSourceIdx = page * rowsPerPage + draggedIndex;
    const globalTargetIdx = page * rowsPerPage + targetIndex;

    const updated = [...dispatches];
    const [moved] = updated.splice(globalSourceIdx, 1);
    updated.splice(globalTargetIdx, 0, moved);

    setDispatches(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Selected farm details
  const currentFarm = allFarms.find((f) => f.id === selectedFarm);
  const currentFarmName = currentFarm ? currentFarm.name : '';

  // Aggregated totals for the selected farm dispatches
  const total20kg = dispatches.reduce((acc, d) => acc + Number(d.boxes_20kg || 0), 0);
  const total10kg = dispatches.reduce((acc, d) => acc + Number(d.boxes_10kg || 0), 0);
  const total5kg = dispatches.reduce((acc, d) => acc + Number(d.boxes_5kg || 0), 0);
  const totalDozen = dispatches.reduce((acc, d) => acc + Number(d.boxes_dozen || 0), 0);
  const totalGross = dispatches.reduce((acc, d) => acc + Number(d.gross_amount || 0), 0);
  const totalNet = dispatches.reduce((acc, d) => acc + Number(d.net_amount || 0), 0);

  const totalWeightKg = total20kg * 20 + total10kg * 10 + total5kg * 5;
  const totalMaunds = totalWeightKg / 20;

  const paginatedDispatches = dispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <PageHeader
        title="Season Farm Dispatch List"
        subtitle="View farm-specific dispatches with accurate item-level produce valuations, box breakdowns, and net calculation summaries."
        breadcrumbs={[
          { label: 'Dashboard', path: '/' },
          { label: 'Dispatches', path: '/dispatches' },
          { label: 'Farm Dispatches' },
        ]}
      />

      {/* ── Filter Controls ── */}
      <Card elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid #e2e8f0', borderRadius: 3, backgroundColor: '#ffffff' }}>
        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            select
            label="Season *"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            sx={{ minWidth: 240 }}
            size="small"
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name} {s.status === 'ACTIVE' ? ' (Active)' : ''}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label={
              selectedSeason && seasonFarms.length !== 0
                ? `Farm (${seasonFarms.length})`
                : 'Farm'
            }
            value={selectedFarm || ''}
            onChange={(e) => setSelectedFarm(Number(e.target.value))}
            sx={{ minWidth: 260 }}
            size="small"
            disabled={!selectedSeason || seasonFarms.length === 0}
          >
            {seasonFarms.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name} {f.location ? `(${f.location})` : ''}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Card>

      {/* ── Summary Stats Cards ── */}
      {Boolean(selectedSeason && selectedSeason > 0) && selectedFarm > 0 && dispatches.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' }, gap: 2, mb: 3 }}>
          <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <ScaleOutlinedIcon sx={{ fontSize: 18, color: '#0284c7' }} />
              <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Weight
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0c4a6e' }}>
              {fmtN(totalMaunds)}{' '}
              <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7' }}>
                Mnd
              </Typography>
            </Typography>
            {/* <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>
              {fmtN(totalWeightKg)} KG ({dispatches.length} Dispatches)
            </Typography> */}
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 18, color: '#64748b' }} />
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                10kg Boxes
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
              {fmtN(total10kg)}
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 18, color: '#64748b' }} />
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                5kg Boxes
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
              {fmtN(total5kg)}
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Inventory2OutlinedIcon sx={{ fontSize: 18, color: '#64748b' }} />
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Dozen Boxes
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b' }}>
              {fmtN(totalDozen)}
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#fefce8', border: '1px solid #fef08a' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <MonetizationOnOutlinedIcon sx={{ fontSize: 18, color: '#ca8a04' }} />
              <Typography variant="caption" sx={{ color: '#854d0e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Gross Amount
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#713f12' }}>
              {fmt(totalGross)}
            </Typography>
          </Box>

          <Box sx={{ p: 2, borderRadius: 2.5, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18, color: '#16a34a' }} />
              <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Net Amount
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#14532d' }}>
              {fmt(totalNet)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Loading Indicator ── */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={36} />
          <Typography sx={{ ml: 2, color: '#64748b', alignSelf: 'center', fontWeight: 500 }}>
            Calculating farm dispatches...
          </Typography>
        </Box>
      )}

      {/* ── Empty & Notice States ── */}
      {!loading && !selectedSeason && (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          Please select a Season to continue.
        </Alert>
      )}

      {!loading && Boolean(selectedSeason && selectedSeason > 0) && seasonFarms.length === 0 && (
        <Alert severity="warning" sx={{ borderRadius: 2.5 }}>
          No farms are associated with the selected Season in Season Partners.
        </Alert>
      )}

      {!loading && Boolean(selectedSeason && selectedSeason > 0) && selectedFarm > 0 && dispatches.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2.5 }}>
          No dispatch records found for <strong>{currentFarmName}</strong> in the selected Season.
        </Alert>
      )}

      {/* ── Main Dispatch Table ── */}
      {!loading && Boolean(selectedSeason && selectedSeason > 0) && selectedFarm > 0 && dispatches.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AgricultureOutlinedIcon sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Dispatches for {currentFarmName} ({dispatches.length})
              </Typography>
              <Chip
                label="Draggable Rows"
                size="small"
                sx={{
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 22,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                Drag rows to temporarily reorder sequence
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={handleResetSequence}
                sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.25, px: 1, borderRadius: 1.5, borderColor: '#cbd5e1', color: '#475569' }}
              >
                Reset Order
              </Button>
            </Box>
          </Box>

          <Table size="medium">
            <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ width: 44, px: 1 }} />
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Dispatch Date</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Farm Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>10kg</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>5kg</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Dozen</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Dealer Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Gross Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Net Calculated Amount</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.78rem', width: 70 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedDispatches.map((row, idx) => {
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx && draggedIndex !== idx;

                return (
                  <TableRow
                    key={row.dispatch_id}
                    hover
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    sx={{
                      cursor: 'grab',
                      '&:active': { cursor: 'grabbing' },
                      opacity: isDragging ? 0.35 : 1,
                      backgroundColor: isDragOver
                        ? '#e0f2fe !important'
                        : isDragging
                          ? '#f1f5f9 !important'
                          : 'inherit',
                      borderTop: isDragOver ? '2.5px solid #0284c7 !important' : undefined,
                      transition: 'background-color 0.15s, opacity 0.15s',
                      '&:last-child td, &:last-child th': { border: 0 },
                    }}
                  >
                    {/* Drag Handle */}
                    <TableCell sx={{ width: 44, px: 1, color: '#94a3b8' }}>
                      <Tooltip title="Drag row up or down to reorder sequence">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <DragIndicatorIcon sx={{ fontSize: 20, color: '#94a3b8', '&:hover': { color: '#0f172a' } }} />
                        </Box>
                      </Tooltip>
                    </TableCell>

                    {/* Dispatch Date */}
                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                      {formatDate(row.dispatch_date)}
                    </TableCell>

                    {/* Farm Name (Unique for this dispatch) */}
                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                      {row.farms || (row.farm_names && row.farm_names.length > 0 ? row.farm_names.join(', ') : currentFarmName || '-')}
                    </TableCell>

                    {/* 10kg Boxes */}
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: row.boxes_10kg && row.boxes_10kg > 0 ? 700 : 400 }}>
                      {row.boxes_10kg && row.boxes_10kg > 0 ? fmtN(row.boxes_10kg) : '-'}
                    </TableCell>

                    {/* 5kg Boxes */}
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: row.boxes_5kg && row.boxes_5kg > 0 ? 700 : 400 }}>
                      {row.boxes_5kg && row.boxes_5kg > 0 ? fmtN(row.boxes_5kg) : '-'}
                    </TableCell>

                    {/* Dozen Boxes */}
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: row.boxes_dozen && row.boxes_dozen > 0 ? 700 : 400 }}>
                      {row.boxes_dozen && row.boxes_dozen > 0 ? fmtN(row.boxes_dozen) : '-'}
                    </TableCell>

                    {/* Dealer Name */}
                    <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e40af' }}>
                      {row.dealer_name || '-'}
                    </TableCell>

                    {/* Gross Amount */}
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {fmt(row.gross_amount)}
                    </TableCell>

                    {/* Net Calculated Amount */}
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#15803d' }}>
                      {fmt(row.net_amount)}
                    </TableCell>

                    {/* View Action */}
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title="View Dispatch Calculation Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => {
                              setSelectedDispatchId(row.dispatch_id);
                              setViewModalOpen(true);
                            }}
                          >
                            <VisibilityOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Dispatch">
                          <IconButton
                            size="small"
                            sx={{ color: '#d97706' }}
                            onClick={() => navigate(`/dispatches/edit/${row.dispatch_id}`)}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {dispatches.length > rowsPerPage && (
            <TablePagination
              component="div"
              count={dispatches.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          )}
        </Paper>
      )}

      {/* ── Dispatch Detail Modal ── */}
      <DispatchDetailModal
        dispatchId={selectedDispatchId}
        selectedFarm={selectedFarm}
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />
    </Box>
  );
};

export default SeasonFarmDispatchListPage;
