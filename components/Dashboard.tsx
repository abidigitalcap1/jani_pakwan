import React, { useState, useEffect } from 'react';
import StatCard from './StatCard';
import { DASHBOARD_STATS } from '../constants';
import { supabase } from '../supabaseClient';
import { StatCardData } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatCardData[]>(DASHBOARD_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayISO = today.toISOString();
      const tomorrowISO = tomorrow.toISOString();
      const todayDateString = today.toISOString().split('T')[0];

      // Fetch all data in parallel
      const [
        { count: ordersCount, error: ordersError },
        { data: salesData, error: salesError },
        { data: pendingData, error: pendingError },
        { data: expensesData, error: expensesError }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }).gte('order_date', todayISO).lt('order_date', tomorrowISO),
        supabase.from('orders').select('total_amount').gte('order_date', todayISO).lt('order_date', tomorrowISO),
        supabase.from('orders').select('remaining_amount').neq('status', 'Fulfilled'),
        supabase.from('expenses').select('amount').eq('expense_date', todayDateString)
      ]);

      if (ordersError) console.error("Error fetching today's orders count:", ordersError.message);
      if (salesError) console.error("Error fetching today's sales:", salesError.message);
      if (pendingError) console.error("Error fetching pending amount:", pendingError.message);
      if (expensesError) console.error("Error fetching today's expenses:", expensesError.message);

      const todaysSales = salesData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const pendingAmount = pendingData?.reduce((sum, order) => sum + order.remaining_amount, 0) || 0;
      const todaysExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

      const newStats = [
        { ...DASHBOARD_STATS[0], value: (ordersCount || 0).toString() },
        { ...DASHBOARD_STATS[1], value: `PKR ${todaysSales.toLocaleString()}` },
        { ...DASHBOARD_STATS[2], value: `PKR ${pendingAmount.toLocaleString()}` },
        { ...DASHBOARD_STATS[3], value: `PKR ${todaysExpenses.toLocaleString()}` }
      ];

      setStats(newStats);
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(stat => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={loading ? '...' : stat.value}
            icon={stat.icon}
            gradient={stat.gradient}
          />
        ))}
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <div className="h-64 flex items-center justify-center">
            <p className="text-slate-400 text-lg">Main content area for tables or charts.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;