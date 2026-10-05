import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import html2pdf from 'html2pdf.js';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import dealerCalculationService from '../../services/dealerCalculationService';
import dealerService from '../../services/dealerService';
import seasonService from '../../services/seasonService';
import farmService from '../../services/farmService';

import { Dealer } from '../../types/dealer';
import { Season } from '../../types/season';
import { Farm } from '../../types/farm';
import {
  DealerSummary,
  DispatchCalculation,
} from '../../types/dealerCalculation';
import { formatDate } from '../../utils/dateUtils';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtN = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const DealerInvoicePage: React.FC = () => {
  const { dealerId } = useParams<{ dealerId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const seasonIdParam = searchParams.get('seasonId');
  const farmIdParam = searchParams.get('farmId');

  const selectedSeasonId = seasonIdParam !== null ? Number(seasonIdParam) : 0;
  const selectedFarmId = farmIdParam ? Number(farmIdParam) : undefined;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [dealerSummary, setDealerSummary] = useState<DealerSummary | null>(null);
  const [detailedDispatches, setDetailedDispatches] = useState<DispatchCalculation[]>([]);
  const [seasonName, setSeasonName] = useState<string>('');
  const [farmName, setFarmName] = useState<string>('');
  const [sharingPdf, setSharingPdf] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!dealerId) return;
    const dId = Number(dealerId);

    setLoading(true);
    setError(null);

    Promise.all([
      dealerService.getById(dId),
      dealerCalculationService.getSeasonSummary(selectedSeasonId, selectedFarmId),
      dealerCalculationService.getDealerDispatches(selectedSeasonId, dId, selectedFarmId),
      seasonService.getAll(),
      farmService.getAll(),
    ])
      .then(([dealerRes, summariesRes, dispatchesRes, seasonsRes, farmsRes]) => {
        setDealer(dealerRes);

        const summary = summariesRes.find((s) => s.dealer_id === dId) || null;
        setDealerSummary(summary);

        const sortedDispatches = [...dispatchesRes].sort((a, b) => {
          const dateA = a.dispatch_date ? new Date(a.dispatch_date).getTime() : 0;
          const dateB = b.dispatch_date ? new Date(b.dispatch_date).getTime() : 0;
          if (dateA !== dateB) return dateA - dateB;
          return a.dispatch_id - b.dispatch_id;
        });
        setDetailedDispatches(sortedDispatches);

        if (selectedSeasonId === 0) {
          setSeasonName('All Seasons');
        } else {
          const matchSeason = seasonsRes.find((s: Season) => s.id === selectedSeasonId);
          setSeasonName(matchSeason ? matchSeason.name : `Season #${selectedSeasonId}`);
        }

        if (selectedFarmId) {
          const matchFarm = farmsRes.find((f: Farm) => f.id === selectedFarmId);
          setFarmName(matchFarm ? matchFarm.name : `Farm #${selectedFarmId}`);
        } else {
          setFarmName('');
        }
      })
      .catch((err) => {
        console.error('Failed to load dealer invoice data:', err);
        setError('Failed to load dealer calculation invoice. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [dealerId, selectedSeasonId, selectedFarmId]);

  // Set dynamic document title for browser print / save-as-pdf default filename
  useEffect(() => {
    const originalTitle = document.title;
    if (dealer?.name) {
      document.title = `${dealer.name.trim()} - Bhagavati Farm`;
    }
    return () => {
      document.title = originalTitle || 'Bhagavati Farm ERP';
    };
  }, [dealer?.name]);

  const handlePrint = () => {
    const originalTitle = document.title;
    if (dealer?.name) {
      document.title = `${dealer.name.trim()} - Bhagavati Farm`;
    }
    window.print();
    setTimeout(() => {
      if (dealer?.name) {
        document.title = `${dealer.name.trim()} - Bhagavati Farm`;
      } else {
        document.title = originalTitle;
      }
    }, 1000);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !dealer) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Dealer not found.'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/calculations/dealer')}>
          Back to Dealer Calculations
        </Button>
      </Box>
    );
  }

  const totals = dealerSummary?.totals || {
    gross_amount: 0,
    free_deduction: 0,
    commission: 0,
    transport: 0,
    damage: 0,
    net_amount: 0,
    previous_balance: 0,
    total_paid: 0,
    pending_amount: 0,
    grand_pending_amount: 0,
  };

  const freeItems = dealerSummary?.free_items || [];

  // Compute total boxes across all dispatches
  let totalBoxes20 = 0;
  let totalBoxes10 = 0;
  let totalBoxes5 = 0;
  let totalBoxesDozen = 0;
  let totalBoxesCount = 0;

  detailedDispatches.forEach((d) => {
    d.items.forEach((it) => {
      const qty = Number(it.box_quantity || 0);
      totalBoxesCount += qty;
      const size = String(it.box_size_kg || '').toUpperCase();
      if (size === '20') totalBoxes20 += qty;
      else if (size === '10') totalBoxes10 += qty;
      else if (size === '5') totalBoxes5 += qty;
      else if (size === 'DOZEN') totalBoxesDozen += qty;
    });
  });

  const handleShareWhatsApp = async () => {
    if (!dealer) return;
    const element = document.getElementById('dealer-invoice-document');
    if (!element) return;

    setSharingPdf(true);
    try {
      const cleanDealerName = dealer.name.replace(/[^a-zA-Z0-9_\s-]/g, '').trim().replace(/\s+/g, '_');
      const filename = `${cleanDealerName}_Bhagavati_Farm.pdf`;

      const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      // Generate PDF Blob using html2pdf
      // @ts-ignore
      const pdfBlob: Blob = await html2pdf().set(opt).from(element).outputPdf('blob');
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      // Clean mobile number (add 91 country code if 10 digits)
      const rawMobile = dealer.mobile ? dealer.mobile.replace(/[^0-9]/g, '') : '';
      const phone = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;

      let summaryText =
        `*Bhagavati Farm - Dealer Invoice Statement*\n` +
        `*Dealer:* ${dealer.name}\n` +
        `*Season:* ${seasonName || '-'}\n` +
        (farmName ? `*Farm:* ${farmName}\n` : '') +
        `*Total Dispatches:* ${detailedDispatches.length}\n` +
        `*Total Boxes:* ${fmtN(totalBoxesCount)}\n` +
        `*Gross Amount:* ₹${fmtN(totals.gross_amount)}\n` +
        `*${farmName ? 'Farm Net Amount' : selectedSeasonId !== 0 ? 'Season Net Amount' : 'Total Net Amount'}:* ₹${fmtN(totals.net_amount)}`;

      if (!selectedFarmId) {
        if (selectedSeasonId !== 0 && totals.previous_balance !== 0) {
          summaryText += `\n*Prev Seasons Dues:* ₹${fmtN(totals.previous_balance)}`;
        }
        if (totals.total_paid > 0) {
          summaryText += `\n*Payments Received:* ₹${fmtN(totals.total_paid)}`;
        }
        const finalDue = totals.grand_pending_amount !== undefined ? totals.grand_pending_amount : totals.pending_amount;
        summaryText += `\n*Net Balance Due:* ₹${fmtN(finalDue)}`;
      }

      // 1. Try Native Web Share API Level 2 (files sharing)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: `Invoice - ${dealer.name}`,
            text: summaryText,
          });
          setSharingPdf(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setSharingPdf(false);
            return;
          }
          console.warn('Web Share failed, proceeding to download fallback:', shareErr);
        }
      }

      // 2. Fallback for Desktop / browsers without Web Share file support:
      const blobUrl = URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      // Open WhatsApp Web directly on desktop (or WhatsApp API on mobile) to bypass "Install WhatsApp" prompt
      const textForWhatsApp = `${summaryText}\n\n_Invoice PDF (${filename}) has been downloaded. Please attach and send._`;
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const baseUrl = isMobile ? 'https://api.whatsapp.com/send' : 'https://web.whatsapp.com/send';

      const waUrl = phone
        ? `${baseUrl}?phone=${phone}&text=${encodeURIComponent(textForWhatsApp)}`
        : `${baseUrl}?text=${encodeURIComponent(textForWhatsApp)}`;

      window.open(waUrl, '_blank');
      setToastMessage('Invoice PDF downloaded! Opening WhatsApp Web.');
    } catch (err: any) {
      console.error('Error generating PDF for WhatsApp sharing:', err);
      alert('Failed to generate PDF for WhatsApp sharing. Please try again.');
    } finally {
      setSharingPdf(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* ── Screen-only Action Bar ── */}
      <Box
        className="no-print"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
          '@media print': { display: 'none' },
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/calculations/dealer')}
          variant="outlined"
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Back to Dealer Calculation
        </Button>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            startIcon={sharingPdf ? <CircularProgress size={18} color="inherit" /> : <WhatsAppIcon />}
            onClick={handleShareWhatsApp}
            disabled={sharingPdf}
            variant="contained"
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              px: 2.5,
              backgroundColor: '#25D366',
              color: '#ffffff',
              '&:hover': { backgroundColor: '#1ebe5d' },
              '&:disabled': { backgroundColor: '#86efac', color: '#ffffff' },
            }}
          >
            {sharingPdf ? 'Generating PDF...' : 'Share on WhatsApp'}
          </Button>

          <Button
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700, px: 3 }}
          >
            Print Invoice
          </Button>
        </Box>
      </Box>

      {/* ── Printable Invoice Document ── */}
      <Paper
        id="dealer-invoice-document"
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3.5 },
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          '@media print': {
            border: 'none',
            p: 0,
            boxShadow: 'none',
          },
        }}
      >
        {/* ── 1. Top Farm & Invoice Header ── */}
        <Box sx={{ pb: 1.5, mb: 1.5, borderBottom: '2px solid #0f172a' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Bhagavati Farm
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0369a1', mt: 0.25 }}>
                Dealer Account Statement / Invoice
              </Typography>
            </Box>

            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                Invoice Date: {formatDate(new Date())}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Season: {seasonName || '-'}
              </Typography>
              {farmName && (
                <Typography variant="caption" sx={{ color: '#0369a1', fontWeight: 700, display: 'block' }}>
                  Farm Filter: {farmName}
                </Typography>
              )}
            </Box>
          </Box>

          {/* ── 2. Dealer Information Box ── */}
          <Box
            className="print-section-avoid-break"
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm:
                  dealer.commission_type && dealer.commission_type !== 'NONE'
                    ? 'repeat(4, 1fr)'
                    : 'repeat(3, 1fr)',
              },
              gap: 1.5,
              mt: 1.5,
              p: 1.5,
              borderRadius: 2,
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                Dealer Name
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {dealer.name}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                Contact Number
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                {dealer.mobile || '-'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                Address / Location
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                {[dealer.address, dealer.city].filter(Boolean).join(', ') || '-'}
              </Typography>
            </Box>

            {dealer.commission_type && dealer.commission_type !== 'NONE' && (
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 600 }}>
                  Commission Terms
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7' }}>
                  {dealer.commission_type === 'PERCENTAGE'
                    ? `${dealer.commission_value}% Percentage`
                    : dealer.commission_type === 'FIXED'
                      ? `₹${dealer.commission_value} / Box`
                      : ''}
                </Typography>
              </Box>
            )}
          </Box>
        </Box >

        {/* ── 3. Dispatches Breakdown Table ── */}
        < Box sx={{ mb: 3.5 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              mb: 1.5,
              color: '#334155',
              textTransform: 'uppercase',
              fontSize: '0.78rem',
              letterSpacing: 0.8,
            }}
          >
            Dispatch Details ({detailedDispatches.length})
          </Typography>

          {
            detailedDispatches.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic' }}>
                  No dispatches found for the selected season and filters.
                </Typography>
              </Box>
            ) : (
              <Table
                size="small"
                sx={{
                  border: '1px solid #cbd5e1',
                  '& th, & td': { borderColor: '#e2e8f0', py: 0.9, px: 1 },
                }}
              >
                <TableHead sx={{ backgroundColor: '#f1f5f9', display: 'table-header-group' }}>
                  <TableRow sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: '100px' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Variety / Grade</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', width: '100px' }}>Size</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', width: '90px' }}>Boxes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', width: '110px' }}>Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', width: '130px' }}>Gross (₹)</TableCell>
                  </TableRow>
                </TableHead>
                {detailedDispatches.map((d) => {
                  const s = d.summary;
                  const items = d.items && d.items.length > 0 ? d.items : [];
                  const totalBoxes = items.reduce((acc, it) => acc + Number(it.box_quantity || 0), 0);
                  const totalDeductions =
                    Number(s.free_deduction || 0) +
                    Number(s.commission || 0) +
                    Number(s.transport || 0) +
                    Number(s.damage || 0);

                  const deductionParts: string[] = [];
                  if (s.free_deduction > 0) deductionParts.push(`Free: - ${fmt(s.free_deduction)}`);
                  if (s.commission > 0) deductionParts.push(`Comm: - ${fmt(s.commission)}`);
                  if (s.transport > 0) deductionParts.push(`Trans: - ${fmt(s.transport)}`);
                  if (s.damage > 0) deductionParts.push(`Dam: - ${fmt(s.damage)}`);

                  return (
                    <TableBody
                      key={d.dispatch_id}
                      className="print-dispatch-group"
                      sx={{
                        breakInside: 'avoid',
                        pageBreakInside: 'avoid',
                        '& tr': { breakInside: 'avoid', pageBreakInside: 'avoid' },
                      }}
                    >
                      {/* ── Line Items of this Dispatch ── */}
                      {items.length === 0 ? (
                        <TableRow sx={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                          <TableCell sx={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDate(d.dispatch_date)}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>No Items</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>-</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>0</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem' }}>-</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmt(s.gross_amount)}</TableCell>
                        </TableRow>
                      ) : (
                        items.map((it, itemIdx) => {
                          const isFirst = itemIdx === 0;

                          return (
                            <TableRow
                              key={`${d.dispatch_id}-${it.id || itemIdx}`}
                              sx={{
                                breakInside: 'avoid',
                                pageBreakInside: 'avoid',
                                backgroundColor: '#ffffff',
                              }}
                            >
                              {isFirst ? (
                                <TableCell
                                  rowSpan={items.length}
                                  sx={{
                                    fontSize: '0.8rem',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'top',
                                    fontWeight: 600,
                                    borderRight: '1px solid #f1f5f9',
                                  }}
                                >
                                  {formatDate(d.dispatch_date)}
                                </TableCell>
                              ) : null}

                              <TableCell sx={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 500 }}>
                                {[it.variety, it.grade ? `(${it.grade})` : ''].filter(Boolean).join(' ') || '-'}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {it.box_size_kg
                                  ? String(it.box_size_kg).toUpperCase() === 'DOZEN'
                                    ? 'DOZEN'
                                    : `${it.box_size_kg} KG`
                                  : '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                                {fmtN(it.box_quantity)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                                ₹{fmtN(it.price_per_box)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                {fmt(it.gross_amount)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}

                      {/* ── Dispatch Gross Subtotal Row ── */}
                      <TableRow sx={{ backgroundColor: '#f8fafc', borderTop: '1px solid #cbd5e1' }}>
                        <TableCell colSpan={3} sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                          Dispatch Total ({d.dispatch_no})
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                          {fmtN(totalBoxes)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          Gross Amount
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>
                          {fmt(s.gross_amount)}
                        </TableCell>
                      </TableRow>

                      {/* ── Dispatch Deductions Row (if any) ── */}
                      {totalDeductions > 0 && (
                        <TableRow sx={{ backgroundColor: '#fff5f5' }}>
                          <TableCell colSpan={4} sx={{ fontSize: '0.75rem', color: '#64748b', py: 0.5 }}>
                            {deductionParts.join('  |  ')}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600, py: 0.5 }}>
                            Less Deductions
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700, py: 0.5 }}>
                            - {fmt(totalDeductions)}
                          </TableCell>
                        </TableRow>
                      )}

                      {/* ── Dispatch Net Amount Row ── */}
                      <TableRow
                        sx={{
                          backgroundColor: '#f0fdf4',
                          borderBottom: '2.5px solid #64748b',
                        }}
                      >
                        <TableCell colSpan={4} sx={{ py: 0.75 }} />
                        <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#15803d', py: 0.75 }}>
                          Dispatch Net Amount
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 900, color: '#15803d', py: 0.75 }}>
                          {fmt(s.net_amount)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  );
                })}
              </Table>
            )
          }
        </Box >

        {/* ── 4. Free Dispatch Items (if any) ── */}
        {
          freeItems.length > 0 && (
            <Box sx={{ mb: 3.5, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  mb: 1.5,
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  fontSize: '0.78rem',
                  letterSpacing: 0.8,
                }}
              >
                Free Dispatch Items ({freeItems.length})
              </Typography>
              <Table
                size="small"
                sx={{
                  border: '1px solid #fecaca',
                  backgroundColor: '#fff5f5',
                  '& th, & td': { borderColor: '#fecaca', py: 0.75 },
                }}
              >
                <TableHead sx={{ backgroundColor: '#fee2e2' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Remarks</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Box Size / Produce</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Quantity</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Price/Box</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#dc2626' }}>Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {freeItems.map((fi) => (
                    <TableRow key={fi.id}>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(fi.distribution_date)}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{fi.remarks || '-'}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>
                        {fi.box_size_kg ? (fi.box_size_kg === 'DOZEN' ? 'DOZEN' : `${fi.box_size_kg} KG`) : '-'}
                        {(fi.variety || fi.grade) && ` (${[fi.variety, fi.grade].filter(Boolean).join(' · ')})`}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>{fmtN(fi.box_quantity)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{fmt(fi.price_per_box)}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#dc2626' }}>{fmt(fi.free_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )
        }

        {/* ── Payments Received Section (Only when not filtered by specific farm) ── */}
        {!selectedFarmId && dealerSummary?.payments && dealerSummary.payments.length > 0 && (
          <Box sx={{ mb: 3.5, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 1.5,
                color: '#0284c7',
                textTransform: 'uppercase',
                fontSize: '0.78rem',
                letterSpacing: 0.8,
              }}
            >
              Payments Received ({dealerSummary.payments.length})
            </Typography>
            <Table
              size="small"
              sx={{
                border: '1px solid #bae6fd',
                backgroundColor: '#f0f9ff',
                '& th, & td': { borderColor: '#bae6fd', py: 0.75 },
              }}
            >
              <TableHead sx={{ backgroundColor: '#e0f2fe' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1' }}>Payment Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1' }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1' }}>Reference / UTR</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1' }}>Remarks</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1' }}>Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dealerSummary.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{formatDate(p.payment_date)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{p.payment_mode}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{p.reference_no || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{p.remarks || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284c7' }}>{fmt(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* ── 5. Totals & Final Calculation Breakdown ── */}
        <Box
          className="print-section-avoid-break"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1.3fr' },
            gap: 3,
            p: 2.5,
            borderRadius: 2,
            backgroundColor: '#0f172a',
            color: '#ffffff',
            breakInside: 'avoid',
            pageBreakInside: 'avoid',
            '@media print': {
              breakInside: 'avoid !important',
              pageBreakInside: 'avoid !important',
              backgroundColor: '#0f172a !important',
              color: '#ffffff !important',
            },
          }}
        >
          {/* Left: Box counts breakdown */}
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, display: 'block', mb: 1 }}>
              Total Box Summary
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.82rem' }}>
              <Typography sx={{ color: '#cbd5e1' }}>20 KG Boxes:</Typography>
              <Typography sx={{ fontWeight: 700, textAlign: 'right' }}>{fmtN(totalBoxes20)}</Typography>

              <Typography sx={{ color: '#cbd5e1' }}>10 KG Boxes:</Typography>
              <Typography sx={{ fontWeight: 700, textAlign: 'right' }}>{fmtN(totalBoxes10)}</Typography>

              <Typography sx={{ color: '#cbd5e1' }}>5 KG Boxes:</Typography>
              <Typography sx={{ fontWeight: 700, textAlign: 'right' }}>{fmtN(totalBoxes5)}</Typography>

              <Typography sx={{ color: '#cbd5e1' }}>Dozen Boxes:</Typography>
              <Typography sx={{ fontWeight: 700, textAlign: 'right' }}>{fmtN(totalBoxesDozen)}</Typography>

              <Divider sx={{ gridColumn: '1/-1', borderColor: 'rgba(255,255,255,0.15)', my: 0.5 }} />

              <Typography sx={{ fontWeight: 800, color: '#38bdf8' }}>Total Boxes:</Typography>
              <Typography sx={{ fontWeight: 800, textAlign: 'right', color: '#38bdf8' }}>{fmtN(totalBoxesCount)}</Typography>
            </Box>
          </Box>

          {/* Right: Financial Final Totals */}
          <Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700, display: 'block', mb: 1 }}>
              Final Calculation & Settlement
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 0.75, fontSize: '0.85rem' }}>
              <Typography sx={{ color: '#e2e8f0' }}>Total Gross Amount:</Typography>
              <Typography sx={{ textAlign: 'right', fontWeight: 600 }}>{fmt(totals.gross_amount)}</Typography>

              {totals.free_deduction > 0 && (
                <>
                  <Typography sx={{ color: '#fca5a5' }}>Less Free Boxes Deduction:</Typography>
                  <Typography sx={{ textAlign: 'right', color: '#fca5a5', fontWeight: 600 }}>- {fmt(totals.free_deduction)}</Typography>
                </>
              )}

              {totals.commission > 0 && (
                <>
                  <Typography sx={{ color: '#fca5a5' }}>Less Commission:</Typography>
                  <Typography sx={{ textAlign: 'right', color: '#fca5a5', fontWeight: 600 }}>- {fmt(totals.commission)}</Typography>
                </>
              )}

              {totals.transport > 0 && (
                <>
                  <Typography sx={{ color: '#fca5a5' }}>Less Transport Charges:</Typography>
                  <Typography sx={{ textAlign: 'right', color: '#fca5a5', fontWeight: 600 }}>- {fmt(totals.transport)}</Typography>
                </>
              )}

              {totals.damage > 0 && (
                <>
                  <Typography sx={{ color: '#fca5a5' }}>Less Damage / Settlement Loss:</Typography>
                  <Typography sx={{ textAlign: 'right', color: '#fca5a5', fontWeight: 600 }}>- {fmt(totals.damage)}</Typography>
                </>
              )}

              <Divider sx={{ gridColumn: '1/-1', borderColor: 'rgba(255,255,255,0.15)', my: 0.5 }} />

              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#ffffff' }}>
                {farmName ? 'Farm Net Amount:' : selectedSeasonId !== 0 ? 'Season Net Amount:' : 'Total Net Amount:'}
              </Typography>
              <Typography sx={{ textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: '#4ade80' }}>
                {fmt(totals.net_amount)}
              </Typography>

              {!selectedFarmId && (
                <>
                  {selectedSeasonId !== 0 && totals.previous_balance !== 0 && (
                    <>
                      <Typography sx={{ color: totals.previous_balance > 0 ? '#fca5a5' : '#86efac', fontSize: '0.85rem' }}>
                        {totals.previous_balance > 0 ? 'Add: Previous Seasons Pending Dues:' : 'Less: Previous Seasons Advance / Credit:'}
                      </Typography>
                      <Typography sx={{ textAlign: 'right', color: totals.previous_balance > 0 ? '#fca5a5' : '#86efac', fontWeight: 600 }}>
                        {totals.previous_balance > 0 ? `+ ${fmt(totals.previous_balance)}` : `- ${fmt(Math.abs(totals.previous_balance))}`}
                      </Typography>
                    </>
                  )}

                  {totals.total_paid > 0 && (
                    <>
                      <Typography sx={{ color: '#93c5fd', fontSize: '0.85rem' }}>
                        Less: Payments Received {selectedSeasonId !== 0 ? '(This Season)' : ''}:
                      </Typography>
                      <Typography sx={{ textAlign: 'right', color: '#93c5fd', fontWeight: 600 }}>
                        - {fmt(totals.total_paid)}
                      </Typography>
                    </>
                  )}

                  <Divider sx={{ gridColumn: '1/-1', borderColor: 'rgba(255,255,255,0.2)', my: 0.5 }} />

                  <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff' }}>
                    Net Balance Due:
                  </Typography>
                  <Typography
                    sx={{
                      textAlign: 'right',
                      fontWeight: 900,
                      fontSize: '1.05rem',
                      color: (totals.grand_pending_amount !== undefined ? totals.grand_pending_amount : totals.pending_amount) > 0 ? '#f87171' : '#4ade80',
                    }}
                  >
                    {fmt(totals.grand_pending_amount !== undefined ? totals.grand_pending_amount : totals.pending_amount)}
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* ── 6. Statement Footer ── */}
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            Bhagavati Farm ERP · This is a computer-generated calculation invoice statement.
          </Typography>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default DealerInvoicePage;
