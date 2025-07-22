import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import HomePage from './components/HomePage';
import UploadPage from './components/UploadPage';
import LibraryPage from './components/LibraryPage';
import AboutPage from './components/AboutPage';
import StudyPlanningPage from './components/StudyPlanningPage';
import Footer from './components/Footer';

function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onPageChange={setCurrentPage} />;
      case 'upload':
        return <UploadPage onPageChange={setCurrentPage} />;
      case 'library':
        return <LibraryPage />;
      case 'planning':
        return <StudyPlanningPage />;
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage onPageChange={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="pt-20">
        {renderPage()}
      </main>
      <Footer />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;