import { supabase } from '../lib/supabase';
import { AIService } from './aiService';

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
    const { data: plans, error } = await supabase
      .from('study_plans')
      .select(`
        *,
        plan_subjects(*),
        study_schedule(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return plans.map(plan => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      examName: plan.exam_name,
      examDate: new Date(plan.exam_date),
      totalStudyHours: plan.total_study_hours,
      dailyStudyHours: plan.daily_study_hours,
      subjects: plan.plan_subjects.map(s => ({
        id: s.id,
        subjectName: s.subject_name,
        weightPercentage: s.weight_percentage,
        estimatedHours: s.estimated_hours,
        completedHours: s.completed_hours,
        difficulty: s.difficulty,
        priority: s.priority
      })),
      schedule: plan.study_schedule.map(item => ({
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
    }));
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
}