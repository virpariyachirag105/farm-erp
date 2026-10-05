import React from 'react';
import { Chip, ChipProps } from '@mui/material';

interface StatusChipProps {
  status: string | boolean;
  label?: string;
  size?: ChipProps['size'];
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, size = 'small' }) => {
  // Normalize status string
  const val = typeof status === 'boolean' ? (status ? 'ACTIVE' : 'INACTIVE') : String(status).toUpperCase();
  const displayLabel = label || (typeof status === 'boolean' ? (status ? 'Active' : 'Inactive') : status);

  let bg = '#f1f5f9';
  let color = '#475569';
  let border = '#cbd5e1';

  switch (val) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'PAID':
    case 'OWN':
      bg = '#dcfce7';
      color = '#15803d';
      border = '#bbf7d0';
      break;
    case 'INACTIVE':
    case 'CLOSED':
    case 'NONE':
      bg = '#fee2e2';
      color = '#b91c1c';
      border = '#fecaca';
      break;
    case 'UPCOMING':
    case 'PENDING':
    case 'PARTIAL':
      bg = '#fef3c7';
      color = '#b45309';
      border = '#fde68a';
      break;
    case 'DISPATCHED':
    case 'PERCENTAGE':
    case 'MARKET':
      bg = '#e0f2fe';
      color = '#0369a1';
      border = '#bae6fd';
      break;
    case 'ADMIN':
      bg = '#fae8ff';
      color = '#86198f';
      border = '#f5d0fe';
      break;
    case 'MANAGER':
      bg = '#e0e7ff';
      color = '#3730a3';
      border = '#c7d2fe';
      break;
    case 'STAFF':
      bg = '#f3f4f6';
      color = '#374151';
      border = '#e5e7eb';
      break;
    default:
      break;
  }

  return (
    <Chip
      label={displayLabel}
      size={size}
      sx={{
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        fontWeight: 600,
        fontSize: '0.75rem',
        textTransform: 'capitalize',
      }}
    />
  );
};

export default StatusChip;
