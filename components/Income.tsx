import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { OrderWithCustomer, Payment } from '../types';

const Income: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [orders, setOrders] = useState<OrderWithCustomer[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithCustomer | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
    const [paymentNotes, setPaymentNotes] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchOrders = useCallback(async (search: string) => {
        if (search.length < 1) {
            setOrders([]);
            return;
        }
        setLoading(true);
        let query = supabase.from('orders').select('*, customers (name)').neq('status', 'Fulfilled');

        // Intelligent search: by ID if number, by name if text
        if (!isNaN(Number(search)) && search.trim() !== '') {
            query = query.eq('order_id', parseInt(search));
        } else {
            query = query.ilike('customers.name', `%${search}%`);
        }

        const { data, error } = await query.order('order_date', { ascending: false }).limit(10);
        
        if (error) {
            console.error('Error fetching orders:', error.message);
            setError('Failed to fetch orders.');
        } else {
            setOrders(data as OrderWithCustomer[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchOrders(searchTerm);
        }, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, fetchOrders]);
    
    const fetchPayments = async (orderId: number) => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('order_id', orderId)
            .order('payment_date', { ascending: true });
        
        if (error) {
            console.error('Error fetching payments:', error.message);
        } else {
            setPayments(data);
        }
    };

    const handleSelectOrder = (order: OrderWithCustomer) => {
        setSelectedOrder(order);
        setSearchTerm('');
        setOrders([]);
        fetchPayments(order.order_id);
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder || newPaymentAmount === '' || newPaymentAmount <= 0) {
            setError("Please enter a valid payment amount.");
            return;
        }

        const paymentAmount = Number(newPaymentAmount);
        
        // Use integer comparison to avoid float precision issues
        const remainingCents = Math.round(selectedOrder.remaining_amount * 100);
        const paymentCents = Math.round(paymentAmount * 100);

        if (paymentCents > remainingCents) {
            setError(`Payment cannot exceed the remaining balance of PKR ${selectedOrder.remaining_amount}.`);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        // 1. Add to payments table
        const { error: paymentError } = await supabase.from('payments').insert({
            order_id: selectedOrder.order_id,
            amount: paymentAmount,
            notes: paymentNotes
        });

        if (paymentError) {
            setError(`Failed to add payment: ${paymentError.message}`);
            setLoading(false);
            return;
        }

        // 2. Update order table
        const newPaidAmount = selectedOrder.advance_payment + paymentAmount;
        const newStatus = Math.round((selectedOrder.total_amount - newPaidAmount) * 100) <= 0 ? 'Fulfilled' : 'Partially_Paid';

        const { data: updatedOrderData, error: orderUpdateError } = await supabase
            .from('orders')
            .update({
                advance_payment: newPaidAmount,
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('order_id', selectedOrder.order_id)
            .select('*, customers (name)')
            .single();

        if (orderUpdateError) {
            setError(`Failed to update order status: ${orderUpdateError.message}`);
            // Note: In a real-world scenario, you might want to handle the case where payment was added but order failed to update.
        } else {
            setSuccess(`Payment of PKR ${paymentAmount} added successfully!`);
            setSelectedOrder(updatedOrderData as OrderWithCustomer);
            setNewPaymentAmount('');
            setPaymentNotes('');
            fetchPayments(selectedOrder.order_id);
        }

        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-slate-700 mb-4">Manage Income & Payments</h2>
                <div className="space-y-2 relative">
                    <label className="text-lg font-medium text-slate-600">Search Pending Orders</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Enter Order ID or Customer Name..."
                        className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50"
                    />
                    {searchTerm && orders.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg max-h-60 overflow-auto">
                            {orders.map(order => (
                                <li key={order.order_id} onClick={() => handleSelectOrder(order)} className="p-3 hover:bg-indigo-100 cursor-pointer">
                                    #{order.order_id} - {order.customers?.name || 'Unknown Customer'} (Pending: PKR {order.remaining_amount.toLocaleString()})
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {selectedOrder && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Payment for Order #{selectedOrder.order_id}</h3>
                    {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                    {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
                    
                    <div className="grid grid-cols-3 gap-4 text-center mb-6">
                        <div>
                            <p className="text-lg text-slate-500">Total Amount</p>
                            <p className="text-2xl font-bold text-slate-800">PKR {selectedOrder.total_amount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-lg text-slate-500">Amount Paid</p>
                            <p className="text-2xl font-bold text-green-600">PKR {selectedOrder.advance_payment.toLocaleString()}</p>
                        </div>
                         <div>
                            <p className="text-lg text-slate-500">Remaining Balance</p>
                            <p className="text-2xl font-bold text-red-600">PKR {selectedOrder.remaining_amount.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Payment History */}
                        <div className="border-t pt-4">
                            <h4 className="text-lg font-semibold text-slate-700 mb-2">Payment History</h4>
                            {payments.length > 0 ? (
                                <ul className="space-y-2 max-h-48 overflow-y-auto">
                                    {payments.map(p => (
                                        <li key={p.payment_id} className="p-2 bg-slate-50 rounded">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">PKR {p.amount.toLocaleString()}</span>
                                                <span className="text-sm text-slate-500">{new Date(p.payment_date).toLocaleString()}</span>
                                            </div>
                                            {p.notes && <p className="text-sm text-slate-600 mt-1 pl-1"><em>Note: {p.notes}</em></p>}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500">No payments recorded yet.</p>
                            )}
                        </div>

                        {/* Add Payment Form */}
                        {selectedOrder.status !== 'Fulfilled' && (
                             <form onSubmit={handleAddPayment} className="space-y-4 border-t pt-4">
                                <h4 className="text-lg font-semibold text-slate-700 mb-2">Add New Payment</h4>
                                <div>
                                    <label className="block text-lg font-medium text-slate-600">New Payment Amount</label>
                                    <input
                                        type="number"
                                        value={newPaymentAmount}
                                        onChange={e => setNewPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder="Enter amount"
                                        max={selectedOrder.remaining_amount}
                                        step="0.01"
                                        className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-lg font-medium text-slate-600">Notes (optional)</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={e => setPaymentNotes(e.target.value)}
                                        rows={2}
                                        placeholder="e.g., Paid by cash"
                                        className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50"
                                    ></textarea>
                                </div>
                                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-indigo-400">
                                    {loading ? 'Adding...' : 'Add Payment'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Income;