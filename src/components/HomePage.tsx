import { Upload, FileText, Zap, Shield, ArrowRight, Star, Users, Clock } from 'lucide-react';

interface HomePageProps {
  onPageChange: (page: string) => void;
}

export default function HomePage({ onPageChange }: HomePageProps) {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "IA Avançada",
      description: "Tecnologia de ponta para resumos inteligentes e compreensivos"
    },
    {
      icon: <FileText className="w-8 h-8 text-blue-500" />,
      title: "Múltiplos Formatos",
      description: "Suporte para PDF, DOCX e TXT com processamento otimizado"
    },
    {
      icon: <Shield className="w-8 h-8 text-green-500" />,
      title: "Privacidade Total",
      description: "Seus documentos são seguros e confidenciais"
    }
  ];

  const stats = [
    { number: "50K+", label: "Documentos Processados" },
    { number: "15K+", label: "Estudantes Aprovados" },
    { number: "99%", label: "Satisfação dos Usuários" },
    { number: "24/7", label: "Disponibilidade" }
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-200/50">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">Mais de 15.000 aprovações</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Transforme Estudos
              </span>
              <br />
              <span className="text-gray-800">em Aprovações</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Inteligência Artificial que transforma materiais complexos em resumos claros, 
              otimizados para <span className="font-semibold text-blue-600">máxima retenção</span> e <span className="font-semibold text-purple-600">aprovação garantida</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <button 
                onClick={() => onPageChange('upload')}
                className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2"
              >
                <Upload className="w-5 h-5 group-hover:animate-bounce" />
                <span>Começar Agora</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
              
              <button 
                onClick={() => onPageChange('about')}
                className="bg-white/70 backdrop-blur-sm text-gray-700 px-8 py-4 rounded-xl text-lg font-semibold border border-gray-200/50 hover:bg-white hover:shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                Saiba Mais
              </button>
            </div>

            {/* Trust indicators */}
            <div className="pt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-500" />
                <span>100% Seguro</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>50.000+ Usuários</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <span>Disponível 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.number}
                  </div>
                  <div className="text-gray-600 text-sm md:text-base mt-2">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Tecnologia que <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Aprova</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Recursos avançados desenvolvidos especificamente para concurseiros
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100">
                <div className="mb-6 transform group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600">
              Três passos simples para revolucionar seus estudos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload do Material",
                description: "Faça upload dos seus PDFs, DOCXs ou TXTs de forma simples e segura"
              },
              {
                step: "02", 
                title: "Processamento IA",
                description: "Nossa IA avançada analisa e extrai os pontos mais importantes do conteúdo"
              },
              {
                step: "03",
                title: "Estude e Aprove",
                description: "Receba resumos otimizados e organize sua biblioteca de estudos"
              }
            ].map((item, index) => (
              <div key={index} className="relative group">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-gray-100 group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                  <div className="text-6xl font-bold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {item.title}
                  </h3>
                  <p className="text-gray-600">
                    {item.description}
                  </p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-gray-300" />
                  </div>
                )}
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
            Junte-se a milhares de estudantes que já revolucionaram sua forma de estudar
          </p>
          <button 
            onClick={() => onPageChange('upload')}
            className="bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Começar Gratuitamente</span>
          </button>
        </div>
      </section>
    </div>
  );
}