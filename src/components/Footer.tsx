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
    { name: 'GitHub', icon: <Github className="w-5 h-5" />, url: 'https://github.com/SaeedX302' },
    { name: 'Twitter', icon: <Twitter className="w-5 h-5" />, url: 'https://x.com/saeedx300' },
    { name: 'Instagram', icon: <Instagram className="w-5 h-5" />, url: 'https://www.instagram.com/saeedxdie' },
    { name: 'Telegram', icon: <MessageCircle className="w-5 h-5" />, url: 'https://t.me/saeedxdie' },
    { name: 'TikTok', icon: <Music className="w-5 h-5" />, url: 'https://www.tiktok.com/@saeedxdie' },
    { name: 'YouTube', icon: <Youtube className="w-5 h-5" />, url: 'https://www.youtube.com/@TsunMusicOfficial' }
  ];

  const platformLinks = [
    { name: 'Linktree Portfolio', url: 'https://linktr.ee/saeedxdie' },
    { name: 'Gravatar WorldWide Profile', url: 'https://gravatar.com/cheerfuld27b01881a' },
    { name: 'TSunGpt - 2', url: 'https://tsungpt2.vercel.app/' },
    { name: 'TikTok Video Downloader By TSun Studio', url: 'https://tsuntiktokdownloder.vercel.app/' },
    { name: 'TikTok Video Downloader 2', url: 'https://tiktokdownloade.vercel.app/' },
    { name: 'TikTok Video Downloade 3', url: 'https://tiktokdownloder.vercel.app/' },
    { name: 'Tsun | YOUTUBE DOWNLOADER', url: 'https://tsun-yt-downloder.vercel.app/' },
    { name: 'Facebook video downloader', url: 'https://facebookvideodownloader2.vercel.app' }
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
          <div className="md:col-span-2">
            <h4 className="text-lg font-semibold mb-6 text-white">Outras Plataformas</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {platformLinks.map((platform, index) => (
                <a
                  key={index}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-gray-300 hover:text-blue-300 transition-colors duration-200 group p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 text-sm"
                >
                  <LinkIcon className="w-4 h-4 flex-shrink-0 group-hover:text-blue-400" />
                  <span className="truncate">{platform.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-12"></div>

        {/* Credits Section */}
        <div className="text-center space-y-4">
          <div className="bg-gradient-to-r from-gray-800/50 to-purple-800/50 rounded-2xl p-8 border border-gray-700">
            <div className="space-y-3">
              <p className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Credits To °【〆༯𝙎ค૯𝙀𝘿】✘,【.ISHU.】
              </p>
              <p className="text-xl font-bold text-yellow-400">
                Won This World
              </p>
              <p className="text-red-400 font-medium">
                If You Don't Then Go And Die
              </p>
              <p className="text-lg font-semibold bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">
                By -- 〆༯𝙎ค૯𝙀𝘿✘🌹
              </p>
            </div>
          </div>

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