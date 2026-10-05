import { Role } from './rbac';

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | string;

export interface User {
  id: number;
  name: string;
  email: string;
  mobile?: string | null;
  image?: string | null;
  role?: string | null;
  role_id?: number | null;
  role_rel?: Role | null;
  permissions?: string[];
  partner_season_ids?: number[];
  partner_farm_ids?: number[];
  season_partner_ids?: number[];
  is_active: boolean;
  is_verified: boolean;
}

export interface UserRequest {
  name: string;
  email: string;
  password?: string | null;
  mobile?: string | null;
  role?: string | null;
  role_id?: number | null;
  is_active?: boolean;
  is_verified?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  mobile?: string | null;
}

export interface RegisterResponse {
  message: string;
  email: string;
  is_verified: boolean;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}


export interface ForgotPasswordResponse {
  message: string;
  reset_token?: string | null;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface MessageResponse {
  message: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

