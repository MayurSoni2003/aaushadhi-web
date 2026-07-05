export interface StrapiCustomer {
  id: number;
  documentId: string;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: string;
  updatedAt: string;
  addresses?: StrapiAddress[];
}

export interface StrapiAddress {
  id: number;
  documentId: string;
  name: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  customer?: StrapiCustomer;
}
