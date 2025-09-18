import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import NewOrder from './components/NewOrder';
import CustomerHistory from './components/CustomerHistory';
import Expenses from './components/Expenses';
import Income from './components/Income';
import SupplyParties from './components/SupplyParties';
import { Page } from './types';
import { supabase } from './supabaseClient';

// Placeholder components for other pages
const Placeholder = ({ pageName }: { pageName: string }) => (
  <div className="p-8">
    <div className="bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-slate-700">{pageName}</h1>
      <p className="mt-4 text-slate-500">This is a placeholder for the {pageName} page. Functionality will be built out here.</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');

  useEffect(() => {
    // Check for an active session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for changes in authentication state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, []);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActivePage('DASHBOARD');
  };
  
  const handleNavigation = (page: Page) => {
    setActivePage(page);
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'NEW_ORDER':
        return <NewOrder />;
      case 'CUSTOMER_HISTORY':
        return <CustomerHistory />;
      case 'EXPENSES':
        return <Expenses />;
      case 'INCOME':
        return <Income />;
      case 'SUPPLY_PARTIES':
        return <SupplyParties />;
      case 'ADMIN':
        return <Placeholder pageName="Admin Panel" />;
      default:
        return <Dashboard />;
    }
  };

  // If there is no active session, show the Login component
  if (!session) {
    return <Login />;
  }

  // If there is a session, show the main application
  return (
    <div className="flex flex-col min-h-screen">
      <Header onNavigate={handleNavigation} onLogout={handleLogout} />
      <main className="flex-grow">
        {renderActivePage()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
