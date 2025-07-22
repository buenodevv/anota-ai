import { useState } from 'react';
import { X, Download, Star, Edit3, Tag, Eye, EyeOff } from 'lucide-react';
import { Database } from '../lib/supabase';
import { DocumentService } from '../services/documentService';
import toast from 'react-hot-toast';

type Document = Database['public']['Tables']['documents']['Row'];

interface DocumentViewerProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (document: Document) => void;
}

export default function DocumentViewer({ document, isOpen, onClose, onUpdate }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'short' | 'medium' | 'detailed' | 'study_guide'>('medium');
  const [showOriginal, setShowOriginal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(document.title);
  const [editCategory, setEditCategory] = useState(document.category || '');
  const [editTags, setEditTags] = useState(document.tags?.join(', ') || '');

  if (!isOpen) return null;

  const handleToggleFavorite = async () => {
    try {
      await DocumentService.toggleFavorite(document.id, !document.is_favorite);
      const updatedDoc = { ...document, is_favorite: !document.is_favorite };
      onUpdate(updatedDoc);
      toast.success(document.is_favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (error) {
      toast.error('Erro ao atualizar favorito');
    }
  };

  const handleSaveEdit = async () => {
    try {
      const updates = {
        title: editTitle,
        category: editCategory,
        tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean),
      };
      
      const updatedDoc = await DocumentService.updateDocument(document.id, updates);
      onUpdate(updatedDoc);
      setIsEditing(false);
      toast.success('Documento atualizado com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar documento');
    }
  };

  const getSummary = () => {
    switch (activeTab) {
      case 'short': return document.summary_short;
      case 'medium': return document.summary_medium;
      case 'detailed': return document.summary_detailed;
      case 'study_guide': return document.study_guide;
      default: return document.summary_medium;
    }
  };

  const formatContent = (content: string | null) => {
    if (!content) return 'Resumo não disponível';
    
    // Enhanced markdown formatting for study guide
    return content
      .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>')
      .replace(/## (.*)/g, '<h2 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>')
      .replace(/• (.*)/g, '<li class="ml-4 mb-1">$1</li>')
      .replace(/- (.*)/g, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold text-gray-800 bg-transparent border-b border-blue-500 focus:outline-none w-full"
              />
            ) : (
              <h2 className="text-xl font-bold text-gray-800 truncate">
                {document.title}
              </h2>
            )}
            <div className="flex items-center space-x-4 mt-2">
              {isEditing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="Categoria"
                    className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded"
                  />
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags (separadas por vírgula)"
                    className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded"
                  />
                </div>
              ) : (
                <>
                  <span className="text-sm text-gray-600">{document.category}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(document.created_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-2 transition-colors duration-200 ${
                    document.is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                  }`}
                >
                  <Star className={`w-5 h-5 ${document.is_favorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                >
                  {showOriginal ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <button className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200">
                  <Download className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Summary Panel */}
          <div className={`${showOriginal ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-100`}>
            {/* Summary Tabs */}
            <div className="flex border-b border-gray-100">
              {[
                { id: 'short', label: 'Curto', color: 'green', icon: '📝' },
                { id: 'medium', label: 'Médio', color: 'blue', icon: '📄' },
                { id: 'detailed', label: 'Detalhado', color: 'purple', icon: '📋' },
                { id: 'study_guide', label: 'Guia de Estudos', color: 'orange', icon: '🎯' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 px-3 py-3 text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1 ${
                    activeTab === tab.id
                      ? `text-${tab.color}-600 border-b-2 border-${tab.color}-500 bg-${tab.color}-50`
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Summary Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: formatContent(getSummary()) 
                }}
              />
            </div>
          </div>

          {/* Original Document Panel */}
          {showOriginal && (
            <div className="w-1/2 flex flex-col">
              <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="font-medium text-gray-800">Documento Original</h3>
              </div>
              <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {document.content}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Tamanho: {(document.file_size / 1024).toFixed(1)} KB</span>
              <span>Tipo: {document.file_type}</span>
            </div>
            
            {document.tags && document.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <div className="flex flex-wrap gap-1">
                  {document.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}