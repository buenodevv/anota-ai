export interface SummaryOptions {
  type: 'short' | 'medium' | 'detailed' | 'study_guide';
  tone: 'formal' | 'casual' | 'simple';
  language: 'pt-BR';
}

export class AIService {
  private static readonly API_URL = 'https://api.openai.com/v1/chat/completions';
  
  static async generateSummary(content: string, options: SummaryOptions): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Chave da API OpenAI não configurada');
    }

    // Validate content length
    if (content.length < 100) {
      throw new Error('Conteúdo muito curto para gerar resumo');
    }

    // Truncate content if too long (GPT-4 has token limits)
    const maxContentLength = 15000; // Increased for study guide
    const truncatedContent = content.length > maxContentLength 
      ? content.substring(0, maxContentLength) + '...'
      : content;

    const prompt = this.buildPrompt(truncatedContent, options);

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(options.type)
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.getMaxTokens(options.type),
          temperature: 0.3,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro na API OpenAI: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content;
      
      if (!summary) {
        throw new Error('Resposta vazia da API OpenAI');
      }

      return summary.trim();
    } catch (error) {
      console.error('Error generating summary:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API')) {
          throw new Error(`Erro na geração do resumo: ${error.message}`);
        }
        throw error;
      }
      
      throw new Error('Erro desconhecido ao gerar resumo');
    }
  }

  private static getSystemPrompt(type: SummaryOptions['type']): string {
    if (type === 'study_guide') {
      return `Você é um especialista em Técnica de Estudos e seu papel é me ajudar a preparar para uma prova. 

SUAS CARACTERÍSTICAS:
1. EXPERTISE: Conhecimento profundo em técnicas de memorização e aprendizagem
2. METODOLOGIA: Especialista em criar guias de estudos estruturados
3. DIDÁTICA: Transforma conteúdo complexo em material de estudo eficiente
4. PRECISÃO: Mantém exatidão técnica e foco em concursos públicos
5. ORGANIZAÇÃO: Estrutura informações para máxima retenção

DIRETRIZES OBRIGATÓRIAS:
- Analise o documento e crie um guia de estudos detalhado
- Use formatação Markdown para organização clara
- Foque no que é mais relevante para provas e concursos
- Mantenha linguagem clara e objetiva
- Destaque informações críticas que frequentemente aparecem em provas
- Use exemplos práticos quando apropriado`;
    }

    return `Assuma o papel de um colega de estudos que está me ajudando a revisar a matéria, normalmente para concursos públicos brasileiros. Suas características:

1. EXPERTISE: Conhecimento profundo em todas as matérias de concursos públicos
2. CLAREZA: Transforma conteúdo complexo em linguagem acessível
3. ESTRUTURA: Organiza informações de forma lógica e memorável
4. PRECISÃO: Mantém a exatidão técnica e jurídica
5. FOCO: Destaca o que é mais relevante para provas

DIRETRIZES OBRIGATÓRIAS:
- Comece me dando uma visão geral do que o documento aborda em um único parágrafo
- Use formatação Markdown para organização
- Seu objetivo é me ensinar os fundamentos do documento de forma clara e estruturada
- Quero que você crie um guia de estudos baseado nos pontos-chave do texto
- Simplifique termos técnicos sem perder precisão
- Mantenha uma linguagem simples e clara
- Use exemplos quando apropriado
- Use analogias e exemplos do dia a dia quando possível
- Use frases simples e objetivas
- Use palavras-chave relevantes para concursos
- Organize em tópicos hierárquicos
- Destaque informações frequentes em provas
- Mantenha linguagem clara e objetiva`;
  }

  private static buildPrompt(content: string, options: SummaryOptions): string {
    const toneInstructions = {
      formal: 'Use linguagem técnica e formal, apropriada para concursos públicos. Mantenha terminologia jurídica e administrativa precisa.',
      casual: 'Use linguagem clara e acessível, mas mantenha a precisão técnica. Explique termos complexos de forma simples.',
      simple: 'Explique como se fosse para alguém que está começando a estudar o assunto. Use analogias e exemplos do dia a dia quando possível.'
    };

    const typeInstructions = {
      short: `Crie um resumo CURTO e direto:
- Máximo 10 pontos principais em bullet points
- Foque apenas no essencial
- Use frases concisas e objetivas
- Ideal para revisão rápida`,

      medium: `Crie um resumo MÉDIO conceitual:
- Organize em 3-5 tópicos principais
- Explique conceitos de forma clara
- Inclua definições importantes
- Mantenha estrutura lógica
- Ideal para estudo regular`,

      detailed: `Crie um resumo DETALHADO e estruturado:
- Organize em tópicos e subtópicos
- Inclua definições, exemplos e aplicações
- Mantenha hierarquia clara (##, ###)
- Destaque pontos importantes com **negrito**
- Inclua observações e dicas para provas
- Ideal para estudo aprofundado`,

      study_guide: `Crie um GUIA DE ESTUDOS COMPLETO seguindo EXATAMENTE esta estrutura:

## 📋 Resumo Estruturado
[Um resumo dos principais tópicos, seguindo a ordem do documento]

## 🎯 Pontos-Chave
[Lista em bullet points com as informações mais críticas, como:]
- Datas importantes
- Definições essenciais
- Artigos de lei relevantes
- Fórmulas importantes
- Conceitos que frequentemente aparecem em provas

## 📚 Glossário
[Defina os 5 termos técnicos mais relevantes mencionados no formato:]
**Termo 1:** Definição clara e concisa
**Termo 2:** Definição clara e concisa
[...continue até 5 termos]

## ❓ Questões de Revisão
[Elabore 5 perguntas dissertativas baseadas no conteúdo que poderiam cair na prova:]

**1. [Pergunta dissertativa]**
*Resposta:* [Resposta concisa e completa]

**2. [Pergunta dissertativa]**
*Resposta:* [Resposta concisa e completa]

[...continue até 5 questões]

IMPORTANTE: Siga EXATAMENTE esta estrutura com os emojis e formatação indicados.`
    };

    if (options.type === 'study_guide') {
      return `
TAREFA: Criar um guia de estudos detalhado para preparação de prova

${typeInstructions[options.type]}

TOM: ${toneInstructions[options.tone]}

INSTRUÇÕES ESPECÍFICAS:
- Analise o documento completamente
- Identifique os conceitos mais importantes para concursos
- Destaque definições que frequentemente aparecem em provas
- Crie questões que realmente poderiam cair na prova
- Use formatação Markdown apropriada
- Mantenha foco no que é cobrado em concursos públicos
- Seja específico e detalhado em cada seção

CONTEÚDO PARA ANALISAR:
${content}

GUIA DE ESTUDOS:
      `;
    }

    return `
TAREFA: Criar um resumo de alta qualidade para concurso público

TIPO DE RESUMO: ${typeInstructions[options.type]}

TOM: ${toneInstructions[options.tone]}

INSTRUÇÕES ESPECÍFICAS:
- Identifique os conceitos mais importantes para concursos
- Destaque definições que frequentemente aparecem em provas
- Organize de forma que facilite memorização
- Use formatação Markdown apropriada
- Mantenha foco no que é cobrado em concursos públicos

CONTEÚDO PARA RESUMIR:
${content}

RESUMO:
    `;
  }

  private static getMaxTokens(type: SummaryOptions['type']): number {
    switch (type) {
      case 'short': return 800;
      case 'medium': return 1500;
      case 'detailed': return 2500;
      case 'study_guide': return 4000; // Increased for comprehensive study guide
      default: return 1500;
    }
  }

  static async categorizeDocument(content: string): Promise<string> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      return this.fallbackCategorization(content);
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em categorização de materiais para concursos públicos brasileiros.'
            },
            {
              role: 'user',
              content: `Analise o texto abaixo e categorize-o em UMA das seguintes categorias de concursos públicos:

CATEGORIAS DISPONÍVEIS:
- Direito Constitucional
- Direito Administrativo  
- Direito Civil
- Direito Penal
- Direito Processual
- Direito Tributário
- Português
- Matemática
- Raciocínio Lógico
- Informática
- Conhecimentos Gerais
- Atualidades
- Administração Pública
- Contabilidade
- Economia
- Estatística
- Geografia
- História
- Legislação Específica
- Outros

Responda APENAS com o nome da categoria, sem explicações.

TEXTO:
${content.substring(0, 2000)}...`
            }
          ],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const category = data.choices[0]?.message?.content?.trim();
        return category || this.fallbackCategorization(content);
      }
    } catch (error) {
      console.error('Error categorizing document:', error);
    }
    
    return this.fallbackCategorization(content);
  }

  private static fallbackCategorization(content: string): string {
    const categories = {
      'Direito Constitucional': ['constituição', 'constitucional', 'direitos fundamentais', 'princípios constitucionais', 'poder constituinte'],
      'Direito Administrativo': ['administração pública', 'servidor público', 'licitação', 'contrato administrativo', 'ato administrativo'],
      'Direito Civil': ['código civil', 'pessoa física', 'pessoa jurídica', 'contratos', 'responsabilidade civil'],
      'Direito Penal': ['código penal', 'crime', 'contravenção', 'pena', 'processo penal'],
      'Português': ['gramática', 'concordância', 'regência', 'ortografia', 'redação', 'interpretação de texto'],
      'Matemática': ['equação', 'função', 'geometria', 'álgebra', 'trigonometria'],
      'Raciocínio Lógico': ['lógica', 'proposição', 'silogismo', 'sequência', 'padrão'],
      'Informática': ['computador', 'software', 'hardware', 'internet', 'sistema operacional'],
      'Conhecimentos Gerais': ['história do brasil', 'geografia', 'atualidades', 'política'],
      'Administração Pública': ['gestão pública', 'planejamento', 'organização', 'controle'],
      'Contabilidade': ['balanço', 'demonstração', 'ativo', 'passivo', 'patrimônio']
    };

    const contentLower = content.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      const matchCount = keywords.filter(keyword => contentLower.includes(keyword)).length;
      if (matchCount >= 2) {
        return category;
      }
    }
    
    // Single keyword match
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        return category;
      }
    }
    
    return 'Outros';
  }

  static async extractTags(content: string): Promise<string[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      return this.fallbackTagExtraction(content);
    }

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você extrai tags relevantes de textos para concursos públicos.'
            },
            {
              role: 'user',
              content: `Extraia 3-7 tags relevantes do texto abaixo. As tags devem ser:
- Palavras-chave importantes para concursos
- Conceitos principais do texto
- Termos que facilitam busca e organização

Responda apenas com as tags separadas por vírgula, sem numeração.

TEXTO:
${content.substring(0, 1500)}...`
            }
          ],
          max_tokens: 100,
          temperature: 0.2,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const tagsText = data.choices[0]?.message?.content?.trim();
        if (tagsText) {
          return tagsText.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, 7);
        }
      }
    } catch (error) {
      console.error('Error extracting tags:', error);
    }
    
    return this.fallbackTagExtraction(content);
  }

  private static fallbackTagExtraction(content: string): string[] {
    const commonTerms = [
      'princípios', 'conceitos', 'definições', 'lei', 'artigo', 'direito',
      'administração', 'público', 'servidor', 'concurso', 'prova', 'questão',
      'constituição', 'código', 'norma', 'regulamento', 'decreto', 'portaria',
      'processo', 'procedimento', 'competência', 'atribuição', 'responsabilidade'
    ];

    const contentLower = content.toLowerCase();
    const foundTags = commonTerms.filter(term => contentLower.includes(term));
    
    return foundTags.slice(0, 5);
  }

  static async analyzeEdital(editalContent: string): Promise<EditalAnalysis> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('Chave da API OpenAI não configurada');
    }

    const prompt = `
Analise o edital de concurso abaixo e extraia as seguintes informações em formato JSON:

{
  "concursoNome": "Nome do concurso",
  "orgao": "Órgão responsável",
  "cargo": "Cargo principal",
  "dataProva": "Data da prova (formato YYYY-MM-DD se disponível)",
  "materias": [
    {
      "nome": "Nome da matéria",
      "peso": "Peso/importância (1-5)",
      "topicos": ["tópico1", "tópico2"]
    }
  ],
  "horasEstudoSugeridas": "Número de horas diárias sugeridas",
  "nivelDificuldade": "easy|medium|hard",
  "observacoes": "Observações importantes sobre o edital"
}

EDITAL:
${editalContent.substring(0, 8000)}...
    `;

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Você é um especialista em análise de editais de concursos públicos brasileiros. Extraia informações precisas e estruturadas.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro na API OpenAI: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0]?.message?.content;
      
      if (!analysisText) {
        throw new Error('Resposta vazia da API OpenAI');
      }

      try {
        return JSON.parse(analysisText);
      } catch {
        // Fallback se não conseguir parsear JSON
        return this.fallbackEditalAnalysis(editalContent);
      }
    } catch (error) {
      console.error('Error analyzing edital:', error);
      throw new Error('Erro ao analisar edital com IA');
    }
  }

  private static fallbackEditalAnalysis(content: string): EditalAnalysis {
    const contentLower = content.toLowerCase();
    
    // Detectar matérias comuns
    const commonSubjects = [
      'direito constitucional', 'direito administrativo', 'direito civil',
      'direito penal', 'português', 'matemática', 'raciocínio lógico',
      'informática', 'conhecimentos gerais', 'atualidades'
    ];
    
    const foundSubjects = commonSubjects
      .filter(subject => contentLower.includes(subject))
      .map(subject => ({
        nome: subject.charAt(0).toUpperCase() + subject.slice(1),
        peso: 3,
        topicos: []
      }));

    return {
      concursoNome: 'Concurso Público',
      orgao: 'Órgão Público',
      cargo: 'Cargo Público',
      dataProva: '',
      materias: foundSubjects.length > 0 ? foundSubjects : [
        { nome: 'Português', peso: 4, topicos: [] },
        { nome: 'Conhecimentos Gerais', peso: 3, topicos: [] }
      ],
      horasEstudoSugeridas: '4',
      nivelDificuldade: 'medium',
      observacoes: 'Análise automática do edital'
    };
  }
}

export interface EditalAnalysis {
  concursoNome: string;
  orgao: string;
  cargo: string;
  dataProva: string;
  materias: {
    nome: string;
    peso: number;
    topicos: string[];
  }[];
  horasEstudoSugeridas: string;
  nivelDificuldade: 'easy' | 'medium' | 'hard';
  observacoes: string;
}