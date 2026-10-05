import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Card,
  CardContent,
  CardActionArea,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PrintIcon from '@mui/icons-material/Print';
import { useNavigate } from 'react-router-dom';

import { useToast } from '../../context/ToastContext';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';
import seasonPartnerService from '../../services/seasonPartnerService';
import dealerCalculationService from '../../services/dealerCalculationService';

import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import { SeasonPartner } from '../../types/seasonPartner';
import {
  DealerSummary,
  DispatchCalculation,
  FarmBreakdown,
} from '../../types/dealerCalculation';
import { formatDate } from '../../utils/dateUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtN = (n: number) =>
  Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const statusColor = (pending: number): 'success' | 'warning' | 'error' => {
  if (pending <= 0) return 'success';
  if (pending > 0) return 'error';
  return 'warning';
};

const formatBoxSummary = (d: {
  box_summary?: string;
  boxes_20kg?: number;
  boxes_10kg?: number;
  boxes_5kg?: number;
  boxes_dozen?: number;
  total_boxes?: number;
}) => {
  if (d.box_summary) return d.box_summary;
  const parts: string[] = [];
  const b20 = Number(d.boxes_20kg || 0);
  const b10 = Number(d.boxes_10kg || 0);
  const b5 = Number(d.boxes_5kg || 0);
  const bDozen = Number(d.boxes_dozen || 0);

  if (b20 > 0) parts.push(`20kg: ${fmtN(b20)}`);
  if (b10 > 0) parts.push(`10kg: ${fmtN(b10)}`);
  if (b5 > 0) parts.push(`5kg: ${fmtN(b5)}`);
  if (bDozen > 0) parts.push(`Dozen: ${fmtN(bDozen)}`);

  if (parts.length === 0) {
    if (d.total_boxes) return `${fmtN(d.total_boxes)} boxes`;
    return `20kg: 0 | 10kg: 0 | 5kg: 0 | Dozen: 0`;
  }
  return parts.join(' | ');
};

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

            {/* ── Item Table (with Repeating Header across pages) ── */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                className="print-heading"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  letterSpacing: 1,
                  breakAfter: 'avoid',
                  pageBreakAfter: 'avoid',
                }}
              >
                Dispatch Items
              </Typography>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f8fafc', display: 'table-header-group' }}>
                  <TableRow sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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
                    <TableRow key={it.id} sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
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

            {/* ── Settlements / Damage (Atomic section with break-inside avoid) ── */}
            {calc.settlements.length > 0 && (
              <Box
                className="print-section-avoid-break settlements-container"
                sx={{
                  mt: 2,
                  mb: 2.5,
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <Typography
                  variant="caption"
                  className="print-heading"
                  sx={{ color: '#dc2626', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5, breakAfter: 'avoid' }}
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

            {/* ── Free / Relative Distribution (Atomic section with break-inside avoid) ── */}
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
                  Free / Relative Distribution
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

            {/* ── Farm Breakdowns (Card grid with break-inside avoid per card) ── */}
            <Box className="print-section-avoid-break source-wise-container" sx={{ mb: 3, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <Typography
                variant="subtitle2"
                className="print-heading"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.72rem',
                  letterSpacing: 1,
                  breakAfter: 'avoid',
                  pageBreakAfter: 'avoid',
                }}
              >
                Source-wise Calculation
              </Typography>
              <Box
                className="print-grid"
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
                    className="print-card"
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
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
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

            {/* ── Dispatch Total Summary (Atomic section with break-inside avoid) ── */}
            <Box
              className="print-section-avoid-break print-summary-box"
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 2,
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 1,
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                '@media print': {
                  border: '1px solid #334155',
                },
              }}
            >
              <Typography
                variant="caption"
                className="print-heading"
                sx={{ gridColumn: '1/-1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', mb: 0.5, breakAfter: 'avoid' }}
              >
                Dispatch Total Calculation
              </Typography>
              {[
                ['Gross Amount', fmt(s!.gross_amount), false],
                ['Free/Relative', `- ${fmt(s!.free_deduction)}`, true],
                ['Commission', `- ${fmt(s!.commission)}`, true],
                ['Transport', `- ${fmt(s!.transport)}`, true],
                ['Damage / Settlement', `- ${fmt(s!.damage)}`, true],
              ].map(([label, val, red]) => (
                <React.Fragment key={label as string}>
                  <Typography variant="body2" sx={{ color: red ? '#fca5a5' : '#e2e8f0', fontSize: '0.8rem' }}>{label}</Typography>
                  <Typography variant="body2" sx={{ textAlign: 'right', color: red ? '#fca5a5' : '#f1f5f9', fontWeight: 600, fontSize: '0.8rem' }}>{val}</Typography>
                </React.Fragment>
              ))}
              <Divider sx={{ gridColumn: '1/-1', borderColor: 'rgba(255,255,255,0.15)', my: 0.5 }} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Calculated Net Amount</Typography>
              <Typography sx={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#4ade80' }}>{fmt(s!.net_amount)}</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Sub-Component: Dealer Detail Panel ────────────────────────────────────

interface DealerDetailPanelProps {
  dealer: DealerSummary;
  selectedFarm?: number;
  seasonId?: number | null;
}

const DealerDetailPanel: React.FC<DealerDetailPanelProps> = ({
  dealer,
  selectedFarm,
  seasonId,
}) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const rowsPerPage = 25;
  const [selectedDispatchId, setSelectedDispatchId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const t = dealer.totals;
  const sortedDispatches = [...dealer.dispatches].sort((a, b) => {
    const dateA = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
    const dateB = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;
    return a.dispatch_id - b.dispatch_id;
  });
  const pagedDispatches = sortedDispatches.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const freeItems = [...(dealer.free_items || [])].sort((a, b) => {
    const dateA = a.distribution_date ? new Date(a.distribution_date).getTime() : 0;
    const dateB = b.distribution_date ? new Date(b.distribution_date).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;
    return a.id - b.id;
  });

  return (
    <Box sx={{ p: 2, backgroundColor: '#fafafa', borderTop: '1px solid #e2e8f0' }}>
      {/* Deductions breakdown & Statement Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
          {!selectedFarm && seasonId !== 0 && t.previous_balance !== 0 && (
            <Box sx={{ px: 1.5, py: 0.75, borderRadius: 2, backgroundColor: t.previous_balance > 0 ? '#fff1f2' : '#f0fdf4', border: `1px solid ${t.previous_balance > 0 ? '#fecdd3' : '#bbf7d0'}`, minWidth: 125 }}>
              <Typography variant="caption" sx={{ color: t.previous_balance > 0 ? '#b91c1c' : '#15803d', display: 'block', fontWeight: 700 }}>
                {t.previous_balance > 0 ? 'Past Season Dues' : 'Past Season Advance'}
              </Typography>
              <Typography variant="subtitle2" sx={{ color: t.previous_balance > 0 ? '#b91c1c' : '#15803d', fontWeight: 800 }}>
                {t.previous_balance > 0 ? `+ ${fmt(t.previous_balance)}` : `- ${fmt(Math.abs(t.previous_balance))}`}
              </Typography>
            </Box>
          )}
          {[
            { label: 'Free/Relative', value: t.free_deduction, color: '#dc2626' },
            { label: 'Commission', value: t.commission, color: '#dc2626' },
            { label: 'Transport', value: t.transport, color: '#dc2626' },
            { label: 'Damage', value: t.damage, color: '#dc2626' },
          ].map((item) => (
            <Box key={item.label} sx={{ px: 1.5, py: 0.75, borderRadius: 2, backgroundColor: '#fff', border: '1px solid #e2e8f0', minWidth: 110 }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>{item.label}</Typography>
              <Typography variant="subtitle2" sx={{ color: item.color, fontWeight: 600 }}>
                - {fmt(item.value)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Action Button: Print Invoice */}
        <Button
          size="small"
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => {
            const sId = seasonId !== undefined && seasonId !== null ? seasonId : 0;
            navigate(
              `/calculations/dealer/${dealer.dealer_id}/invoice?seasonId=${sId}${selectedFarm ? `&farmId=${selectedFarm}` : ''
              }`
            );
          }}
          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
        >
          Print Invoice
        </Button>
      </Box>

      {/* Dispatches Table */}
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Dispatches ({dealer.dispatches.length})
      </Typography>
      <Table size="small" sx={{ mt: 0.5, mb: 1 }}>
        <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Farms</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Boxes</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Gross</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Deductions</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Net Amount</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Detail</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pagedDispatches.map((d) => {
            const totalDeductions = d.free_deduction + d.commission + d.transport + d.damage;
            return (
              <TableRow key={d.dispatch_id} hover>
                <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(d.dispatch_date)}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                  {d.farms || (d.farm_names && d.farm_names.length > 0 ? d.farm_names.join(', ') : '-')}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.primary' }}>{formatBoxSummary(d)}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(d.gross_amount)}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#dc2626' }}>- {fmt(totalDeductions)}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d' }}>{fmt(d.net_amount)}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View Full Calculation">
                    <IconButton
                      size="small"
                      sx={{ color: '#0284c7' }}
                      onClick={() => { setSelectedDispatchId(d.dispatch_id); setDetailOpen(true); }}
                    >
                      <CalculateOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {dealer.dispatches.length > rowsPerPage && (
        <TablePagination
          component="div"
          count={dealer.dispatches.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25]}
          onPageChange={(_, p) => setPage(p)}
        />
      )}

      {/* Free Dispatch Items */}
      <Divider sx={{ my: 1.5 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}>
        Free Dispatch Items {freeItems.length > 0 ? `(${freeItems.length})` : ''}
      </Typography>
      {freeItems.length > 0 ? (
        <Table size="small" sx={{ mt: 0.5, mb: 1 }}>
          <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Free Dispatch Date</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Remarks</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Box/Vakal</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Quantity</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Price</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Total Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {freeItems.map((fi) => (
              <TableRow key={fi.id} hover>
                <TableCell sx={{ fontSize: '0.8rem' }}>{fi.distribution_date || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{fi.remarks || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>
                  {fi.box_size_kg ? (fi.box_size_kg === 'DOZEN' ? 'DOZEN' : `${fi.box_size_kg} KG`) : '-'}
                  {(fi.variety || fi.grade) && (
                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.75 }}>
                      ({[fi.variety, fi.grade].filter(Boolean).join(' · ')})
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmtN(fi.box_quantity)}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(fi.price_per_box)}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>{fmt(fi.free_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Box sx={{ py: 1.5, px: 2, backgroundColor: '#fff', borderRadius: 1.5, border: '1px dashed #cbd5e1', my: 1 }}>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
            No Free Dispatch Items
          </Typography>
        </Box>
      )}

      {/* Payments (Only shown when not filtered by a specific farm) */}
      {!selectedFarm && dealer.payments.length > 0 && (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Payments Received
          </Typography>
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Mode</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Reference</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dealer.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{p.payment_date}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{p.payment_mode}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{p.reference_no || p.remarks || '-'}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>{fmt(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* Dispatch Detail Modal */}
      <DispatchDetailModal
        dispatchId={selectedDispatchId}
        selectedFarm={selectedFarm}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </Box>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

export const DealerCalculationPage: React.FC = () => {
  const { showError } = useToast();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allFarms, setAllFarms] = useState<Farm[]>([]);
  const [seasonPartners, setSeasonPartners] = useState<SeasonPartner[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<number>(0);

  const [dealerSummaries, setDealerSummaries] = useState<DealerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedDealerId, setExpandedDealerId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([seasonService.getAll(), farmService.getAll(), seasonPartnerService.getAll()])
      .then(([s, f, sp]) => {
        setSeasons(s);
        setAllFarms(f);
        setSeasonPartners(sp);
        // Auto-select latest season (first in the list since ordered by id desc)
        const defaultSeason = s.find((x: Season) => x.status === 'ACTIVE') || s[0];
        if (defaultSeason) {
          setSelectedSeason(defaultSeason.id);
        } else {
          setSelectedSeason(0);
        }
      })
      .catch(() => showError('Failed to load reference data.'));
  }, []);

  // Farms associated with the selected season (combining SeasonPartners and dispatches)
  const seasonFarms = React.useMemo(() => {
    if (selectedSeason === null || selectedSeason === 0) return allFarms;

    const partnerFarmIds = new Set(
      seasonPartners
        .filter((sp) => sp.season_id === selectedSeason)
        .map((sp) => sp.farm_id)
    );

    const dispatchFarmNames = new Set<string>();
    dealerSummaries.forEach((d) => {
      d.dispatches?.forEach((disp) => {
        disp.farm_names?.forEach((fn) => dispatchFarmNames.add(fn));
      });
    });

    const matched = allFarms.filter(
      (f) => partnerFarmIds.has(f.id) || dispatchFarmNames.has(f.name)
    );

    return matched.length > 0 ? matched : allFarms;
  }, [selectedSeason, allFarms, seasonPartners, dealerSummaries]);

  // Load dealer calculations with stale request prevention
  useEffect(() => {
    if (selectedSeason === null) return;
    let isCurrent = true;

    setLoading(true);
    setExpandedDealerId(null);

    dealerCalculationService
      .getSeasonSummary(selectedSeason, selectedFarm || undefined)
      .then((data) => {
        if (isCurrent) {
          setDealerSummaries(data);
        }
      })
      .catch(() => {
        if (isCurrent) {
          showError('Failed to calculate dealer data. Please try again.');
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

  const isFarmSelected = Boolean(selectedFarm && selectedFarm !== 0);
  const totalGross = dealerSummaries.reduce((s, d) => s + d.totals.gross_amount, 0);
  const totalNet = dealerSummaries.reduce((s, d) => s + d.totals.net_amount, 0);
  const totalDispatches = dealerSummaries.reduce((s, d) => s + d.dispatch_count, 0);
  const totalPaid = dealerSummaries.reduce((s, d) => s + d.totals.total_paid, 0);
  const totalPending = dealerSummaries.reduce((s, d) => s + d.totals.pending_amount, 0);
  const totalPrevBal = dealerSummaries.reduce((s, d) => s + (d.totals.previous_balance || 0), 0);
  const totalGrandPending = dealerSummaries.reduce(
    (s, d) => s + (d.totals.grand_pending_amount !== undefined ? d.totals.grand_pending_amount : d.totals.pending_amount),
    0
  );

  return (
    <Box className="no-print">
      {/* ── Page Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Season Dealer Calculation
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
          Read-only report — all values auto-calculated from existing dispatch, payment and settlement records.
        </Typography>
      </Box>

      {/* ── Filters ── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Season"
          value={selectedSeason ?? ''}
          onChange={(e) => {
            const val = Number(e.target.value);
            setSelectedSeason(val);
            setSelectedFarm(0);
          }}
          sx={{ minWidth: 220 }}
          size="small"
        >
          <MenuItem value={0}>All Seasons</MenuItem>
          {seasons.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name} {s.status === 'ACTIVE' ? '🟢' : ''}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label={
            selectedSeason && selectedSeason !== 0
              ? `Farm (${seasonFarms.length})`
              : 'Farm (Optional)'
          }
          value={selectedFarm || ''}
          onChange={(e) => setSelectedFarm(Number(e.target.value))}
          sx={{ minWidth: 200 }}
          size="small"
        >
          <MenuItem value={0}>All Farms</MenuItem>
          {seasonFarms.map((f) => (
            <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
          ))}
        </TextField>
      </Box>

      {/* ── Season / Farm Totals ── */}
      {dealerSummaries.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {isFarmSelected ? (
            [
              { label: 'Total Dealers', value: `${dealerSummaries.length} dealers`, color: '#1e40af', bg: '#eff6ff' },
              { label: 'Farm Gross Amount', value: fmt(totalGross), color: '#0369a1', bg: '#f0f9ff' },
              { label: 'Farm Net Amount', value: fmt(totalNet), color: '#15803d', bg: '#f0fdf4' },
              { label: 'Total Dispatches', value: `${totalDispatches} dispatches`, color: '#6366f1', bg: '#eef2ff' },
            ].map((item) => (
              <Box key={item.label} sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: item.bg, border: `1px solid ${item.color}22`, minWidth: 160 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>{item.label}</Typography>
                <Typography variant="subtitle1" sx={{ color: item.color, fontWeight: 800 }}>{item.value}</Typography>
              </Box>
            ))
          ) : (
            [
              { label: 'Total Dealers', value: `${dealerSummaries.length} dealers`, color: '#1e40af', bg: '#eff6ff' },
              { label: selectedSeason === 0 ? 'All Seasons Net' : 'Season Net Amount', value: fmt(totalNet), color: '#15803d', bg: '#f0fdf4' },
              ...(selectedSeason !== 0 && totalPrevBal !== 0
                ? [
                  {
                    label: 'Previous Dues (Opening)',
                    value: fmt(totalPrevBal),
                    color: totalPrevBal > 0 ? '#b91c1c' : '#15803d',
                    bg: totalPrevBal > 0 ? '#fff1f2' : '#f0fdf4',
                  },
                ]
                : []),
              { label: selectedSeason === 0 ? 'Total Received' : 'Season Received', value: fmt(totalPaid), color: '#0284c7', bg: '#f0f9ff' },
              {
                label: selectedSeason === 0 ? 'Total Pending' : 'Total Outstanding',
                value: fmt(selectedSeason === 0 ? totalPending : totalGrandPending),
                color: (selectedSeason === 0 ? totalPending : totalGrandPending) > 0 ? '#dc2626' : '#15803d',
                bg: (selectedSeason === 0 ? totalPending : totalGrandPending) > 0 ? '#fef2f2' : '#f0fdf4',
              },
            ].map((item) => (
              <Box key={item.label} sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: item.bg, border: `1px solid ${item.color}22`, minWidth: 160 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>{item.label}</Typography>
                <Typography variant="subtitle1" sx={{ color: item.color, fontWeight: 800 }}>{item.value}</Typography>
              </Box>
            ))
          )}
        </Box>
      )}

      {/* ── Loading ── */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
          <Typography sx={{ ml: 2, color: '#64748b', alignSelf: 'center' }}>Calculating all dispatches...</Typography>
        </Box>
      )}

      {/* ── No Data ── */}
      {!loading && dealerSummaries.length === 0 && (
        <Alert severity="warning">No dispatches found for the selected {selectedSeason === 0 ? 'criteria' : 'Season'}{selectedFarm ? ' / Farm' : ''}.</Alert>
      )}

      {/* ── Level 1: Dealer Summary Cards ── */}
      {!loading && dealerSummaries.map((dealer) => {
        const isExpanded = expandedDealerId === dealer.dealer_id;
        const pending = dealer.totals.pending_amount;
        const prevBal = dealer.totals.previous_balance || 0;
        const grandPending = dealer.totals.grand_pending_amount !== undefined ? dealer.totals.grand_pending_amount : pending;

        return (
          <Card
            key={dealer.dealer_id}
            elevation={0}
            sx={{
              mb: 1.5,
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}
          >
            {/* ── Dealer Header Row (Level 1) ── */}
            <CardActionArea onClick={() => setExpandedDealerId(isExpanded ? null : dealer.dealer_id)}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  {/* Expand Icon */}
                  <Box sx={{ color: '#94a3b8' }}>
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </Box>

                  {/* Dealer Info */}
                  <Box sx={{ flex: 1, minWidth: 180 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      {dealer.dealer_name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                      {dealer.dealer_city && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <LocationOnOutlinedIcon sx={{ fontSize: 12 }} /> {dealer.dealer_city}
                        </Typography>
                      )}
                      {dealer.dealer_mobile && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                          <PhoneOutlinedIcon sx={{ fontSize: 12 }} /> {dealer.dealer_mobile}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <LocalShippingOutlinedIcon sx={{ fontSize: 12 }} /> {dealer.dispatch_count} dispatches
                      </Typography>
                    </Box>
                  </Box>

                  {/* Summary Figures */}
                  <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                        {isFarmSelected ? 'Farm Gross' : 'Gross Amount'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmt(dealer.totals.gross_amount)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                        {isFarmSelected ? 'Farm Net' : 'Net Calculated'}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803d' }}>{fmt(dealer.totals.net_amount)}</Typography>
                    </Box>
                    {!isFarmSelected && (
                      <>
                        {selectedSeason !== 0 && prevBal !== 0 && (
                          <Box sx={{ textAlign: 'right', px: 1, py: 0.25, borderRadius: 1.5, backgroundColor: prevBal > 0 ? '#fff1f2' : '#f0fdf4', border: `1px solid ${prevBal > 0 ? '#fecdd3' : '#bbf7d0'}` }}>
                            <Typography variant="caption" sx={{ color: prevBal > 0 ? '#b91c1c' : '#15803d', display: 'block', fontWeight: 700 }}>Prev Dues</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: prevBal > 0 ? '#b91c1c' : '#15803d' }}>
                              {prevBal > 0 ? `+${fmt(prevBal)}` : fmt(prevBal)}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                            {selectedSeason !== 0 ? 'Season Paid' : 'Paid'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>{fmt(dealer.totals.total_paid)}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right', minWidth: 95 }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                            {selectedSeason !== 0 && prevBal !== 0 ? 'Total Due' : 'Pending'}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: grandPending > 0 ? '#dc2626' : '#15803d' }}>
                            {fmt(Math.abs(grandPending))}
                          </Typography>
                        </Box>
                        <Chip
                          label={grandPending > 0 ? 'Outstanding' : grandPending < 0 ? 'Overpaid' : 'Settled'}
                          size="small"
                          color={statusColor(grandPending)}
                          sx={{ fontWeight: 700, fontSize: '0.7rem', alignSelf: 'center' }}
                        />
                      </>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>

            {/* ── Level 2+3: Expanded Dealer Detail ── */}
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <DealerDetailPanel
                dealer={dealer}
                selectedFarm={selectedFarm}
                seasonId={selectedSeason}
              />
            </Collapse>
          </Card>
        );
      })}
    </Box>
  );
};

export default DealerCalculationPage;
