import { FileText, Menu, X, User, Settings, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Header({ currentPage, onPageChange }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const { user, signOut } = useAuth();

  const navigation = [
    { name: 'Início', id: 'home' },
    { name: 'Upload', id: 'upload' },
    { name: 'Biblioteca', id: 'library' },
    { name: 'Sobre', id: 'about' }
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso!');
      onPageChange('home');
    } catch (error) {
      toast.error('Erro ao fazer logout');
    }
  };

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div 
              className="flex items-center space-x-2 cursor-pointer group"
              onClick={() => onPageChange('home')}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Aprova.AI
                </span>
                <span className="text-xs text-gray-500 -mt-1">Estude com IA</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    currentPage === item.id
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                    <Settings className="w-5 h-5" />
                  </button>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">{user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openAuthModal('signin')}
                    className="px-4 py-2 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">Criar Conta</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200/50">
              <nav className="flex flex-col space-y-2">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onPageChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium text-left transition-all duration-200 ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                <div className="pt-4 border-t border-gray-200/50 flex flex-col space-y-2">
                  {user ? (
                    <>
                      <div className="flex items-center space-x-2 text-gray-600 px-4 py-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 text-red-600 px-4 py-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Sair</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openAuthModal('signin')}
                        className="flex items-center space-x-2 text-gray-600 px-4 py-2"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm">Entrar</span>
                      </button>
                      <button
                        onClick={() => openAuthModal('signup')}
                        className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg"
                      >
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">Criar Conta</span>
                      </button>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}