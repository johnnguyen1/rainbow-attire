export type UserRole = 'user' | 'manager' | 'admin';

export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  /** Company document ID, or '' when unassigned */
  company: string;
  role: UserRole;
  /** Location code for billing (Acme Brick specific) */
  locCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  imageUrl: string;
  holderUrl: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  url: string;
  swatchImageUrl: string;
  /** Hex codes used to render gradient swatches when no swatch image exists */
  swatchImageColors?: string[];
  images: ProductImage[];
}

export interface Product {
  id: string;
  styleNumber: string;
  name: string;
  description: string;
  /** Size spec string, e.g. "XS-4XL" or "XS-4XL & Tall Sizes" */
  sizes: string;
  /** Informational buyer's cost (admin/manager only) */
  buyerCost?: number;
  variants: ProductVariant[];
  /** Company IDs that can see this product; empty = all companies */
  companies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemLogo {
  id: string;
  name: string;
  imageUrl?: string;
  width?: number;
  height?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantName?: string;
  styleNumber: string;
  quantity: number;
  imageUrl?: string;
  size: string;
  logo: CartItemLogo;
}

export interface OrderItem {
  cartId: string;
  productId: string;
  variantId: string;
  name: string;
  variantName: string;
  styleNumber: string;
  quantity: number;
  imageUrl?: string;
  userName?: string;
  size: string;
  logo: {
    name: string;
  };
}

export type OrderStatus =
  | 'pending'
  | 'approved'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface TrackingInfo {
  trackingNumber?: string;
  carrier?: string;
  location?: string;
}

export interface Order {
  id: string;
  userId: string;
  companyId: string;
  companyName?: string;
  userName?: string;
  locCode?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  trackingInfo?: TrackingInfo;
}

export interface CompanyLogo {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
}

export interface MainLogo {
  imageUrl: string;
  width: number;
  height: number;
}

export interface Company {
  id: string;
  displayName: string;
  /** e.g. "example.com" — drives automatic user-to-company assignment */
  emailDomain: string;
  mainLogo: MainLogo;
  embroideryLogos: CompanyLogo[];
  createdAt: Date;
  updatedAt: Date;
}
