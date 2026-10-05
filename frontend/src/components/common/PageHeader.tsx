import React from 'react';
import { Box, Typography, Breadcrumbs, Link, Button } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import { Link as RouterLink } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  extraActions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [{ label: 'Dashboard', path: '/' }],
  actionLabel,
  actionIcon = <AddIcon />,
  onAction,
  extraActions,
}) => {
  return (
    <Box sx={{ mb: 3.5 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" sx={{ color: '#94a3b8' }} />}
          aria-label="breadcrumb"
          sx={{ mb: 1, fontSize: '0.8125rem' }}
        >
          {breadcrumbs.map((item, index) =>
            item.path ? (
              <Link
                key={index}
                component={RouterLink}
                to={item.path}
                underline="hover"
                color="inherit"
                sx={{ color: '#64748b', '&:hover': { color: 'primary.main' } }}
              >
                {item.label}
              </Link>
            ) : (
              <Typography key={index} color="text.primary" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                {item.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ color: '#0f172a', fontWeight: 800 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {extraActions}
          {actionLabel && onAction && (
            <Button
              variant="contained"
              color="primary"
              startIcon={actionIcon}
              onClick={onAction}
              sx={{ py: 1, px: 2 }}
            >
              {actionLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PageHeader;
