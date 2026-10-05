import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/auth';
import authService from '../services/authService';
import {
  isUserAdmin,
  checkPermission,
  checkAllPermissions,
  checkModuleAccess,
  canUser,
} from '../utils/permissions';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string | string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  hasModuleAccess: (module: string) => boolean;
  can: (
    action:
      | 'create'
      | 'edit'
      | 'update'
      | 'delete'
      | 'view'
      | 'list'
      | 'upload_image'
      | 'assign_permissions'
      | string,
    module: string
  ) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('farm_erp_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('farm_erp_token');
      const savedUser = localStorage.getItem('farm_erp_user');

      if (savedToken) {
        setToken(savedToken);
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
          } catch {
            localStorage.removeItem('farm_erp_user');
          }
        }

        // Validate token by fetching profile
        try {
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem('farm_erp_user', JSON.stringify(profile));
        } catch {
          // If token invalid, clear
          localStorage.removeItem('farm_erp_token');
          localStorage.removeItem('farm_erp_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('farm_erp_token', newToken);
    localStorage.setItem('farm_erp_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('farm_erp_token');
    localStorage.removeItem('farm_erp_user');
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const profile = await authService.getMe();
      setUser(profile);
      localStorage.setItem('farm_erp_user', JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to refresh user profile', e);
    }
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = isUserAdmin(user);

  const hasPermission = (permission: string | string[]) => checkPermission(user, permission);
  const hasAllPermissions = (permissions: string[]) => checkAllPermissions(user, permissions);
  const hasModuleAccess = (module: string) => checkModuleAccess(user, module);
  const can = (
    action:
      | 'create'
      | 'edit'
      | 'update'
      | 'delete'
      | 'view'
      | 'list'
      | 'upload_image'
      | 'assign_permissions'
      | string,
    module: string
  ) => canUser(user, action, module);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        loading,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasAllPermissions,
        hasModuleAccess,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

