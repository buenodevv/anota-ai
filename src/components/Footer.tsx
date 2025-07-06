import { 
  Github, 
  Twitter, 
  Instagram, 
  MessageCircle, 
  Music, 
  Youtube,
  ExternalLink,
  Heart,
  Link as LinkIcon
} from 'lucide-react';

export default function Footer() {
  const socialLinks = [
    { name: 'GitHub', icon: <Github className="w-5 h-5" />, url: 'https://github.com/buenodevv' },
    { name: 'Instagram', icon: <Instagram className="w-5 h-5" />, url: 'https://www.instagram.com/rodrigojbueno' },
   
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Aprova.AI</h3>
                <p className="text-sm text-blue-200">Estude com IA</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">
              Transformando a forma como os concurseiros estudam através da Inteligência Artificial.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Heart className="w-4 h-4 text-red-400" />
              <span>Feito com amor para concurseiros</span>
            </div>
          </div>

          {/* Social Links */}
          <div className="md:col-span-1">
            <h4 className="text-lg font-semibold mb-6 text-white">Redes Sociais</h4>
            <div className="space-y-4">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors duration-200 group"
                >
                  <div className="p-2 bg-gray-800 rounded-lg group-hover:bg-blue-600 transition-colors duration-200">
                    {link.icon}
                  </div>
                  <span className="text-sm font-medium">{link.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-12"></div>

        {/* Credits Section */}
        <div className="text-center space-y-4">

          {/* Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 text-gray-400 text-sm">
            <p>© 2025 Aprova.AI. Todos os direitos reservados.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-white transition-colors duration-200">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Termos</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Suporte</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}