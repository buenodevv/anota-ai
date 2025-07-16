import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Target, TrendingUp, Plus, Play, Pause, BarChart3 } from 'lucide-react';
import { StudyPlanningService, StudyPlan, StudyPlanRequest } from '../services/studyPlanningService';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function StudyPlanningPage() {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadStudyPlans();
    }
  }, [user]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

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

  const startTimer = (sessionId: string) => {
    setActiveTimer(sessionId);
    setTimerSeconds(0);
  };

  const stopTimer = () => {
    if (activeTimer && timerSeconds > 0) {
      const hoursStudied = timerSeconds / 3600;
      // Aqui você salvaria a sessão de estudo
      toast.success(`Sessão de ${formatTime(timerSeconds)} registrada!`);
    }
    setActiveTimer(null);
    setTimerSeconds(0);
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

        {/* Cronômetro de Estudos */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cronômetro de Estudos</h2>
              <div className="text-4xl font-mono font-bold text-blue-600">
                {formatTime(timerSeconds)}
              </div>
            </div>
            <div className="flex gap-4">
              {!activeTimer ? (
                <button
                  onClick={() => startTimer('current-session')}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Iniciar
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Pause className="w-5 h-5" />
                  Parar
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
                <p className="text-2xl font-bold text-gray-900">{Math.floor(timerSeconds / 3600)}</p>
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

  const commonSubjects = [
    'Direito Constitucional', 'Direito Administrativo', 'Direito Civil', 'Direito Penal',
    'Português', 'Matemática', 'Raciocínio Lógico', 'Informática', 'Conhecimentos Gerais'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  const toggleSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects?.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...(prev.subjects || []), subject]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Plano de Estudos com IA</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Data da Prova *</label>
              <input
                type="date"
                value={formData.examDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, examDate: new Date(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horas Disponíveis por Dia</label>
              <select
                value={formData.availableHoursPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, availableHoursPerDay: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(hours => (
                  <option key={hours} value={hours}>{hours} hora{hours > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nível Atual</label>
              <select
                value={formData.currentLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, currentLevel: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Matérias do Concurso *</label>
              <div className="grid grid-cols-2 gap-2">
                {commonSubjects.map(subject => (
                  <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.subjects?.includes(subject) || false}
                      onChange={() => toggleSubject(subject)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{subject}</span>
                  </label>
                ))}
              </div>
            </div>
            
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
                {loading ? 'Gerando...' : 'Gerar Plano com IA'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}