import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Target, TrendingUp, Plus, Play, Pause, BarChart3, BookOpen, FileText } from 'lucide-react';
import { StudyPlanningService, StudyPlan, StudyPlanRequest, PlanSubject } from '../services/studyPlanningService';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

// Interface para sessão de estudo ativa
interface ActiveStudySession {
  planId: string;
  subjectId: string;
  subjectName: string;
  startTime: Date;
  seconds: number;
}

export default function StudyPlanningPage() {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ActiveStudySession | null>(null);
  const [showSubjectSelector, setShowSubjectSelector] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadStudyPlans();
    }
  }, [user]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession) {
      interval = setInterval(() => {
        setActiveSession(prev => prev ? { ...prev, seconds: prev.seconds + 1 } : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const loadStudyPlans = async () => {
    try {
      setLoading(true);
      const plans = await StudyPlanningService.getUserStudyPlans(user!.id);
      setStudyPlans(plans);
    } catch (error) {
      toast.error('Erro ao carregar planos de estudo');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startStudySession = (planId: string, subjectId: string, subjectName: string) => {
    setActiveSession({
      planId,
      subjectId,
      subjectName,
      startTime: new Date(),
      seconds: 0
    });
    setShowSubjectSelector(false);
    toast.success(`Iniciando estudo de ${subjectName}`);
  };

  const stopStudySession = async () => {
    if (!activeSession || activeSession.seconds < 60) {
      toast.error('Sessão muito curta (mínimo 1 minuto)');
      setActiveSession(null);
      return;
    }

    try {
      const hoursStudied = activeSession.seconds / 3600;
      
      console.log('Dados da sessão:', {
        planId: activeSession.planId,
        subjectId: activeSession.subjectId,
        hoursStudied
      });
      
      // Salvar sessão no banco
      await StudyPlanningService.saveStudySession({
        planId: activeSession.planId,
        subjectId: activeSession.subjectId,
        startTime: activeSession.startTime,
        endTime: new Date(),
        durationMinutes: Math.floor(activeSession.seconds / 60),
        sessionType: 'study',
        notes: `Sessão de estudo de ${activeSession.subjectName}`
      });
  
      // Atualizar progresso da matéria
      await StudyPlanningService.updateSubjectProgress(
        activeSession.planId,
        activeSession.subjectId,
        hoursStudied
      );
  
      toast.success(`Sessão de ${formatTime(activeSession.seconds)} em ${activeSession.subjectName} registrada!`);
      
      // Recarregar planos para atualizar progresso
      await loadStudyPlans();
    } catch (error) {
      console.error('Erro detalhado ao salvar sessão:', error);
      toast.error(`Erro ao salvar sessão de estudo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setActiveSession(null);
    }
  };

  // Obter todas as matérias de todos os planos ativos
  const getAllActiveSubjects = (): Array<{ planId: string; subject: PlanSubject; planTitle: string }> => {
    return studyPlans
      .filter(plan => plan.examDate > new Date())
      .flatMap(plan => 
        plan.subjects.map(subject => ({
          planId: plan.id,
          subject,
          planTitle: plan.title
        }))
      );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Estudos</h1>
              <p className="text-gray-600 mt-2">Gerencie seus planos de estudo com inteligência artificial</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Novo Plano
            </button>
          </div>
        </div>

        {/* Cronômetro de Estudos por Matéria */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cronômetro de Estudos</h2>
              {activeSession ? (
                <>
                  <div className="text-sm text-gray-600 mb-1">Estudando: {activeSession.subjectName}</div>
                  <div className="text-4xl font-mono font-bold text-blue-600">
                    {formatTime(activeSession.seconds)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-mono font-bold text-gray-400">
                    00:00:00
                  </div>
                  <div className="text-sm text-gray-500 mt-1">Selecione uma matéria para começar</div>
                </>
              )}
            </div>
            <div className="flex gap-4">
              {!activeSession ? (
                <button
                  onClick={() => setShowSubjectSelector(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  disabled={getAllActiveSubjects().length === 0}
                >
                  <Play className="w-5 h-5" />
                  Iniciar Estudo
                </button>
              ) : (
                <button
                  onClick={stopStudySession}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  Finalizar Sessão
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Planos Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{studyPlans.filter(p => p.examDate > new Date()).length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Hoje</p>
                <p className="text-2xl font-bold text-gray-900">{Math.floor((activeSession?.seconds || 0) / 3600)}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Metas Atingidas</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Target className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Lista de Planos */}
        <div className="space-y-6">
          {studyPlans.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum plano de estudos</h3>
              <p className="text-gray-600 mb-6">Crie seu primeiro plano de estudos personalizado com IA</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Primeiro Plano
              </button>
            </div>
          ) : (
            studyPlans.map(plan => (
              <StudyPlanCard key={plan.id} plan={plan} onUpdate={loadStudyPlans} />
            ))
          )}
        </div>

        {/* Modal de Seleção de Matérias */}
        {showSubjectSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Selecionar Matéria</h2>
                <p className="text-gray-600 mb-6">Escolha a matéria que você vai estudar:</p>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {getAllActiveSubjects().map(({ planId, subject, planTitle }) => (
                    <button
                      key={`${planId}-${subject.id}`}
                      onClick={() => startStudySession(planId, subject.id, subject.subjectName)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{subject.subjectName}</div>
                      <div className="text-sm text-gray-500">{planTitle}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {subject.completedHours}h / {subject.estimatedHours}h concluídas
                      </div>
                    </button>
                  ))}
                </div>
                
                {getAllActiveSubjects().length === 0 && (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhuma matéria disponível</p>
                    <p className="text-sm text-gray-400">Crie um plano de estudos primeiro</p>
                  </div>
                )}
                
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowSubjectSelector(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Criação */}
        {showCreateForm && (
          <CreatePlanModal
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false);
              loadStudyPlans();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Componente do Card do Plano
function StudyPlanCard({ plan, onUpdate }: { plan: StudyPlan; onUpdate: () => void }) {
  const daysUntilExam = Math.ceil((plan.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const totalCompleted = plan.subjects.reduce((sum, s) => sum + s.completedHours, 0);
  const progressPercentage = (totalCompleted / plan.totalStudyHours) * 100;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{plan.title}</h3>
          <p className="text-gray-600">{plan.examName}</p>
          <p className="text-sm text-gray-500 mt-1">
            {daysUntilExam > 0 ? `${daysUntilExam} dias restantes` : 'Exame passou'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{progressPercentage.toFixed(1)}%</div>
          <div className="text-sm text-gray-500">{totalCompleted}h / {plan.totalStudyHours}h</div>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {plan.subjects.slice(0, 4).map(subject => (
          <div key={subject.id} className="text-center">
            <div className="text-sm font-medium text-gray-900">{subject.subjectName}</div>
            <div className="text-xs text-gray-500">
              {subject.completedHours}h / {subject.estimatedHours}h
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div 
                className="bg-green-500 h-1 rounded-full"
                style={{ width: `${Math.min((subject.completedHours / subject.estimatedHours) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Modal de Criação de Plano
function CreatePlanModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState<Partial<StudyPlanRequest>>({
    availableHoursPerDay: 4,
    currentLevel: 'intermediate',
    subjects: []
  });
  const [loading, setLoading] = useState(false);
  const [creationMode, setCreationMode] = useState<'manual' | 'edital'>('manual');
  const [editalFile, setEditalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commonSubjects = [
    'Direito Constitucional', 'Direito Administrativo', 'Direito Civil', 'Direito Penal',
    'Português', 'Matemática', 'Raciocínio Lógico', 'Informática', 'Conhecimentos Gerais'
  ];

  const handleEditalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setEditalFile(file);
    } else {
      toast.error('Por favor, selecione um arquivo PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (creationMode === 'edital') {
      if (!editalFile) {
        toast.error('Por favor, faça upload do edital em PDF');
        return;
      }
      
      try {
        setLoading(true);
        await StudyPlanningService.generateStudyPlanFromEdital(editalFile);
        toast.success('Plano de estudos criado com base no edital!');
        onSuccess();
      } catch (error) {
        toast.error('Erro ao processar edital');
      } finally {
        setLoading(false);
      }
    } else {
      // Lógica manual existente
      if (!formData.examName || !formData.examDate || !formData.subjects?.length) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      try {
        setLoading(true);
        await StudyPlanningService.generateStudyPlan(formData as StudyPlanRequest);
        toast.success('Plano de estudos criado com sucesso!');
        onSuccess();
      } catch (error) {
        toast.error('Erro ao criar plano de estudos');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Plano de Estudos com IA</h2>
          
          {/* Seletor de Modo */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setCreationMode('manual')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  creationMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Manual
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('edital')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  creationMode === 'edital'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                A partir do Edital (PDF)
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {creationMode === 'edital' ? (
              // Modo Edital
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload do Edital (PDF) *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleEditalUpload}
                      className="hidden"
                    />
                    {editalFile ? (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 text-green-600 mx-auto" />
                        <p className="text-sm font-medium text-gray-900">{editalFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(editalFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          type="button"
                          onClick={() => setEditalFile(null)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remover arquivo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">
                          Clique para selecionar o edital em PDF
                        </p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Selecionar Arquivo
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    A IA analisará o edital e criará automaticamente um plano de estudos personalizado
                  </p>
                </div>
              </div>
            ) : (
              // Modo Manual (código existente)
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Concurso *</label>
                  <input
                    type="text"
                    value={formData.examName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, examName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Concurso TRF 2024"
                    required
                  />
                </div>
                
                {/* ... resto do formulário manual existente ... */}
              </>
            )}
            
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processando...' : creationMode === 'edital' ? 'Analisar Edital e Gerar Plano' : 'Gerar Plano com IA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}