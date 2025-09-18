import React from 'react';

export type Page = 'DASHBOARD' | 'NEW_ORDER' | 'CUSTOMER_HISTORY' | 'EXPENSES' | 'INCOME' | 'SUPPLY_PARTIES' | 'ADMIN';

export interface NavLink {
  label: string;
  icon: React.ReactNode;
  page: Page;
}

export interface StatCardData {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}

// Database-related types
export interface Customer {
  customer_id: number;
  name: string;
  phone: string;
  address: string;
}

export interface MenuItem {
  item_id: number;
  name: string;
  price: number;
}

export interface OrderItemForm {
  item_id: number | null;
  custom_item_name: string;
  quantity: number;
  unit_price: number;
}

export interface Order {
  order_id: number;
  customer_id: number;
  order_type: 'Online' | 'Local';
  // FIX: Added 'order_date' to align the type with database queries and resolve an error in CustomerHistory.tsx.
  order_date: string;
  delivery_date: string;
  delivery_time?: string;
  total_amount: number;
  advance_payment: number;
  remaining_amount: number;
  delivery_address?: string;
  notes?: string;
  status: 'Pending' | 'Partially_Paid' | 'Fulfilled';
  // FIX: Removed 'customers' property to resolve inheritance conflict in 'OrderWithCustomer'.
  // This property is specific to joined queries and is now correctly defined only in the derived interface.
}

export interface Payment {
  payment_id: number;
  order_id: number;
  amount: number;
  payment_date: string;
  notes?: string;
}

export interface Expense {
  expense_id: number;
  description: string;
  amount: number;
  expense_date: string;
  category: string;
}

export interface Party {
    id: number;
    party_name: string;
    supply_date: string;
    details: string;
    total_amount: number;
}

export interface PartyPayment {
    id: number;
    party_id: number;
    payment_date: string;
    amount_paid: number;
    note?: string;
}

export interface SupplyParty {
  id: number;
  party_name: string;
  supply_date: string;
  total_amount: number;
  amount_paid: number;
  pending_amount: number;
}

export interface OrderWithCustomer extends Order {
  customers: {
    name: string;
  } | null;
}

export interface OrderItemWithMenuItem {
  order_item_id: number;
  quantity: number;
  unit_price: number;
  custom_item_name: string | null;
  menu_items: {
    name: string;
  } | null;
}

export interface LedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}