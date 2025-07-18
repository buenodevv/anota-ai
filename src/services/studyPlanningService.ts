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
    const prompt = `
Crie um plano de estudos detalhado para o concurso "${request.examName}" com as seguintes especificações:

- Data da prova: ${request.examDate.toLocaleDateString('pt-BR')}
- Horas disponíveis por dia: ${request.availableHoursPerDay}h
- Nível atual: ${request.currentLevel}
- Matérias: ${request.subjects.join(', ')}
${request.focusAreas ? `- Áreas de foco: ${request.focusAreas.join(', ')}` : ''}

Retorne um JSON com a seguinte estrutura:
{
  "title": "Título do plano",
  "description": "Descrição detalhada",
  "totalHours": número_total_de_horas,
  "subjects": [
    {
      "name": "Nome da matéria",
      "weight": porcentagem_do_tempo,
      "hours": horas_estimadas,
      "difficulty": "easy|medium|hard",
      "priority": número_de_1_a_5
    }
  ]
}

Considere:
- Distribuição equilibrada baseada no peso das matérias no edital
- Tempo para revisões (20% do tempo total)
- Dificuldade progressiva
- Intervalos e descanso
`;

    const response = await AIService.generateSummary(prompt, {
      type: 'detailed',
      tone: 'formal',
      language: 'pt-BR'
    });

    try {
      return JSON.parse(response);
    } catch {
      // Fallback se a IA não retornar JSON válido
      return this.generateFallbackPlan(request);
    }
  }

  private static generateFallbackPlan(request: StudyPlanRequest) {
    const daysUntilExam = Math.ceil(
      (request.examDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalHours = daysUntilExam * request.availableHoursPerDay * 0.8; // 80% para estudos efetivos

    const subjectWeights = {
      'Direito Constitucional': 20,
      'Direito Administrativo': 25,
      'Português': 15,
      'Matemática': 10,
      'Raciocínio Lógico': 10,
      'Conhecimentos Gerais': 10,
      'Informática': 10
    };

    const subjects = request.subjects.map(subject => {
      const weight = subjectWeights[subject] || Math.floor(100 / request.subjects.length);
      return {
        name: subject,
        weight,
        hours: Math.floor((totalHours * weight) / 100),
        difficulty: 'medium' as const,
        priority: weight > 15 ? 5 : weight > 10 ? 3 : 1
      };
    });

    return {
      title: `Plano de Estudos - ${request.examName}`,
      description: `Plano personalizado com ${totalHours}h de estudos distribuídas até ${request.examDate.toLocaleDateString('pt-BR')}`,
      totalHours,
      subjects
    };
  }

  private static async generateSchedule(planId: string, subjects: any[], request: StudyPlanRequest): Promise<ScheduleItem[]> {
    const schedule: ScheduleItem[] = [];
    const startDate = new Date();
    const endDate = request.examDate;
    const daysUntilExam = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Distribuir sessões de estudo ao longo dos dias
    for (let day = 0; day < daysUntilExam; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Pular fins de semana se necessário
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
      
      const dailyMinutes = request.availableHoursPerDay * 60;
      let remainingMinutes = dailyMinutes;
      
      // Distribuir matérias no dia baseado na prioridade
      const sortedSubjects = [...subjects].sort((a, b) => b.priority - a.priority);
      
      for (const subject of sortedSubjects) {
        if (remainingMinutes <= 0) break;
        
        const sessionMinutes = Math.min(
          Math.floor(remainingMinutes / sortedSubjects.length),
          90 // Máximo 90 minutos por sessão
        );
        
        if (sessionMinutes >= 30) { // Mínimo 30 minutos
          const scheduleItem = {
            plan_id: planId,
            subject_id: subject.id,
            scheduled_date: currentDate.toISOString().split('T')[0],
            start_time: '09:00',
            end_time: this.addMinutesToTime('09:00', sessionMinutes),
            duration_minutes: sessionMinutes,
            session_type: 'study' as const,
            topic: `Estudo de ${subject.subject_name}`,
            completed: false
          };
          
          schedule.push(scheduleItem);
          remainingMinutes -= sessionMinutes;
        }
      }
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
      .eq('id', subjectId)
      .eq('plan_id', planId);

    if (error) throw error;
  }

  // Novo método para salvar sessão de estudo
  static async saveStudySession(sessionData: StudySessionData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        plan_id: sessionData.planId,
        subject_id: sessionData.subjectId,
        start_time: sessionData.startTime.toISOString(),
        end_time: sessionData.endTime.toISOString(),
        duration_minutes: sessionData.durationMinutes,
        session_type: sessionData.sessionType,
        notes: sessionData.notes
      });

    if (error) throw error;
  }

  // Método atualizado para incrementar horas da matéria
  static async updateSubjectProgress(planId: string, subjectId: string, additionalHours: number): Promise<void> {
    // Primeiro, buscar as horas atuais
    const { data: subject, error: fetchError } = await supabase
      .from('plan_subjects')
      .select('completed_hours')
      .eq('id', subjectId)
      .eq('plan_id', planId)
      .single();

    if (fetchError) throw fetchError;

    const newCompletedHours = (subject.completed_hours || 0) + additionalHours;

    const { error } = await supabase
      .from('plan_subjects')
      .update({ 
        completed_hours: newCompletedHours
      })
      .eq('id', subjectId)
      .eq('plan_id', planId);

    if (error) throw error;
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
}