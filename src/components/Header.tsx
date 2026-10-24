import React from 'react';
import {
  Sparkles,
  Search,
  Plus,
  BookOpen,
  ArrowUpDown,
  BarChart,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewPrompt: () => void;
  onOpenDeployGuide: () => void;
  onOpenExportImport: () => void;
  onOpenAuth: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenNewPrompt,
  onOpenDeployGuide,
  onOpenExportImport,
  onOpenAuth,
  isMobileMenuOpen,
  onToggleMobileMenu,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Menüyü aç/kapat"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2 cursor-pointer select-none">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                    PromptHub
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold px-1 py-0.2 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                    Pro
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Central Search Bar */}
          <div className="flex-1 min-w-[120px] max-w-md mx-1 sm:mx-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-violet-400 transition-colors">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Ara..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-xs placeholder-slate-400 text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                  aria-label="Aramayı temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenNewPrompt}
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-3.5 py-2 rounded-xl text-sm font-semibold shadow-md shadow-violet-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              aria-label="Yeni prompt ekle"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Yeni Prompt</span>
            </button>

            <button
              onClick={onOpenDeployGuide}
              className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
              title="Supabase ve Vercel Kurulum Rehberi"
              aria-label="Kurulum ve Dağıtım Rehberi"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Dağıtım Rehberi</span>
            </button>

            <button
              onClick={onOpenExportImport}
              className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-2 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
              title="Kütüphane İstatistikleri & Yedekleme"
              aria-label="Kütüphane İstatistikleri ve Yedekleme"
            >
              <BarChart className="w-4 h-4 text-violet-400" />
              <span className="hidden xl:inline text-xs font-semibold">İstatistikler</span>
            </button>

            {/* Auth / Profile */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {user.email}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-xs font-bold text-violet-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Oturumu Kapat"
                  aria-label="Oturumu Kapat"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-violet-300 border border-violet-500/30 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                aria-label="Giriş Yap veya Kayıt Ol"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Giriş Yap</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
