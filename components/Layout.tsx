import React from 'react';
import { Link, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { Search, Home, Settings, Tv } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store';
import { UserscriptBanner } from './UserscriptBanner';
import { Home as HomePage } from '../pages/Home'; // Renamed to avoid conflict with lucide-react Home
import { Search as SearchPage } from '../pages/Search';
import { Details } from '../pages/Details';
import { Settings as SettingsPage } from '../pages/Settings';

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean; isDesktop?: boolean }> = ({ to, icon, label, active, isDesktop }) => {
  return (
    <Link
      to={to}
      className={`group flex flex-col items-center justify-center p-2 rounded-full transition-all duration-200 ${isDesktop ? 'w-full gap-1' : 'flex-1'}`}
    >
      <div className={`relative flex items-center justify-center rounded-full px-5 py-1 transition-colors duration-300 ${
        active 
          ? 'bg-secondary-container text-on-secondary-container' 
          : 'bg-transparent text-on-surface-variant group-hover:bg-white/5'
      }`}>
        {icon}
      </div>
      <span className={`text-[11px] font-medium mt-1 transition-colors duration-300 ${active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
        {label}
      </span>
    </Link>
  );
};

const pageVariants = {
  initial: {
    opacity: 0,
    x: 50, // Start slightly to the right
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'tween',
      ease: [0.3, 0, 0, 1], // Material You emphasized easing
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    x: -50, // Exit slightly to the left
    transition: {
      type: 'tween',
      ease: [0.3, 0, 0, 1], // Material You emphasized easing
      duration: 0.2,
    },
  },
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const { bangumiToken } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col md:flex-row font-sans">
      {/* Userscript Banner */}
      <UserscriptBanner />
      
      {/* Desktop Navigation Rail */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 flex-col items-center py-8 space-y-8 bg-surface-container z-50">
         <Link to="/" className="mb-4">
            <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-2xl flex items-center justify-center shadow-lg">
                <Tv className="w-6 h-6" />
            </div>
         </Link>
         
         <nav className="flex flex-col space-y-4 w-full px-2">
            <NavItem to="/" icon={<Home size={24} />} label="Home" active={location.pathname === '/'} isDesktop />
            <NavItem to="/search" icon={<Search size={24} />} label="Search" active={location.pathname === '/search'} isDesktop />
            <NavItem to="/settings" icon={<Settings size={24} />} label="Settings" active={location.pathname === '/settings'} isDesktop />
         </nav>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col md:pl-20 min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-16 z-40 bg-surface/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center">
                  <Tv className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-on-surface">Neko-Ani</span>
          </Link>
          {!bangumiToken && (
             <Link to="/settings" className="w-2 h-2 rounded-full bg-error" title="Setup Required"></Link>
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8 mt-16 md:mt-0 w-full">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location}>
              <Route
                path="/"
                element={
                  <motion.div
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full h-full"
                  >
                    <HomePage />
                  </motion.div>
                }
              />
              <Route
                path="/search"
                element={
                  <motion.div
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full h-full"
                  >
                    <SearchPage />
                  </motion.div>
                }
              />
              <Route
                path="/subject/:id"
                element={
                  <motion.div
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full h-full"
                  >
                    <Details />
                  </motion.div>
                }
              />
              <Route
                path="/settings"
                element={
                  <motion.div
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-full h-full"
                  >
                    <SettingsPage />
                  </motion.div>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container-high px-4 py-2 flex justify-between items-center z-50 safe-area-bottom shadow-lg">
        <NavItem to="/" icon={<Home size={24} />} label="Home" active={location.pathname === '/'} />
        <NavItem to="/search" icon={<Search size={24} />} label="Search" active={location.pathname === '/search'} />
        <NavItem to="/settings" icon={<Settings size={24} />} label="Settings" active={location.pathname === '/settings'} />
      </nav>
    </div>
  );
};