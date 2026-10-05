import apiClient from '../api/client';
import {
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  TokenResponse,
  User,
} from '../types/auth';

export const authService = {
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await apiClient.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  async verifyEmail(token: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/verify-email', { token });
    return response.data;
  },

  async resendVerification(email: string): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/resend-verification', { email });
    return response.data;
  },


  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/reset-password', data);
    return response.data;
  },

  async changePassword(data: ChangePasswordRequest): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/change-password', data);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('farm_erp_token');
    localStorage.removeItem('farm_erp_user');
    window.location.href = '/login';
  },
};

export default authService;

