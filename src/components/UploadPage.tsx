import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Clock, X, Settings, Brain, Zap, Link, Globe, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DocumentService } from '../services/documentService';
import { AIService } from '../services/aiService';
import { UrlService } from '../services/urlService';
import AuthModal from './AuthModal';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: Date;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  file?: File;
  error?: string;
}

interface ProcessingOptions {
  summaryType: 'short' | 'medium' | 'detailed' | 'study_guide';
  tone: 'formal' | 'casual' | 'simple';
  autoCategory: boolean;
}

interface UploadPageProps {
  onPageChange?: (page: string) => void;
}

export default function UploadPage({ onPageChange }: UploadPageProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    summaryType: 'medium',
    tone: 'formal',
    autoCategory: true
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  // Removido: const navigate = useNavigate();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Validate files
    const validFiles = Array.from(files).filter(file => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error(`Arquivo ${file.name} não é suportado. Use PDF, DOCX ou TXT.`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error(`Arquivo ${file.name} é muito grande. Máximo 10MB.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    const newDocuments = validFiles.map(file => ({
      id: Date.now() + Math.random().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date(),
      status: 'uploading' as const,
      progress: 0,
      file
    }));

    setDocuments(prev => [...prev, ...newDocuments]);

    // Process each document
    newDocuments.forEach(doc => {
      processDocument(doc);
    });
  };

  const processDocument = async (doc: Document) => {
    if (!doc.file || !user) return;

    try {
      console.log('🔍 [DEBUG] Iniciando processamento do documento:', doc.name);
      
      // Step 1: Extract text from file
      updateDocumentStatus(doc.id, 'uploading', 20, 'Extraindo texto do arquivo...');
      const content = await DocumentService.extractTextFromFile(doc.file);
      console.log('🔍 [DEBUG] Texto extraído, tamanho:', content.length);
      
      if (content.length < 100) {
        throw new Error('Conteúdo muito curto para processar. O arquivo deve ter pelo menos 100 caracteres.');
      }

      // Step 2: Upload file to storage
      updateDocumentStatus(doc.id, 'uploading', 40, 'Fazendo upload do arquivo...');
      const fileUrl = await DocumentService.uploadFile(doc.file, user.id);
      console.log('🔍 [DEBUG] Arquivo enviado para:', fileUrl);
      
      // Step 3: Create document record
      updateDocumentStatus(doc.id, 'uploading', 60, 'Salvando documento...');
      const documentData = {
        user_id: user.id,
        title: doc.name.replace(/\.[^/.]+$/, ''), // Remove file extension
        original_filename: doc.name,
        file_type: doc.type,
        file_size: doc.size,
        file_url: fileUrl,
        content: content,
        processing_status: 'processing' as const
      };
      
      console.log('🔍 [DEBUG] Dados do documento para criação:', {
        ...documentData,
        content: `${content.substring(0, 100)}... (${content.length} chars)`
      });
      
      const createdDoc = await DocumentService.createDocument(documentData);
      console.log('🔍 [DEBUG] Documento criado com ID:', createdDoc.id);
      updateDocumentStatus(doc.id, 'processing', 0, 'Iniciando processamento com IA...');
      
      // Step 4: Generate summaries with AI
      updateDocumentStatus(doc.id, 'processing', 15, 'Gerando resumo curto...');
      console.log('🔍 [DEBUG] Gerando resumo curto...');
      const shortSummary = await AIService.generateSummary(content, {
        type: 'short',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });
      console.log('🔍 [DEBUG] Resumo curto gerado, tamanho:', shortSummary.length);

      updateDocumentStatus(doc.id, 'processing', 30, 'Gerando resumo médio...');
      console.log('🔍 [DEBUG] Gerando resumo médio...');
      const mediumSummary = await AIService.generateSummary(content, {
        type: 'medium',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });
      console.log('🔍 [DEBUG] Resumo médio gerado, tamanho:', mediumSummary.length);

      updateDocumentStatus(doc.id, 'processing', 45, 'Gerando resumo detalhado...');
      console.log('🔍 [DEBUG] Gerando resumo detalhado...');
      const detailedSummary = await AIService.generateSummary(content, {
        type: 'detailed',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });
      console.log('🔍 [DEBUG] Resumo detalhado gerado, tamanho:', detailedSummary.length);

      updateDocumentStatus(doc.id, 'processing', 60, 'Gerando guia de estudos...');
      console.log('🔍 [DEBUG] Gerando guia de estudos...');
      const studyGuide = await AIService.generateSummary(content, {
        type: 'study_guide',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });
      console.log('🔍 [DEBUG] Guia de estudos gerado, tamanho:', studyGuide.length);
      
      // Step 5: Auto-categorize and extract tags
      let category = null;
      let tags = null;
      
      if (processingOptions.autoCategory) {
        updateDocumentStatus(doc.id, 'processing', 80, 'Categorizando documento...');
        console.log('🔍 [DEBUG] Categorizando documento...');
        category = await AIService.categorizeDocument(content);
        console.log('🔍 [DEBUG] Categoria gerada:', category);
        
        updateDocumentStatus(doc.id, 'processing', 90, 'Extraindo tags...');
        console.log('🔍 [DEBUG] Extraindo tags...');
        tags = await AIService.extractTags(content);
        console.log('🔍 [DEBUG] Tags geradas:', tags);
      }
      
      // Step 6: Update document with summaries
      updateDocumentStatus(doc.id, 'processing', 95, 'Finalizando...');
      console.log('🔍 [DEBUG] Atualizando documento com resumos...');
      
      const updateData = {
        summary_short: shortSummary,
        summary_medium: mediumSummary,
        summary_detailed: detailedSummary,
        study_guide: studyGuide,
        category,
        tags,
        processing_status: 'completed'
      };
      
      console.log('🔍 [DEBUG] Dados para atualização:', {
        ...updateData,
        summary_short: `${shortSummary.substring(0, 50)}... (${shortSummary.length} chars)`,
        summary_medium: `${mediumSummary.substring(0, 50)}... (${mediumSummary.length} chars)`,
        summary_detailed: `${detailedSummary.substring(0, 50)}... (${detailedSummary.length} chars)`,
        study_guide: `${studyGuide.substring(0, 50)}... (${studyGuide.length} chars)`
      });
      
      await DocumentService.updateDocument(createdDoc.id, updateData);
      console.log('🔍 [DEBUG] Documento atualizado com sucesso!');
      
      updateDocumentStatus(doc.id, 'completed', 100, 'Processamento concluído!');
      toast.success(`${doc.name} processado com sucesso!`);
      
    } catch (error) {
      console.error('🔍 [DEBUG] Error processing document:', error);
      console.error('🔍 [DEBUG] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      updateDocumentStatus(doc.id, 'error', 0, errorMessage);
      toast.error(`Erro ao processar ${doc.name}: ${errorMessage}`);
    }
  };

  const updateDocumentStatus = (docId: string, status: Document['status'], progress: number, statusText?: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === docId ? { 
        ...doc, 
        status, 
        progress,
        error: status === 'error' ? statusText : undefined
      } : doc
    ));
  };

  const removeDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const retryDocument = (doc: Document) => {
    if (doc.file) {
      updateDocumentStatus(doc.id, 'uploading', 0);
      processDocument(doc);
    }
  };

  const processUrl = async () => {
    if (!urlInput.trim()) {
      toast.error('Por favor, insira uma URL válida.');
      return;
    }

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsProcessingUrl(true);
    
    try {
      // Extract content from URL
      toast.loading('Extraindo conteúdo da URL...', { id: 'url-processing' });
      const urlContent = await UrlService.extractContentFromUrl(urlInput);
      
      // Create a document-like object for URL content
      const urlDoc: Document = {
        id: Date.now().toString(),
        name: urlContent.title || urlContent.domain,
        size: urlContent.content.length,
        type: 'text/html',
        uploadDate: new Date(),
        status: 'processing',
        progress: 0
      };
      
      setDocuments(prev => [...prev, urlDoc]);
      
      // Process the URL content similar to file processing
      updateDocumentStatus(urlDoc.id, 'processing', 10, 'Salvando conteúdo...');
      
      const documentData = {
        user_id: user.id,
        title: urlContent.title,
        original_filename: urlContent.url,
        file_type: 'text/html',
        file_size: urlContent.content.length,
        file_url: urlContent.url,
        content: urlContent.content,
        processing_status: 'processing' as const
      };
      
      const createdDoc = await DocumentService.createDocument(documentData);
      
      // Generate summaries
      updateDocumentStatus(urlDoc.id, 'processing', 30, 'Gerando resumo curto...');
      const shortSummary = await AIService.generateSummary(urlContent.content, {
        type: 'short',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });

      updateDocumentStatus(urlDoc.id, 'processing', 50, 'Gerando resumo médio...');
      const mediumSummary = await AIService.generateSummary(urlContent.content, {
        type: 'medium',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });

      updateDocumentStatus(urlDoc.id, 'processing', 70, 'Gerando resumo detalhado...');
      const detailedSummary = await AIService.generateSummary(urlContent.content, {
        type: 'detailed',
        tone: processingOptions.tone,
        language: 'pt-BR'
      });
      
      // Auto-categorize if enabled
      let category = null;
      let tags = null;
      
      if (processingOptions.autoCategory) {
        updateDocumentStatus(urlDoc.id, 'processing', 85, 'Categorizando conteúdo...');
        category = await AIService.categorizeDocument(urlContent.content);
        
        updateDocumentStatus(urlDoc.id, 'processing', 95, 'Extraindo tags...');
        tags = await AIService.extractTags(urlContent.content);
      }
      
      // Update document with summaries
      await DocumentService.updateDocument(createdDoc.id, {
        summary_short: shortSummary,
        summary_medium: mediumSummary,
        summary_detailed: detailedSummary,
        category,
        tags,
        processing_status: 'completed'
      });
      
      updateDocumentStatus(urlDoc.id, 'completed', 100, 'Processamento concluído!');
      toast.success('Conteúdo da URL processado com sucesso!', { id: 'url-processing' });
      setUrlInput('');
      
    } catch (error) {
      console.error('Error processing URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao processar URL: ${errorMessage}`, { id: 'url-processing' });
    } finally {
      setIsProcessingUrl(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'uploading': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'processing': return <Brain className="w-4 h-4 animate-pulse" />;
      case 'completed': return <Check className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (doc: Document) => {
    switch (doc.status) {
      case 'uploading': return 'Enviando arquivo...';
      case 'processing': return 'Gerando resumos com IA...';
      case 'completed': return 'Concluído';
      case 'error': return doc.error || 'Erro no processamento';
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
              Upload de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Documentos</span>
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Faça upload dos seus materiais de estudo e deixe nossa IA criar resumos otimizados para sua aprovação
          </p>
        </div>

        {/* Processing Options */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Opções de Processamento</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Summary Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Resumo Padrão
              </label>
              <select
                value={processingOptions.summaryType}
                onChange={(e) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  summaryType: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="short">Curto (Bullet Points)</option>
                <option value="medium">Médio (Conceitual)</option>
                <option value="detailed">Detalhado (Estruturado)</option>
                <option value="study_guide">Guia de Estudos (Completo)</option>
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tom do Resumo
              </label>
              <select
                value={processingOptions.tone}
                onChange={(e) => setProcessingOptions(prev => ({ 
                  ...prev, 
                  tone: e.target.value as any 
                }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="formal">Formal (Técnico)</option>
                <option value="casual">Casual (Acessível)</option>
                <option value="simple">Simples (Iniciante)</option>
              </select>
            </div>

            {/* Auto Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorização Automática
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={processingOptions.autoCategory}
                  onChange={(e) => setProcessingOptions(prev => ({ 
                    ...prev, 
                    autoCategory: e.target.checked 
                  }))}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Ativar categorização automática</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Upload className="w-5 h-5" />
              <span>Upload de Arquivos</span>
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'url'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              <Globe className="w-5 h-5" />
              <span>Resumo por URL</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mb-8">
          {activeTab === 'file' ? (
            /* File Upload Area */
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileSelect(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              <div className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Arraste arquivos aqui ou clique para selecionar
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Suporte para PDF, DOCX e TXT (máximo 10MB por arquivo)
                  </p>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    Selecionar Arquivos
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* URL Input Area */
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-12 text-center">
              <div className="space-y-6">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Link className="w-8 h-8 text-white" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Gerar resumo a partir de URL
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Cole o link de um artigo, notícia ou conteúdo web para gerar um resumo automaticamente
                  </p>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/artigo"
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !isProcessingUrl) {
                            processUrl();
                          }
                        }}
                      />
                      <button
                        onClick={processUrl}
                        disabled={isProcessingUrl || !urlInput.trim()}
                        className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {isProcessingUrl ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando...</span>
                          </div>
                        ) : (
                          'Gerar Resumo'
                        )}
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      Funciona com artigos, blogs, notícias e outros conteúdos web
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                Documentos ({documents.length})
              </h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-medium text-gray-800 truncate">
                            {doc.name}
                          </h4>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                            {getStatusIcon(doc.status)}
                            <span>{getStatusText(doc)}</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{formatFileSize(doc.size)}</span>
                          <span>{doc.uploadDate.toLocaleString()}</span>
                        </div>
                        
                        {(doc.status === 'uploading' || doc.status === 'processing') && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${doc.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {Math.round(doc.progress)}%
                            </span>
                          </div>
                        )}

                        {doc.status === 'error' && (
                          <div className="mt-2">
                            <p className="text-sm text-red-600">{doc.error}</p>
                            <button
                              onClick={() => retryDocument(doc)}
                              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                            >
                              Tentar novamente
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeDocument(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {documents.some(doc => doc.status === 'completed') && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
            <div className="text-center">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Documentos Processados com Sucesso!
              </h3>
              <p className="text-gray-600 mb-4">
                Seus resumos foram gerados com IA e estão disponíveis na biblioteca.
              </p>
              <button
                onClick={() => onPageChange?.('library')}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Ver na Biblioteca
              </button>
            </div>
          </div>
        )}

        {/* API Key Warning */}
        {!import.meta.env.VITE_OPENAI_API_KEY && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">
                  Chave da API OpenAI não configurada
                </h3>
                <p className="text-yellow-700">
                  Para usar a funcionalidade de IA, configure a variável VITE_OPENAI_API_KEY no arquivo .env
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
      />
    </div>
  );
}