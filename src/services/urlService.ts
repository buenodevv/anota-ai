export interface UrlContent {
  title: string;
  content: string;
  url: string;
  domain: string;
  wordCount: number;
}

export class UrlService {
  private static readonly CORS_PROXY = 'https://api.allorigins.win/get?url=';
  
  static async extractContentFromUrl(url: string): Promise<UrlContent> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('URL inválida. Por favor, insira uma URL válida.');
    }

    try {
      // Use CORS proxy to fetch content
      const proxyUrl = `${this.CORS_PROXY}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao acessar a URL: ${response.status}`);
      }

      const data = await response.json();
      const htmlContent = data.contents;
      
      if (!htmlContent) {
        throw new Error('Não foi possível obter o conteúdo da página.');
      }

      // Parse HTML and extract text content
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style, nav, footer, header, aside');
      scripts.forEach(el => el.remove());
      
      // Extract title
      const titleElement = doc.querySelector('title');
      const title = titleElement?.textContent?.trim() || 'Sem título';
      
      // Extract main content
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main',
        'article', 
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '#content',
        '.main-content'
      ];
      
      let mainContent = null;
      for (const selector of contentSelectors) {
        mainContent = doc.querySelector(selector);
        if (mainContent) break;
      }
      
      // If no main content found, use body
      if (!mainContent) {
        mainContent = doc.querySelector('body');
      }
      
      if (mainContent) {
        // Extract text from paragraphs, headings, and lists
        const textElements = mainContent.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, div');
        const textParts: string[] = [];
        
        textElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 20) { // Filter out very short texts
            textParts.push(text);
          }
        });
        
        content = textParts.join('\n\n');
      }
      
      // Clean up content
      content = this.cleanContent(content);
      
      if (content.length < 100) {
        throw new Error('Conteúdo extraído é muito curto. A página pode não ter conteúdo textual suficiente.');
      }
      
      const domain = new URL(url).hostname;
      const wordCount = content.split(/\s+/).length;
      
      return {
        title,
        content,
        url,
        domain,
        wordCount
      };
      
    } catch (error) {
      console.error('Error extracting content from URL:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Erro desconhecido ao extrair conteúdo da URL.');
    }
  }
  
  private static isValidUrl(string: string): boolean {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
  
  private static cleanContent(content: string): string {
    return content
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove multiple line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim
      .trim();
  }
  
  static async createDocumentFromUrl(
    url: string, 
    userId: string, 
    options: {
      summaryType: 'short' | 'medium' | 'detailed';
      tone: 'formal' | 'casual' | 'simple';
      autoCategory: boolean;
    }
  ): Promise<any> {
    // This method will be implemented to integrate with DocumentService
    // and create a document from URL content
    const urlContent = await this.extractContentFromUrl(url);
    
    return {
      ...urlContent,
      processingOptions: options
    };
  }
}