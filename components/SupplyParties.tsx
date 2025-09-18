import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { SupplyParty, PartyPayment } from '../types';

// Define Modal component outside to prevent re-creation on re-renders
const AddPartyModal = ({ onClose, onSave, loading }: { onClose: () => void, onSave: (party: any) => void, loading: boolean }) => {
    const [partyName, setPartyName] = useState('');
    const [supplyDate, setSupplyDate] = useState(new Date().toISOString().split('T')[0]);
    const [totalAmount, setTotalAmount] = useState<number | ''>('');
    const [details, setDetails] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ party_name: partyName, supply_date: supplyDate, total_amount: totalAmount, details });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Add New Supply Party</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-lg font-medium text-slate-600">Party Name</label>
                        <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50" required />
                    </div>
                     <div>
                        <label className="block text-lg font-medium text-slate-600">Supply Date</label>
                        <input type="date" value={supplyDate} onChange={e => setSupplyDate(e.target.value)} className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50" required />
                    </div>
                     <div>
                        <label className="block text-lg font-medium text-slate-600">Total Amount</label>
                        <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50" required />
                    </div>
                     <div>
                        <label className="block text-lg font-medium text-slate-600">Details (optional)</label>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} className="w-full p-3 text-lg border-gray-300 rounded-md shadow-sm bg-slate-50"></textarea>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-300 rounded-md hover:bg-slate-400">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">{loading ? 'Saving...' : 'Add Party'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const SupplyParties: React.FC = () => {
    const [parties, setParties] = useState<SupplyParty[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<SupplyParty | null>(null);
    const [payments, setPayments] = useState<PartyPayment[]>([]);
    const [newPaymentAmount, setNewPaymentAmount] = useState<number | ''>('');
    const [paymentNote, setPaymentNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchParties = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_supply_parties');
        if (error) {
            console.error('Error fetching supply parties:', error.message);
        } else {
            setParties(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchParties();
    }, [fetchParties]);

    const handleSaveParty = async (party: any) => {
        setLoading(true);
        const { error } = await supabase.from('parties').insert(party);
        if (error) {
             console.error('Error saving party:', error.message);
        } else {
            setIsModalOpen(false);
            fetchParties();
        }
        setLoading(false);
    };
    
    const openPaymentModal = async (party: SupplyParty) => {
        setSelectedParty(party);
        const { data, error } = await supabase.from('party_payments').select('*').eq('party_id', party.id).order('payment_date', { ascending: false });
        if (error) {
            console.error("Error fetching payments", error.message);
        } else {
            setPayments(data);
        }
        setIsPaymentModalOpen(true);
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedParty || newPaymentAmount === '' || newPaymentAmount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        const paymentAmount = Number(newPaymentAmount);
        const remainingCents = Math.round(selectedParty.pending_amount * 100);
        const paymentCents = Math.round(paymentAmount * 100);

        if (paymentCents > remainingCents) {
            setError(`Payment cannot exceed pending amount of PKR ${selectedParty.pending_amount}.`);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);
        
        const { error: insertError } = await supabase.from('party_payments').insert({
            party_id: selectedParty.id,
            amount_paid: paymentAmount,
            note: paymentNote,
            payment_date: new Date().toISOString().split('T')[0]
        });

        if (insertError) {
            setError(`Error adding payment: ${insertError.message}`);
        } else {
            setSuccess('Payment added successfully!');
            setNewPaymentAmount('');
            setPaymentNote('');
            // Refresh data
            fetchParties();
            openPaymentModal({ ...selectedParty, pending_amount: selectedParty.pending_amount - paymentAmount });
        }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-700">Supply Parties</h2>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Add New Party</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Date</th>
                                <th className="py-3 px-4 text-left font-semibold text-slate-600">Party Name</th>
                                <th className="py-3 px-4 text-right font-semibold text-slate-600">Total Amount</th>
                                <th className="py-3 px-4 text-right font-semibold text-slate-600">Paid</th>
                                <th className="py-3 px-4 text-right font-semibold text-slate-600">Pending</th>
                                <th className="py-3 px-4 text-center font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                        ) : (
                            parties.map(party => (
                                <tr key={party.id} className="border-b hover:bg-slate-50">
                                    <td className="py-3 px-4">{new Date(party.supply_date).toLocaleDateString()}</td>
                                    <td className="py-3 px-4">{party.party_name}</td>
                                    <td className="py-3 px-4 text-right font-medium">PKR {party.total_amount.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-green-600">PKR {party.amount_paid.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-right text-red-600">PKR {party.pending_amount.toLocaleString()}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button onClick={() => openPaymentModal(party)} className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600">Record Payment</button>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
            {isModalOpen && <AddPartyModal onClose={() => setIsModalOpen(false)} onSave={handleSaveParty} loading={loading} />}
            {isPaymentModalOpen && selectedParty && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                         <h3 className="text-2xl font-bold text-slate-800 mb-4">Ledger for {selectedParty.party_name}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-y-auto">
                            {/* Payment History */}
                            <div className="space-y-2">
                                <h4 className="font-semibold text-lg">Payment History</h4>
                                <ul className="space-y-2">
                                {payments.map(p => (
                                    <li key={p.id} className="p-2 bg-slate-100 rounded">
                                        <div className="flex justify-between">
                                            <span>PKR {p.amount_paid.toLocaleString()}</span>
                                            <span className="text-sm text-slate-500">{new Date(p.payment_date).toLocaleDateString()}</span>
                                        </div>
                                        {p.note && <p className="text-sm text-slate-600 italic">Note: {p.note}</p>}
                                    </li>
                                ))}
                                </ul>
                            </div>
                            {/* Add Payment */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg">Add New Payment</h4>
                                {error && <div className="text-red-600 bg-red-100 p-2 rounded">{error}</div>}
                                {success && <div className="text-green-600 bg-green-100 p-2 rounded">{success}</div>}
                                <form onSubmit={handleAddPayment} className="space-y-4">
                                     <div>
                                        <label className="block text-lg font-medium text-slate-600">Amount</label>
                                        <input type="number" value={newPaymentAmount} max={selectedParty.pending_amount} onChange={e => setNewPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full p-3 text-lg border-gray-300 rounded-md bg-slate-50" required />
                                    </div>
                                    <div>
                                        <label className="block text-lg font-medium text-slate-600">Note (optional)</label>
                                        <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2} className="w-full p-3 text-lg border-gray-300 rounded-md bg-slate-50"></textarea>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">{loading ? 'Saving...' : 'Add Payment'}</button>
                                </form>
                            </div>
                         </div>
                         <div className="pt-4 border-t text-right">
                             <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 bg-slate-300 rounded-md hover:bg-slate-400">Close</button>
                         </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default SupplyParties;