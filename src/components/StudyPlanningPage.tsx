import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Target, TrendingUp, Plus, Play, Pause, BarChart3, BookOpen, FileText, Search, Filter, Star, Award, Zap, ChevronRight, X } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('all');
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<string | null>(null);
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

  // Obter todas as matérias de todos os planos ativos com filtros
  const getAllActiveSubjects = (): Array<{ planId: string; subject: PlanSubject; planTitle: string }> => {
    let subjects = studyPlans
      .filter(plan => plan.examDate > new Date())
      .flatMap(plan => 
        plan.subjects.map(subject => ({
          planId: plan.id,
          subject,
          planTitle: plan.title
        }))
      );

    // Filtrar por plano selecionado
    if (selectedPlanFilter !== 'all') {
      subjects = subjects.filter(item => item.planId === selectedPlanFilter);
    }

    // Filtrar por termo de busca
    if (searchTerm) {
      subjects = subjects.filter(item => 
        item.subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.planTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return subjects;
  };

  // Calcular estatísticas melhoradas
  const getStats = () => {
    const activePlans = studyPlans.filter(p => p.examDate > new Date());
    const totalHoursCompleted = studyPlans.reduce((sum, plan) => 
      sum + plan.subjects.reduce((subSum, subject) => subSum + subject.completedHours, 0), 0
    );
    const totalHoursPlanned = studyPlans.reduce((sum, plan) => sum + plan.totalStudyHours, 0);
    const completedSubjects = studyPlans.reduce((sum, plan) => 
      sum + plan.subjects.filter(s => s.completedHours >= s.estimatedHours).length, 0
    );
    const totalSubjects = studyPlans.reduce((sum, plan) => sum + plan.subjects.length, 0);

    return {
      activePlans: activePlans.length,
      hoursToday: Math.floor((activeSession?.seconds || 0) / 3600),
      completedSubjects,
      totalSubjects,
      overallProgress: totalHoursPlanned > 0 ? (totalHoursCompleted / totalHoursPlanned) * 100 : 0
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando seus planos de estudo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Aprimorado */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Dashboard de Estudos
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Gerencie seus planos de estudo com inteligência artificial</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Plus className="w-6 h-6" />
              <span className="font-semibold">Novo Plano</span>
            </button>
          </div>
        </div>

        {/* Cronômetro de Estudos Aprimorado */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Cronômetro de Estudos</h2>
              </div>
              
              {activeSession ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-medium text-gray-700">Estudando: {activeSession.subjectName}</span>
                  </div>
                  <div className="text-5xl font-mono font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatTime(activeSession.seconds)}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl font-mono font-bold text-gray-400">
                    00:00:00
                  </div>
                  <div className="text-lg text-gray-500">Selecione uma matéria para começar</div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {!activeSession ? (
                <button
                  onClick={() => setShowSubjectSelector(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={getAllActiveSubjects().length === 0}
                >
                  <Play className="w-6 h-6" />
                  <span className="font-semibold">Iniciar Estudo</span>
                </button>
              ) : (
                <button
                  onClick={stopStudySession}
                  className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-8 py-4 rounded-xl hover:from-red-600 hover:to-rose-600 transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <Pause className="w-6 h-6" />
                  <span className="font-semibold">Finalizar Sessão</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas Aprimorados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Planos Ativos"
            value={stats.activePlans}
            icon={Calendar}
            color="blue"
            trend="+2 este mês"
          />
          
          <StatCard
            title="Horas Hoje"
            value={stats.hoursToday}
            icon={Clock}
            color="green"
            trend={activeSession ? 'Em andamento' : 'Parado'}
          />
          
          <StatCard
            title="Matérias Concluídas"
            value={`${stats.completedSubjects}/${stats.totalSubjects}`}
            icon={Award}
            color="yellow"
            trend={`${((stats.completedSubjects / stats.totalSubjects) * 100 || 0).toFixed(0)}% completo`}
          />
          
          <StatCard
            title="Progresso Geral"
            value={`${stats.overallProgress.toFixed(1)}%`}
            icon={TrendingUp}
            color="purple"
            trend="Mantendo ritmo"
          />
        </div>

        {/* Lista de Planos Aprimorada */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Seus Planos de Estudo</h2>
            {studyPlans.length > 0 && (
              <div className="text-sm text-gray-500">
                {studyPlans.length} plano{studyPlans.length !== 1 ? 's' : ''} criado{studyPlans.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {studyPlans.length === 0 ? (
            <EmptyState onCreatePlan={() => setShowCreateForm(true)} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {studyPlans.map(plan => (
                <StudyPlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onUpdate={loadStudyPlans}
                  onShowDetails={setSelectedPlanDetails}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal de Detalhes do Plano */}
        {selectedPlanDetails && (
          <PlanDetailsModal
            plan={studyPlans.find(p => p.id === selectedPlanDetails)!}
            onClose={() => setSelectedPlanDetails(null)}
          />
        )}

        {/* Modal de Seleção de Matérias Aprimorado */}
        {showSubjectSelector && (
          <SubjectSelectorModal
            subjects={getAllActiveSubjects()}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedPlanFilter={selectedPlanFilter}
            setSelectedPlanFilter={setSelectedPlanFilter}
            studyPlans={studyPlans}
            onSelectSubject={startStudySession}
            onClose={() => setShowSubjectSelector(false)}
          />
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

// Componente de Card de Estatística
function StatCard({ title, value, icon: Icon, color, trend }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  trend: string;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-100 text-blue-600',
    green: 'from-green-500 to-green-600 bg-green-100 text-green-600',
    yellow: 'from-yellow-500 to-yellow-600 bg-yellow-100 text-yellow-600',
    purple: 'from-purple-500 to-purple-600 bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[3]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500 font-medium">{trend}</div>
    </div>
  );
}

// Componente de Estado Vazio
function EmptyState({ onCreatePlan }: { onCreatePlan: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <BarChart3 className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">Nenhum plano de estudos</h3>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        Crie seu primeiro plano de estudos personalizado com IA e comece sua jornada rumo à aprovação
      </p>
      <button
        onClick={onCreatePlan}
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
      >
        Criar Primeiro Plano
      </button>
    </div>
  );
}

// Modal de Seleção de Matérias Aprimorado
function SubjectSelectorModal({
  subjects,
  searchTerm,
  setSearchTerm,
  selectedPlanFilter,
  setSelectedPlanFilter,
  studyPlans,
  onSelectSubject,
  onClose
}: {
  subjects: Array<{ planId: string; subject: PlanSubject; planTitle: string }>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedPlanFilter: string;
  setSelectedPlanFilter: (filter: string) => void;
  studyPlans: StudyPlan[];
  onSelectSubject: (planId: string, subjectId: string, subjectName: string) => void;
  onClose: () => void;
}) {
  const activePlans = studyPlans.filter(p => p.examDate > new Date());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Selecionar Matéria para Estudar</h2>
          
          {/* Filtros e Busca */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar matéria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-gray-400" />
              <button
                onClick={() => setSelectedPlanFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPlanFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos os Planos
              </button>
              {activePlans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlanFilter(plan.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlanFilter === plan.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.title}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6 max-h-96 overflow-y-auto">
          {subjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {subjects.map(({ planId, subject, planTitle }) => {
                const progressPercentage = (subject.completedHours / subject.estimatedHours) * 100;
                const isCompleted = subject.completedHours >= subject.estimatedHours;
                
                return (
                  <button
                    key={`${planId}-${subject.id}`}
                    onClick={() => onSelectSubject(planId, subject.id, subject.subjectName)}
                    className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {subject.subjectName}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">{planTitle}</div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-gray-500">
                        {subject.completedHours.toFixed(1)}h / {subject.estimatedHours}h concluídas
                      </div>
                      <div className={`text-xs font-medium ${
                        isCompleted ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {progressPercentage.toFixed(0)}%
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    {isCompleted && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-xs text-green-600 font-medium">Concluída</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                {searchTerm ? 'Nenhuma matéria encontrada' : 'Nenhuma matéria disponível'}
              </p>
              <p className="text-sm text-gray-400">
                {searchTerm ? 'Tente buscar por outro termo' : 'Crie um plano de estudos primeiro'}
              </p>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-gray-100">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
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
        toast.error('Erro ao criar plano de estudo');
      } finally {
        setLoading(false);
      }
    }
  };

  const addSubject = (subjectName: string) => {
    if (!formData.subjects?.some(s => s.name === subjectName)) {
      setFormData(prev => ({
        ...prev,
        subjects: [...(prev.subjects || []), { name: subjectName, priority: 'medium' }]
      }));
    }
  };

  const removeSubject = (subjectName: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects?.filter(s => s.name !== subjectName) || []
    }));
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
              // Modo Manual
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data do Exame *</label>
                  <input
                    type="date"
                    value={formData.examDate ? new Date(formData.examDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, examDate: new Date(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horas Disponíveis por Dia *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.availableHoursPerDay || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, availableHoursPerDay: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nível de Conhecimento</label>
                  <select
                    value={formData.currentLevel || 'intermediate'}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentLevel: e.target.value as 'beginner' | 'intermediate' | 'advanced' }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermediário</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Matérias *</label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {commonSubjects.map(subject => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => addSubject(subject)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          + {subject}
                        </button>
                      ))}
                    </div>
                    
                    {formData.subjects && formData.subjects.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Matérias Selecionadas:</p>
                        <div className="flex flex-wrap gap-2">
                          {formData.subjects.map(subject => (
                            <div key={subject.name} className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg">
                              <span className="text-sm">{subject.name}</span>
                              <button
                                type="button"
                                onClick={() => removeSubject(subject.name)}
                                className="text-green-600 hover:text-green-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
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

function StudyPlanCard({ plan, onUpdate, onShowDetails }: { plan: StudyPlan; onUpdate: () => void; onShowDetails: (planId: string) => void }) {
  const daysUntilExam = Math.ceil((plan.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const totalCompleted = plan.subjects.reduce((sum, s) => sum + s.completedHours, 0);
  const progressPercentage = (totalCompleted / plan.totalStudyHours) * 100;
  const isExpired = daysUntilExam <= 0;
  const isUrgent = daysUntilExam <= 7 && daysUntilExam > 0;

  return (
    <div 
      className={`bg-white rounded-2xl shadow-lg p-6 border transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1 cursor-pointer ${
        isExpired ? 'border-red-200 bg-red-50' : isUrgent ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100'
      }`}
      onClick={() => onShowDetails(plan.id)}
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{plan.title}</h3>
            {isUrgent && <Zap className="w-5 h-5 text-yellow-500" />}
            {isExpired && <div className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Expirado</div>}
          </div>
          <p className="text-gray-600 font-medium">{plan.examName}</p>
          <p className={`text-sm font-medium mt-1 ${
            isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-500'
          }`}>
            {isExpired ? 'Exame passou' : `${daysUntilExam} dias restantes`}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${
            progressPercentage >= 100 ? 'text-green-600' : progressPercentage >= 75 ? 'text-blue-600' : 'text-gray-700'
          }`}>
            {progressPercentage.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {totalCompleted.toFixed(1)}h / {plan.totalStudyHours}h
          </div>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div 
          className={`h-3 rounded-full transition-all duration-500 ${
            progressPercentage >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
          }`}
          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {plan.subjects.slice(0, 4).map(subject => {
          const subjectProgress = (subject.completedHours / subject.estimatedHours) * 100;
          const isSubjectCompleted = subject.completedHours >= subject.estimatedHours;
          
          return (
            <div key={subject.id} className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="text-sm font-semibold text-gray-900 mb-1 truncate" title={subject.subjectName}>
                {subject.subjectName}
              </div>
              <div className="text-xs text-gray-600 mb-2">
                {subject.completedHours.toFixed(1)}h / {subject.estimatedHours}h
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isSubjectCompleted ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(subjectProgress, 100)}%` }}
                ></div>
              </div>
              {isSubjectCompleted && (
                <div className="flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  <span className="text-xs text-green-600 font-medium">OK</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {plan.subjects.length > 4 && (
        <div className="text-center mt-4">
          <div className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <span className="text-sm font-medium">
              +{plan.subjects.length - 4} matérias adicionais
            </span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de Detalhes do Plano
function PlanDetailsModal({ plan, onClose }: { plan: StudyPlan; onClose: () => void }) {
  const daysUntilExam = Math.ceil((plan.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const totalCompleted = plan.subjects.reduce((sum, s) => sum + s.completedHours, 0);
  const progressPercentage = (totalCompleted / plan.totalStudyHours) * 100;
  const isExpired = daysUntilExam <= 0;
  const isUrgent = daysUntilExam <= 7 && daysUntilExam > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{plan.title}</h2>
                {isUrgent && <Zap className="w-6 h-6 text-yellow-500" />}
                {isExpired && (
                  <div className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                    Expirado
                  </div>
                )}
              </div>
              <p className="text-gray-600 font-medium text-lg">{plan.examName}</p>
              <p className={`text-sm font-medium mt-1 ${
                isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-gray-500'
              }`}>
                {isExpired ? 'Exame passou' : `${daysUntilExam} dias restantes`}
              </p>
            </div>
            <div className="text-right mr-4">
              <div className={`text-4xl font-bold ${
                progressPercentage >= 100 ? 'text-green-600' : progressPercentage >= 75 ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {progressPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 font-medium">
                {totalCompleted.toFixed(1)}h / {plan.totalStudyHours}h
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          
          {/* Barra de Progresso Geral */}
          <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
            <div 
              className={`h-4 rounded-full transition-all duration-500 ${
                progressPercentage >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
        
        {/* Conteúdo */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Todas as Matérias ({plan.subjects.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.subjects.map(subject => {
              const subjectProgress = (subject.completedHours / subject.estimatedHours) * 100;
              const isSubjectCompleted = subject.completedHours >= subject.estimatedHours;
              
              return (
                <div key={subject.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                      {subject.subjectName}
                    </h4>
                    {isSubjectCompleted && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progresso</span>
                      <span className={`font-medium ${
                        isSubjectCompleted ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {subjectProgress.toFixed(0)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isSubjectCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(subjectProgress, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {subject.completedHours.toFixed(1)}h concluídas
                      </span>
                      <span className="text-gray-500">
                        {subject.estimatedHours}h total
                      </span>
                    </div>
                    
                    {subject.completedHours > 0 && (
                      <div className="text-xs text-gray-500">
                        Restam: {Math.max(0, subject.estimatedHours - subject.completedHours).toFixed(1)}h
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Estatísticas Resumidas */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {plan.subjects.filter(s => s.completedHours >= s.estimatedHours).length}
              </div>
              <div className="text-sm text-blue-700 font-medium">Concluídas</div>
            </div>
            
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {plan.subjects.filter(s => s.completedHours > 0 && s.completedHours < s.estimatedHours).length}
              </div>
              <div className="text-sm text-yellow-700 font-medium">Em Progresso</div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {plan.subjects.filter(s => s.completedHours === 0).length}
              </div>
              <div className="text-sm text-gray-700 font-medium">Não Iniciadas</div>
            </div>
            
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalCompleted.toFixed(0)}h
              </div>
              <div className="text-sm text-green-700 font-medium">Total Estudado</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}