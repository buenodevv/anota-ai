import { supabase } from '../lib/supabase';
import { AIService } from './aiService';
import { DocumentService } from './documentService';

export interface StudyPlanRequest {
  examName: string;
  examDate: Date;
  availableHoursPerDay: number;
  subjects: string[];
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  focusAreas?: string[];
}

export interface StudyPlan {
  id: string;
  title: string;
  description: string;
  examName: string;
  examDate: Date;
  totalStudyHours: number;
  dailyStudyHours: number;
  subjects: PlanSubject[];
  schedule: ScheduleItem[];
}

export interface PlanSubject {
  id: string;
  subjectName: string;
  weightPercentage: number;
  estimatedHours: number;
  completedHours: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: number;
}

export interface ScheduleItem {
  id: string;
  subjectId: string;
  scheduledDate: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sessionType: 'study' | 'review' | 'practice' | 'break';
  topic: string;
  completed: boolean;
}

// Nova interface para sessão de estudo
export interface StudySessionData {
  planId: string;
  subjectId: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  sessionType: 'study' | 'review' | 'practice';
  notes?: string;
}

export class StudyPlanningService {
  
  static async generateStudyPlan(request: StudyPlanRequest): Promise<StudyPlan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 1. Gerar plano com IA
    const aiPlan = await this.generateAIPlan(request);
    
    // 2. Salvar plano no banco
    const { data: studyPlan, error: planError } = await supabase
      .from('study_plans')
      .insert({
        user_id: user.id,
        title: aiPlan.title,
        description: aiPlan.description,
        exam_name: request.examName,
        exam_date: request.examDate.toISOString().split('T')[0],
        total_study_hours: aiPlan.totalHours,
        daily_study_hours: request.availableHoursPerDay,
        ai_generated: true
      })
      .select()
      .single();

    if (planError) throw planError;

    // 3. Salvar matérias
    const subjectsData = aiPlan.subjects.map(subject => ({
      plan_id: studyPlan.id,
      subject_name: subject.name,
      weight_percentage: subject.weight,
      estimated_hours: subject.hours,
      difficulty: subject.difficulty,
      priority: subject.priority
    }));

    const { data: subjects, error: subjectsError } = await supabase
      .from('plan_subjects')
      .insert(subjectsData)
      .select();

    if (subjectsError) throw subjectsError;

    // 4. Gerar cronograma
    const schedule = await this.generateSchedule(studyPlan.id, subjects, request);
    
    return {
      id: studyPlan.id,
      title: studyPlan.title,
      description: studyPlan.description,
      examName: studyPlan.exam_name,
      examDate: new Date(studyPlan.exam_date),
      totalStudyHours: studyPlan.total_study_hours,
      dailyStudyHours: studyPlan.daily_study_hours,
      subjects: subjects.map(s => ({
        id: s.id,
        subjectName: s.subject_name,
        weightPercentage: s.weight_percentage,
        estimatedHours: s.estimated_hours,
        completedHours: s.completed_hours,
        difficulty: s.difficulty,
        priority: s.priority
      })),
      schedule
    };
  }

  private static async generateAIPlan(request: StudyPlanRequest) {
    const daysUntilExam = Math.ceil(
      (request.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const prompt = `
Você é um especialista em planejamento de estudos para concursos públicos brasileiros. Crie um plano de estudos PRECISO e PERSONALIZADO com base nas informações fornecidas.

DADOS DO CONCURSO:
- Nome: ${request.examName}
- Data da prova: ${request.examDate.toLocaleDateString('pt-BR')} (${daysUntilExam} dias restantes)
- Horas disponíveis por dia: ${request.availableHoursPerDay}h
- Nível atual do candidato: ${request.currentLevel}
- Matérias: ${request.subjects.join(', ')}
${request.focusAreas ? `- Áreas de foco prioritário: ${request.focusAreas.join(', ')}` : ''}

INSTRUÇÕES ESPECÍFICAS:
1. Calcule o tempo total disponível: ${daysUntilExam} dias × ${request.availableHoursPerDay}h = ${daysUntilExam * request.availableHoursPerDay}h
2. Reserve 20% do tempo para revisões finais
3. Distribua as matérias considerando:
   - Peso típico em concursos públicos brasileiros
   - Nível de dificuldade para o candidato (${request.currentLevel})
   - Áreas de foco mencionadas
   - Tempo necessário para dominar cada matéria

DISTRIBUIÇÃO RECOMENDADA PARA CONCURSOS PÚBLICOS:
- Direito Constitucional: 18-22% (alta incidência)
- Direito Administrativo: 20-25% (muito cobrado)
- Português: 12-18% (fundamental)
- Matemática/Raciocínio Lógico: 8-15% (depende do cargo)
- Conhecimentos Gerais: 8-12%
- Informática: 6-10%
- Outras matérias específicas: distribuir proporcionalmente

AJUSTES POR NÍVEL:
- Iniciante: +30% tempo para matérias básicas (Português, Constitucional)
- Intermediário: distribuição equilibrada
- Avançado: foco em matérias específicas e revisões

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "title": "Plano de Estudos - [Nome do Concurso]",
  "description": "Plano personalizado para [nível] com [X]h de estudos distribuídas estrategicamente até [data]",
  "totalHours": [número_total_calculado],
  "subjects": [
    {
      "name": "[Nome_exato_da_matéria]",
      "weight": [porcentagem_inteira_sem_%],
      "hours": [horas_calculadas_para_matéria],
      "difficulty": "easy|medium|hard",
      "priority": [1-5_baseado_na_importância]
    }
  ]
}

VALIDAÇÕES OBRIGATÓRIAS:
- A soma dos weights deve ser 100
- A soma das hours deve corresponder a 80% do tempo total (20% para revisões)
- Cada matéria deve ter pelo menos 5% do tempo
- Prioridade 5: matérias mais cobradas, 1: menos cobradas
`;

    const response = await AIService.generateSummary(prompt, {
      type: 'detailed',
      tone: 'formal',
      language: 'pt-BR'
    });

    try {
      const aiPlan = JSON.parse(response);
      
      // Validar e corrigir o plano gerado pela IA
      return this.validateAndCorrectAIPlan(aiPlan, request);
    } catch (error) {
      console.warn('Erro ao parsear resposta da IA, usando fallback:', error);
      return this.generateFallbackPlan(request);
    }
  }

  private static validateAndCorrectAIPlan(aiPlan: any, request: StudyPlanRequest) {
    const daysUntilExam = Math.ceil(
      (request.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalAvailableHours = daysUntilExam * request.availableHoursPerDay;
    const studyHours = Math.floor(totalAvailableHours * 0.8); // 80% para estudos

    // Validar estrutura básica
    if (!aiPlan || !aiPlan.subjects || !Array.isArray(aiPlan.subjects)) {
      return this.generateFallbackPlan(request);
    }

    // Filtrar apenas matérias solicitadas
    const validSubjects = aiPlan.subjects.filter(subject => 
      request.subjects.some(reqSubject => 
        subject.name.toLowerCase().includes(reqSubject.toLowerCase()) ||
        reqSubject.toLowerCase().includes(subject.name.toLowerCase())
      )
    );

    if (validSubjects.length === 0) {
      return this.generateFallbackPlan(request);
    }

    // Recalcular pesos para somar 100%
    const totalWeight = validSubjects.reduce((sum, subject) => sum + (subject.weight || 0), 0);
    if (totalWeight === 0) {
      return this.generateFallbackPlan(request);
    }

    const correctedSubjects = validSubjects.map(subject => {
      const normalizedWeight = Math.round((subject.weight / totalWeight) * 100);
      const hours = Math.floor((studyHours * normalizedWeight) / 100);
      
      return {
        name: subject.name,
        weight: normalizedWeight,
        hours: Math.max(hours, Math.floor(studyHours * 0.05)), // Mínimo 5% do tempo
        difficulty: this.validateDifficulty(subject.difficulty),
        priority: this.validatePriority(subject.priority, normalizedWeight)
      };
    });

    // Ajustar para garantir que a soma seja exatamente 100%
    const currentTotal = correctedSubjects.reduce((sum, s) => sum + s.weight, 0);
    if (currentTotal !== 100) {
      const diff = 100 - currentTotal;
      correctedSubjects[0].weight += diff;
      correctedSubjects[0].hours = Math.floor((studyHours * correctedSubjects[0].weight) / 100);
    }

    return {
      title: aiPlan.title || `Plano de Estudos - ${request.examName}`,
      description: aiPlan.description || `Plano personalizado para ${request.currentLevel} com ${studyHours}h de estudos distribuídas até ${request.examDate.toLocaleDateString('pt-BR')}`,
      totalHours: studyHours,
      subjects: correctedSubjects
    };
  }

  private static validateDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' {
    const validDifficulties = ['easy', 'medium', 'hard'];
    return validDifficulties.includes(difficulty) ? difficulty as any : 'medium';
  }

  private static validatePriority(priority: number, weight: number): number {
    // Se a prioridade não for válida, calcular baseada no peso
    if (!priority || priority < 1 || priority > 5) {
      if (weight >= 20) return 5;
      if (weight >= 15) return 4;
      if (weight >= 10) return 3;
      if (weight >= 5) return 2;
      return 1;
    }
    return Math.max(1, Math.min(5, Math.round(priority)));
  }

  private static generateFallbackPlan(request: StudyPlanRequest) {
    const daysUntilExam = Math.ceil(
      (request.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalHours = Math.floor(daysUntilExam * request.availableHoursPerDay * 0.8);

    // Pesos mais precisos baseados em análise de editais reais
    const subjectWeights = {
      'Direito Constitucional': 20,
      'Direito Administrativo': 22,
      'Português': 15,
      'Língua Portuguesa': 15,
      'Matemática': 12,
      'Raciocínio Lógico': 10,
      'Conhecimentos Gerais': 8,
      'Atualidades': 8,
      'Informática': 8,
      'Noções de Informática': 8,
      'Direito Civil': 15,
      'Direito Penal': 15,
      'Direito Processual': 12,
      'Direito Tributário': 12,
      'Administração Pública': 10,
      'Contabilidade': 12,
      'Economia': 10,
      'Estatística': 8
    };

    // Ajustar pesos baseado no nível do usuário
    const levelMultipliers = {
      beginner: { basic: 1.3, advanced: 0.7 },
      intermediate: { basic: 1.0, advanced: 1.0 },
      advanced: { basic: 0.8, advanced: 1.2 }
    };

    const basicSubjects = ['Português', 'Língua Portuguesa', 'Matemática', 'Conhecimentos Gerais'];
    const multiplier = levelMultipliers[request.currentLevel];

    let subjects = request.subjects.map(subject => {
      let weight = subjectWeights[subject] || Math.floor(100 / request.subjects.length);
      
      // Ajustar peso baseado no nível
      if (basicSubjects.includes(subject)) {
        weight = Math.round(weight * multiplier.basic);
      } else {
        weight = Math.round(weight * multiplier.advanced);
      }

      // Aumentar peso para áreas de foco
      if (request.focusAreas?.includes(subject)) {
        weight = Math.round(weight * 1.2);
      }

      return {
        name: subject,
        weight,
        hours: 0, // Será calculado depois
        difficulty: this.getSubjectDifficulty(subject, request.currentLevel),
        priority: weight > 15 ? 5 : weight > 12 ? 4 : weight > 8 ? 3 : weight > 5 ? 2 : 1
      };
    });

    // Normalizar pesos para somar 100%
    const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0);
    subjects = subjects.map(subject => ({
      ...subject,
      weight: Math.round((subject.weight / totalWeight) * 100)
    }));

    // Calcular horas baseado nos pesos normalizados
    subjects = subjects.map(subject => ({
      ...subject,
      hours: Math.floor((totalHours * subject.weight) / 100)
    }));

    return {
      title: `Plano de Estudos - ${request.examName}`,
      description: `Plano personalizado para nível ${request.currentLevel} com ${totalHours}h de estudos distribuídas estrategicamente até ${request.examDate.toLocaleDateString('pt-BR')}`,
      totalHours,
      subjects
    };
  }

  private static getSubjectDifficulty(subject: string, level: string): 'easy' | 'medium' | 'hard' {
    const difficultyMap = {
      beginner: {
        'Português': 'medium',
        'Língua Portuguesa': 'medium',
        'Matemática': 'hard',
        'Raciocínio Lógico': 'hard',
        'Conhecimentos Gerais': 'easy',
        'Informática': 'medium',
        'Direito Constitucional': 'medium',
        'Direito Administrativo': 'hard'
      },
      intermediate: {
        'Português': 'easy',
        'Língua Portuguesa': 'easy',
        'Matemática': 'medium',
        'Raciocínio Lógico': 'medium',
        'Conhecimentos Gerais': 'easy',
        'Informática': 'easy',
        'Direito Constitucional': 'medium',
        'Direito Administrativo': 'medium'
      },
      advanced: {
        'Português': 'easy',
        'Língua Portuguesa': 'easy',
        'Matemática': 'easy',
        'Raciocínio Lógico': 'easy',
        'Conhecimentos Gerais': 'easy',
        'Informática': 'easy',
        'Direito Constitucional': 'easy',
        'Direito Administrativo': 'medium'
      }
    };

    return difficultyMap[level]?.[subject] || 'medium';
  }

  private static async generateSchedule(planId: string, subjects: any[], request: StudyPlanRequest): Promise<ScheduleItem[]> {
    const schedule: ScheduleItem[] = [];
    const startDate = new Date();
    const endDate = request.examDate;
    const daysUntilExam = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular dias úteis (excluindo fins de semana)
    const workDays = this.calculateWorkDays(startDate, endDate);
    const dailyMinutes = request.availableHoursPerDay * 60;
    
    // Criar ciclos de estudo baseados na dificuldade e prioridade
    const studyCycles = this.createStudyCycles(subjects, workDays, dailyMinutes);
    
    let currentDay = 0;
    for (let day = 0; day < daysUntilExam && currentDay < workDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Pular fins de semana
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
      
      const daySchedule = this.generateDaySchedule(
        planId, 
        subjects, 
        currentDate, 
        dailyMinutes, 
        currentDay, 
        workDays,
        studyCycles
      );
      
      schedule.push(...daySchedule);
      currentDay++;
    }
    
    // Salvar cronograma no banco
    const { data: savedSchedule, error } = await supabase
      .from('study_schedule')
      .insert(schedule)
      .select();
    
    if (error) throw error;
    
    return savedSchedule.map(item => ({
      id: item.id,
      subjectId: item.subject_id,
      scheduledDate: new Date(item.scheduled_date),
      startTime: item.start_time,
      endTime: item.end_time,
      durationMinutes: item.duration_minutes,
      sessionType: item.session_type,
      topic: item.topic,
      completed: item.completed
    }));
  }

  private static calculateWorkDays(startDate: Date, endDate: Date): number {
    let workDays = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return workDays;
  }

  private static createStudyCycles(subjects: any[], workDays: number, dailyMinutes: number) {
    // Criar ciclos de estudo baseados na prioridade e dificuldade
    const cycles = [];
    const totalDays = workDays;
    const reviewPeriod = Math.max(7, Math.floor(totalDays * 0.2)); // 20% para revisões
    const studyPeriod = totalDays - reviewPeriod;
    
    // Fase 1: Estudo inicial (60% do tempo)
    const initialStudyDays = Math.floor(studyPeriod * 0.6);
    cycles.push({
      name: 'initial_study',
      startDay: 0,
      endDay: initialStudyDays,
      sessionType: 'study',
      focus: 'learning'
    });
    
    // Fase 2: Aprofundamento (30% do tempo)
    const deepStudyDays = Math.floor(studyPeriod * 0.3);
    cycles.push({
      name: 'deep_study',
      startDay: initialStudyDays,
      endDay: initialStudyDays + deepStudyDays,
      sessionType: 'practice',
      focus: 'application'
    });
    
    // Fase 3: Revisão intensiva (10% do tempo)
    cycles.push({
      name: 'intensive_review',
      startDay: initialStudyDays + deepStudyDays,
      endDay: studyPeriod,
      sessionType: 'review',
      focus: 'consolidation'
    });
    
    // Fase 4: Revisão final
    cycles.push({
      name: 'final_review',
      startDay: studyPeriod,
      endDay: totalDays,
      sessionType: 'review',
      focus: 'final_preparation'
    });
    
    return cycles;
  }

  private static generateDaySchedule(
    planId: string, 
    subjects: any[], 
    currentDate: Date, 
    dailyMinutes: number, 
    currentDay: number, 
    totalDays: number,
    cycles: any[]
  ) {
    const schedule = [];
    let remainingMinutes = dailyMinutes;
    
    // Determinar ciclo atual
    const currentCycle = cycles.find(cycle => 
      currentDay >= cycle.startDay && currentDay < cycle.endDay
    ) || cycles[0];
    
    // Ordenar matérias baseado no ciclo atual e progresso
    const sortedSubjects = this.sortSubjectsForDay(subjects, currentCycle, currentDay, totalDays);
    
    let currentTime = '09:00';
    
    for (const subject of sortedSubjects) {
      if (remainingMinutes <= 0) break;
      
      // Calcular duração da sessão baseada no ciclo e prioridade
      const sessionMinutes = this.calculateSessionDuration(
        subject, 
        currentCycle, 
        remainingMinutes, 
        sortedSubjects.length
      );
      
      if (sessionMinutes >= 25) { // Mínimo 25 minutos (técnica Pomodoro)
        const endTime = this.addMinutesToTime(currentTime, sessionMinutes);
        
        const scheduleItem = {
          plan_id: planId,
          subject_id: subject.id,
          scheduled_date: currentDate.toISOString().split('T')[0],
          start_time: currentTime,
          end_time: endTime,
          duration_minutes: sessionMinutes,
          session_type: currentCycle.sessionType,
          topic: this.generateSessionTopic(subject.subject_name, currentCycle),
          completed: false
        };
        
        schedule.push(scheduleItem);
        remainingMinutes -= sessionMinutes;
        
        // Adicionar intervalo de 5-15 minutos entre sessões
        const breakMinutes = sessionMinutes >= 60 ? 15 : 5;
        currentTime = this.addMinutesToTime(endTime, breakMinutes);
        remainingMinutes -= breakMinutes;
      }
    }
    
    return schedule;
  }

  private static sortSubjectsForDay(subjects: any[], cycle: any, currentDay: number, totalDays: number) {
    return [...subjects].sort((a, b) => {
      // Na fase inicial, priorizar matérias básicas
      if (cycle.name === 'initial_study') {
        return b.priority - a.priority;
      }
      
      // Na fase de aprofundamento, alternar entre difíceis e fáceis
      if (cycle.name === 'deep_study') {
        const aDifficulty = a.difficulty === 'hard' ? 3 : a.difficulty === 'medium' ? 2 : 1;
        const bDifficulty = b.difficulty === 'hard' ? 3 : b.difficulty === 'medium' ? 2 : 1;
        return currentDay % 2 === 0 ? bDifficulty - aDifficulty : aDifficulty - bDifficulty;
      }
      
      // Na revisão, priorizar por peso/importância
      return b.weight_percentage - a.weight_percentage;
    });
  }

  private static calculateSessionDuration(subject: any, cycle: any, remainingMinutes: number, totalSubjects: number): number {
    const baseMinutes = Math.floor(remainingMinutes / totalSubjects);
    
    // Ajustar baseado na dificuldade
    let multiplier = 1;
    if (subject.difficulty === 'hard') multiplier = 1.3;
    else if (subject.difficulty === 'easy') multiplier = 0.8;
    
    // Ajustar baseado no ciclo
    if (cycle.name === 'initial_study') multiplier *= 1.2;
    else if (cycle.name === 'final_review') multiplier *= 0.7;
    
    const sessionMinutes = Math.floor(baseMinutes * multiplier);
    
    // Limites mínimos e máximos
    return Math.max(25, Math.min(90, sessionMinutes));
  }

  private static generateSessionTopic(subjectName: string, cycle: any): string {
    const topicTemplates = {
      initial_study: `Fundamentos de ${subjectName}`,
      deep_study: `Prática e exercícios de ${subjectName}`,
      intensive_review: `Revisão intensiva de ${subjectName}`,
      final_review: `Revisão final de ${subjectName}`
    };
    
    return topicTemplates[cycle.name] || `Estudo de ${subjectName}`;
  }

  private static addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  static async getUserStudyPlans(userId: string): Promise<StudyPlan[]> {
    // Primeiro, buscar apenas os planos
    const { data: plans, error: plansError } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  
    if (plansError) throw plansError;
    if (!plans || plans.length === 0) return [];
  
    // Buscar matérias e cronogramas separadamente
    const planIds = plans.map(p => p.id);
    
    const { data: subjects } = await supabase
      .from('plan_subjects')
      .select('*')
      .in('plan_id', planIds);
  
    const { data: schedules } = await supabase
      .from('study_schedule')
      .select('*')
      .in('plan_id', planIds);
  
    return plans.map(plan => {
      const planSubjects = subjects?.filter(s => s.plan_id === plan.id) || [];
      const planSchedule = schedules?.filter(s => s.plan_id === plan.id) || [];
  
      return {
        id: plan.id,
        title: plan.title,
        description: plan.description,
        examName: plan.exam_name,
        examDate: new Date(plan.exam_date),
        totalStudyHours: plan.total_study_hours,
        dailyStudyHours: plan.daily_study_hours,
        subjects: planSubjects.map(s => ({
          id: s.id,
          subjectName: s.subject_name,
          weightPercentage: s.weight_percentage,
          estimatedHours: s.estimated_hours,
          completedHours: s.completed_hours || 0,
          difficulty: s.difficulty,
          priority: s.priority
        })),
        schedule: planSchedule.map(item => ({
          id: item.id,
          subjectId: item.subject_id,
          scheduledDate: new Date(item.scheduled_date),
          startTime: item.start_time,
          endTime: item.end_time,
          durationMinutes: item.duration_minutes,
          sessionType: item.session_type,
          topic: item.topic,
          completed: item.completed
        }))
      };
    });
  }

  static async updatePlanProgress(planId: string, subjectId: string, hoursStudied: number): Promise<void> {
    const { error } = await supabase
      .from('plan_subjects')
      .update({ 
        completed_hours: hoursStudied 
      })
      .eq('id', subjectId);
  
    if (error) throw error;
  }

  // Novo método para salvar sessão de estudo
  static async saveStudySession(sessionData: StudySessionData): Promise<void> {
    console.log('saveStudySession chamado com:', sessionData);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }
  
    const sessionPayload = {
      user_id: user.id,
      plan_id: sessionData.planId,
      subject_id: sessionData.subjectId,
      start_time: sessionData.startTime.toISOString(),
      end_time: sessionData.endTime.toISOString(),
      duration_minutes: sessionData.durationMinutes,
      session_type: sessionData.sessionType,
      notes: sessionData.notes
    };
    
    console.log('Payload da sessão:', sessionPayload);
  
    const { data, error } = await supabase
      .from('study_sessions')
      .insert(sessionPayload)
      .select();
  
    if (error) {
      console.error('Erro ao salvar sessão:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        payload: sessionPayload
      });
      throw error;
    }
    
    console.log('Sessão salva com sucesso:', data);
  }

  // Método atualizado para incrementar horas da matéria
  static async updateSubjectProgress(planId: string, subjectId: string, additionalHours: number): Promise<void> {
    console.log('updateSubjectProgress chamado com:', { planId, subjectId, additionalHours });
    
    try {
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }
      console.log('Usuário autenticado:', user.id);
      
      // Primeiro, buscar as horas atuais usando apenas o subjectId
      const { data: subject, error: fetchError } = await supabase
        .from('plan_subjects')
        .select('completed_hours, plan_id')
        .eq('id', subjectId)
        .single();
  
      if (fetchError) {
        console.error('Erro ao buscar matéria:', {
          error: fetchError,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code
        });
        throw fetchError;
      }
  
      if (!subject) {
        throw new Error(`Matéria não encontrada: subjectId=${subjectId}`);
      }
  
      // Verificar se a matéria pertence ao plano correto
      if (subject.plan_id !== planId) {
        throw new Error(`Matéria ${subjectId} não pertence ao plano ${planId}`);
      }
  
      const currentHours = subject.completed_hours || 0;
      // Manter o valor decimal original, arredondando apenas para 2 casas decimais
      const additionalHoursRounded = Math.round(additionalHours * 100) / 100;
      const newCompletedHours = Math.round((currentHours + additionalHoursRounded) * 100) / 100;
      
      // Validar se o valor é válido
      if (newCompletedHours < 0) {
        throw new Error('Horas completadas não podem ser negativas');
      }
      
      console.log('Atualizando horas:', { 
        current: currentHours, 
        additional: additionalHours,
        additionalRounded: additionalHoursRounded,
        new: newCompletedHours,
        type: typeof newCompletedHours
      });
  
      // Atualizar usando apenas o subjectId
      const { data: updateData, error: updateError } = await supabase
        .from('plan_subjects')
        .update({ 
          completed_hours: newCompletedHours
        })
        .eq('id', subjectId)
        .select();
  
      if (updateError) {
        console.error('Erro detalhado ao atualizar progresso:', {
          error: updateError,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          subjectId,
          newCompletedHours
        });
        throw updateError;
      }
      
      console.log('Progresso atualizado com sucesso:', updateData);
    } catch (error) {
      console.error('Erro em updateSubjectProgress:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        planId,
        subjectId,
        additionalHours
      });
      throw error;
    }
  }

  // Método para obter estatísticas de estudo por matéria
  static async getSubjectStudyStats(userId: string, subjectId: string): Promise<{
    totalSessions: number;
    totalHours: number;
    averageSessionDuration: number;
    lastStudyDate: Date | null;
  }> {
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('duration_minutes, start_time')
      .eq('user_id', userId)
      .eq('subject_id', subjectId)
      .order('start_time', { ascending: false });

    if (error) throw error;

    if (!sessions || sessions.length === 0) {
      return {
        totalSessions: 0,
        totalHours: 0,
        averageSessionDuration: 0,
        lastStudyDate: null
      };
    }

    const totalMinutes = sessions.reduce((sum, session) => sum + session.duration_minutes, 0);
    const totalHours = totalMinutes / 60;
    const averageSessionDuration = totalMinutes / sessions.length;
    const lastStudyDate = new Date(sessions[0].start_time);

    return {
      totalSessions: sessions.length,
      totalHours,
      averageSessionDuration,
      lastStudyDate
    };
  }

  static async generateStudyPlanFromEdital(editalFile: File): Promise<StudyPlan> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // 1. Extrair texto do PDF do edital
      const editalContent = await DocumentService.extractTextFromFile(editalFile);
      
      if (editalContent.length < 500) {
        throw new Error('Edital muito curto ou não foi possível extrair o conteúdo');
      }

      // 2. Analisar edital com IA
      const editalAnalysis = await AIService.analyzeEdital(editalContent);
      
      // 3. Converter análise para StudyPlanRequest
      const studyPlanRequest: StudyPlanRequest = {
        examName: editalAnalysis.concursoNome,
        examDate: editalAnalysis.dataProva ? new Date(editalAnalysis.dataProva) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias se não especificado
        availableHoursPerDay: parseInt(editalAnalysis.horasEstudoSugeridas) || 4,
        currentLevel: 'intermediate',
        subjects: editalAnalysis.materias.map(m => m.nome),
        focusAreas: editalAnalysis.materias
          .filter(m => m.peso >= 4)
          .map(m => m.nome)
      };

      // 4. Gerar plano de estudos
      const studyPlan = await this.generateStudyPlan(studyPlanRequest);
      
      // 5. Salvar referência ao edital
      await this.saveEditalReference(studyPlan.id, editalFile, user.id, editalAnalysis);
      
      return studyPlan;
    } catch (error) {
      console.error('Error generating study plan from edital:', error);
      throw new Error('Erro ao gerar plano de estudos a partir do edital');
    }
  }

  private static async saveEditalReference(planId: string, editalFile: File, userId: string, analysis: any) {
    try {
      // Upload do edital para storage
      const editalUrl = await DocumentService.uploadFile(editalFile, userId);
      
      // Salvar documento do edital
      await DocumentService.createDocument({
        user_id: userId,
        title: `Edital - ${analysis.concursoNome}`,
        content: JSON.stringify(analysis),
        file_url: editalUrl,
        file_type: editalFile.type,
        file_size: editalFile.size,
        category: 'Edital',
        tags: ['edital', 'concurso', analysis.orgao].filter(Boolean)
      });
    } catch (error) {
      console.error('Error saving edital reference:', error);
      // Não falha o processo principal se não conseguir salvar a referência
    }
  }

  // Método para excluir plano de estudos
  static async deleteStudyPlan(planId: string): Promise<void> {
    try {
      // Verificar se o usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se o plano pertence ao usuário
      const { data: plan, error: planError } = await supabase
        .from('study_plans')
        .select('id, user_id')
        .eq('id', planId)
        .eq('user_id', user.id)
        .single();

      if (planError || !plan) {
        throw new Error('Plano de estudos não encontrado ou você não tem permissão para excluí-lo');
      }

      // Excluir o plano (as tabelas relacionadas serão excluídas automaticamente devido ao CASCADE)
      const { error: deleteError } = await supabase
        .from('study_plans')
        .delete()
        .eq('id', planId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Erro ao excluir plano de estudos:', deleteError);
        throw new Error('Erro ao excluir plano de estudos');
      }

      console.log('Plano de estudos excluído com sucesso:', planId);
    } catch (error) {
      console.error('Erro em deleteStudyPlan:', error);
      throw error;
    }
  }
}