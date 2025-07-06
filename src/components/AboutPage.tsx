import { Brain, Zap, Shield, Users, Target, Award, CheckCircle, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: <Brain className="w-8 h-8 text-blue-500" />,
      title: "IA Avançada",
      description: "Algoritmos de última geração para análise e síntese de conteúdo complexo"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Processamento Rápido",
      description: "Resumos gerados em segundos, economizando horas de estudo"
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Segurança Total",
      description: "Seus documentos são protegidos com criptografia de ponta"
    },
    {
      icon: <Users className="w-8 h-8 text-purple-500" />,
      title: "Comunidade Ativa",
      description: "Mais de 50.000 concurseiros já aprovados usando nossa plataforma"
    }
  ];

  const benefits = [
    "Redução de 70% no tempo de revisão",
    "Aumento de 85% na retenção de conteúdo",
    "Resumos personalizados para seu perfil",
    "Organização automática por matérias",
    "Acesso offline aos seus resumos",
    "Suporte técnico especializado"
  ];

  const testimonials = [
    {
      name: "Ana Carolina",
      role: "Aprovada em Tribunal de Justiça",
      content: "O Aprova.AI foi fundamental na minha aprovação. Consegui revisar todo o conteúdo em metade do tempo!",
      rating: 5
    },
    {
      name: "Ricardo Santos",
      role: "Aprovado em Receita Federal",
      content: "A qualidade dos resumos é impressionante. A IA realmente entende o que é mais importante para concursos.",
      rating: 5
    },
    {
      name: "Marina Oliveira",
      role: "Aprovada em Polícia Civil",
      content: "Nunca pensei que estudar poderia ser tão eficiente. Recomendo para todos os concurseiros!",
      rating: 5
    }
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Sobre o <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Aprova.AI</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Desenvolvemos a mais avançada plataforma de estudos com Inteligência Artificial 
              para transformar a forma como os concurseiros se preparam para suas aprovações.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Nossa Missão
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Democratizar o acesso a uma educação de qualidade, oferecendo ferramentas 
                  tecnológicas que otimizam o tempo de estudo e maximizam a retenção de conhecimento. 
                  Acreditamos que todo candidato merece ter as melhores condições para alcançar seus objetivos.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Por que Escolher o Aprova.AI?
                </h2>
                <div className="space-y-3">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-600">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Target className="w-8 h-8" />
                    <h3 className="text-xl font-semibold">Nossa Visão</h3>
                  </div>
                  <p className="leading-relaxed">
                    Ser a principal plataforma de estudos com IA do Brasil, 
                    ajudando milhares de candidatos a conquistarem suas aprovações 
                    de forma mais eficiente e inteligente.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">50K+</div>
                      <div className="text-sm opacity-90">Usuários Ativos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-1">15K+</div>
                      <div className="text-sm opacity-90">Aprovações</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Tecnologia de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Ponta</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Recursos avançados desenvolvidos especificamente para maximizar seu desempenho nos estudos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group text-center">
                <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-8 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="mb-6 flex justify-center transform group-hover:scale-110 transition-transform duration-200">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Histórias de <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Sucesso</span>
            </h2>
            <p className="text-xl text-gray-600">
              Veja o que nossos usuários aprovados têm a dizer
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
                <div className="mb-6">
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Award key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 leading-relaxed italic">
                    "{testimonial.content}"
                  </p>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Nossa <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Jornada</span>
            </h2>
            <p className="text-xl text-gray-600">
              A evolução constante para servir melhor nossa comunidade
            </p>
          </div>

          <div className="space-y-8">
            {[
              {
                year: "2023",
                title: "Início do Projeto",
                description: "Primeira versão com funcionalidades básicas de resumo"
              },
              {
                year: "2024",
                title: "IA Avançada",
                description: "Implementação de algoritmos de processamento de linguagem natural"
              },
              {
                year: "2024",
                title: "50.000 Usuários",
                description: "Alcançamos a marca de 50 mil usuários ativos na plataforma"
              },
              {
                year: "2025",
                title: "Recursos Premium",
                description: "Lançamento de funcionalidades avançadas e personalização completa"
              }
            ].map((milestone, index) => (
              <div key={index} className="flex items-center space-x-6">
                <div className="flex-shrink-0 w-20 text-center">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {milestone.year}
                  </div>
                </div>
                <div className="flex-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-gray-600">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pronto para Transformar seus Estudos?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Junte-se à nossa comunidade e descubra como a IA pode acelerar sua aprovação
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2">
            <span>Começar Agora</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
}