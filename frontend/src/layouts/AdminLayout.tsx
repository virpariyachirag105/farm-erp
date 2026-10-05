import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import { Outlet, useLocation, Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocalFloristOutlinedIcon from '@mui/icons-material/LocalFloristOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import GrassIcon from '@mui/icons-material/Grass';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';

import { useAuth } from '../context/AuthContext';


const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  module?: string;
  permission?: string | string[];
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardOutlinedIcon /> },
  { label: 'Products', path: '/products', icon: <LocalFloristOutlinedIcon />, module: 'product' },
  { label: 'Farms', path: '/farms', icon: <AgricultureOutlinedIcon />, module: 'farm' },
  { label: 'Seasons', path: '/seasons', icon: <CalendarMonthOutlinedIcon />, module: 'season' },
  { label: 'Season Partners', path: '/partners', icon: <HandshakeOutlinedIcon />, module: 'season_partner' },
  { label: 'Dealers', path: '/dealers', icon: <StorefrontOutlinedIcon />, module: 'dealer' },
  { label: 'Dispatches', path: '/dispatches', icon: <LocalShippingOutlinedIcon />, module: 'dispatch' },
  {
    label: 'Farm Dispatches',
    path: '/calculations/farm-dispatches',
    icon: <AgricultureOutlinedIcon />,
    permission: ['dealer_calculation.view', 'dispatch.list'],
  },
  {
    label: 'Dealer Calculation',
    path: '/calculations/dealer',
    icon: <CalculateOutlinedIcon />,
    permission: 'dealer_calculation.view',
  },
  { label: 'Dealer Payments', path: '/payments', icon: <PaymentsOutlinedIcon />, module: 'dealer_payment' },
  { label: 'Expenses', path: '/expenses', icon: <ReceiptLongOutlinedIcon />, module: 'expense' },
  { label: 'Box Costs', path: '/box-costs', icon: <Inventory2OutlinedIcon />, module: 'season_box_cost' },
  { label: 'Partner Settlements', path: '/settlements', icon: <AccountBalanceWalletOutlinedIcon />, module: 'partner_settlement' },
  { label: 'User Accounts', path: '/users', icon: <GroupOutlinedIcon />, module: 'user' },
  { label: 'Roles & Permissions', path: '/roles', icon: <AdminPanelSettingsOutlinedIcon />, module: 'role' },
  { label: 'My Profile & Security', path: '/profile', icon: <ManageAccountsOutlinedIcon /> },
];

export const AdminLayout: React.FC = () => {
  const { user, logout, isAdmin, hasPermission, hasModuleAccess } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const isNavItemVisible = (item: NavItem) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.module && !hasModuleAccess(item.module)) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
          }}
        >
          <GrassIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Bhagavati Farm
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Enterprise Agri
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />

      {/* Navigation list */}
      <List sx={{ px: 1.5, py: 2, flexGrow: 1, overflowY: 'auto' }}>
        {navItems
          .filter(isNavItemVisible)
          .map((item) => {
            const isSelected = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <ListItemButton
                key={item.path}
                component={Link}
                to={item.path}
                onClick={() => {
                  if (isMobile) setMobileOpen(false);
                }}
                sx={{
                  textDecoration: 'none',
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1,
                  px: 1.75,
                  backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                  color: isSelected ? '#4ade80' : '#94a3b8',
                  fontWeight: isSelected ? 700 : 500,
                  '&:hover': {
                    backgroundColor: isSelected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#4ade80' : '#f8fafc',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isSelected ? '#4ade80' : '#64748b',
                    minWidth: 38,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      sx: {
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? 700 : 500,
                      },
                    },
                  }}
                />
              </ListItemButton>
            );
          })}
      </List>

      {/* Bottom User Card in Sidebar */}
      <Box
        component={Link}
        to="/profile"
        onClick={() => {
          if (isMobile) setMobileOpen(false);
        }}
        sx={{
          p: 2,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <Avatar
          src={user?.image || undefined}
          sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 700 }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </Avatar>
        <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ color: '#fff', fontWeight: 600 }}>
            {user?.name || 'User'}
          </Typography>
          <Chip
            label={user?.role || 'STAFF'}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.65rem',
              backgroundColor: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              border: 'none',
              fontWeight: 700,
            }}
          />
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderBottom: '1px solid #e2e8f0',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 1, color: '#64748b' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', display: { xs: 'none', sm: 'block' } }}>
              Bhagavati Farm Administration
            </Typography>
          </Box>

          {/* User profile menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              onClick={handleUserMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 2,
                '&:hover': { backgroundColor: '#f1f5f9' },
              }}
            >
              <Avatar
                src={user?.image || undefined}
                sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 700 }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: '#0f172a' }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              slotProps={{
                paper: {
                  sx: { width: 220, mt: 1, p: 0.5, borderRadius: 2, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {user?.email}
                </Typography>
                <Chip label={user?.role} size="small" sx={{ mt: 0.75, height: 20, fontSize: '0.7rem' }} />
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem
                component={Link}
                to="/profile"
                onClick={handleUserMenuClose}
                sx={{ color: '#334155', py: 1 }}
              >
                <ListItemIcon sx={{ color: 'primary.main', minWidth: 32 }}>
                  <ManageAccountsOutlinedIcon fontSize="small" />
                </ListItemIcon>
                My Profile & Security
              </MenuItem>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', py: 1 }}>
                <ListItemIcon sx={{ color: 'error.main', minWidth: 32 }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer (Sidebar) */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {/* Mobile temporary drawer */}
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
            }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          /* Desktop permanent drawer */
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '1px solid #1e293b' },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>

      {/* Main Content View */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3.5 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          backgroundColor: '#f8fafc',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default AdminLayout;