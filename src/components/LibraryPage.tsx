import { Search, Filter, FileText, Calendar, Tag, Eye, Download, Trash2, Star, Grid, List } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DocumentService } from '../services/documentService';
import { Database } from '../lib/supabase';
import DocumentViewer from './DocumentViewer';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';

type Document = Database['public']['Tables']['documents']['Row'];

export default function LibraryPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, selectedCategory]);

  const loadDocuments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const docs = await DocumentService.getUserDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    setFilteredDocuments(filtered);
  };

  const handleToggleFavorite = async (doc: Document) => {
    try {
      await DocumentService.toggleFavorite(doc.id, !doc.is_favorite);
      setDocuments(prev => prev.map(d => 
        d.id === doc.id ? { ...d, is_favorite: !doc.is_favorite } : d
      ));
      toast.success(doc.is_favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (error) {
      toast.error('Erro ao atualizar favorito');
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;
    
    try {
      await DocumentService.deleteDocument(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Documento excluído com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir documento');
    }
  };

  const handleDocumentUpdate = (updatedDoc: Document) => {
    setDocuments(prev => prev.map(d => 
      d.id === updatedDoc.id ? updatedDoc : d
    ));
  };

  const categories = ['all', ...Array.from(new Set(documents.map(doc => doc.category).filter(Boolean)))];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = () => {
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const getSummaryBadge = (doc: Document) => {
    const hasShort = doc.summary_short;
    const hasMedium = doc.summary_medium;
    const hasDetailed = doc.summary_detailed;
    
    if (hasDetailed) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Detalhado</span>;
    } else if (hasMedium) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Médio</span>;
    } else if (hasShort) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Curto</span>;
    }
    
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Processando</span>;
  };

  if (!user) {
    return (
      <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Faça login para acessar sua biblioteca
          </h3>
          <p className="text-gray-600 mb-6">
            Entre na sua conta para ver seus documentos e resumos salvos
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            Fazer Login
          </button>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando sua biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
              Biblioteca de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Estudos</span>
            </h1>
            <p className="text-gray-600">
              Gerencie seus documentos e resumos organizados por categoria
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar documentos, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
              >
                <option value="all">Todas as categorias</option>
                {categories.slice(1).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de Documentos', value: documents.length, color: 'from-blue-500 to-blue-600' },
            { label: 'Favoritos', value: documents.filter(d => d.is_favorite).length, color: 'from-yellow-500 to-yellow-600' },
            { label: 'Resumos Criados', value: documents.filter(d => d.processing_status === 'completed').length, color: 'from-green-500 to-green-600' },
            { label: 'Categorias', value: categories.length - 1, color: 'from-purple-500 to-purple-600' }
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className={`w-8 h-8 bg-gradient-to-r ${stat.color} rounded-lg mb-2 flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">{stat.value}</span>
              </div>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Documents */}
        {viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                      {getTypeIcon()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                        {doc.title}
                      </h3>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleToggleFavorite(doc)}
                    className={`p-1 rounded-lg transition-colors duration-200 ${
                      doc.is_favorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-300 hover:text-yellow-500'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${doc.is_favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>5 min</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{doc.category || 'Sem categoria'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {getSummaryBadge(doc)}
                  </div>
                  
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                  <button 
                    onClick={() => setSelectedDocument(doc)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualizar</span>
                  </button>
                  <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200">
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteDocument(doc)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        {getTypeIcon()}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold text-gray-800">
                            {doc.title}
                          </h3>
                          <button 
                            onClick={() => handleToggleFavorite(doc)}
                            className={`p-1 rounded-lg transition-colors duration-200 ${
                              doc.is_favorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${doc.is_favorite ? 'fill-current' : ''}`} />
                          </button>
                          {getSummaryBadge(doc)}
                        </div>
                        
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>{doc.category || 'Sem categoria'}</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>5 min</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {doc.tags.map((tag, index) => (
                              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setSelectedDocument(doc)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:shadow-lg transition-all duration-200 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Visualizar</span>
                      </button>
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200">
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDocument(doc)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredDocuments.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {documents.length === 0 ? 'Nenhum documento encontrado' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-gray-600">
              {documents.length === 0 
                ? 'Faça upload de seus primeiros documentos para começar'
                : 'Tente ajustar os filtros ou fazer uma nova busca'
              }
            </p>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          isOpen={!!selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onUpdate={handleDocumentUpdate}
        />
      )}
    </div>
  );
}