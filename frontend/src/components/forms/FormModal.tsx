import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface FormModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  open,
  title,
  subtitle,
  maxWidth = 'sm',
  loading = false,
  error = null,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  onClose,
  onSubmit,
  children,
}) => {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (e: React.FormEvent) => {
            e.preventDefault();
            onSubmit(e);
          },
          sx: { borderRadius: 3 },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          disabled={loading}
          size="small"
          sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 2.5 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, mt: 0.5 }}>
          {children}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f1f5f9' }}>
        <Button onClick={onClose} disabled={loading} color="inherit" sx={{ color: '#64748b' }}>
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FormModal;
