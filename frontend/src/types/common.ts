export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface OptionItem {
  id: number | string;
  label: string;
}
