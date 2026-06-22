import React from 'react';
import { LogOut, LayoutDashboard, ArrowRightLeft, History, Upload, BarChart2, Settings, PackageOpen } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout({ user, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#003d33] text-white flex flex-col shadow-xl md:h-screen md:sticky md:top-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
              <img src="/icon.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">CARATININGA</h1>
              <p className="text-[#00a86b] text-xs font-semibold tracking-wider">TRANSFERÊNCIAS</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-4 mt-2">Principal</div>
          <NavLink 
            to="/" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-[#00a86b] font-bold' : 'hover:bg-white/5 text-slate-300 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink 
            to="/nova-transferencia" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-[#00a86b] font-bold' : 'hover:bg-white/5 text-slate-300 hover:text-white'}`}
          >
            <ArrowRightLeft size={20} />
            <span>Nova Transferência</span>
          </NavLink>
          <NavLink 
            to="/relatorios" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-[#00a86b] font-bold' : 'hover:bg-white/5 text-slate-300 hover:text-white'}`}
          >
            <BarChart2 size={20} />
            <span>Relatórios</span>
          </NavLink>

          <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-4 mt-8 pt-4 border-t border-white/5">Sistema</div>
          <NavLink 
            to="/admin" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-[#00a86b] font-bold' : 'hover:bg-white/5 text-slate-300 hover:text-white'}`}
          >
            <Settings size={20} />
            <span>Administração</span>
          </NavLink>
        </nav>

        <div className="p-4 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-black/20 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[#00a86b] flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
