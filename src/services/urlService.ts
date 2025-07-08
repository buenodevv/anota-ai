export interface UrlContent {
  title: string;
  content: string;
  url: string;
  domain: string;
  wordCount: number;
}

export class UrlService {
  private static readonly CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
  ];
  
  static async extractContentFromUrl(url: string): Promise<UrlContent> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('URL inválida. Por favor, insira uma URL válida.');
    }

    let lastError: Error | null = null;
    
    // Try each proxy until one works
    for (let i = 0; i < this.CORS_PROXIES.length; i++) {
      try {
        const proxy = this.CORS_PROXIES[i];
        console.log(`Tentando proxy ${i + 1}/${this.CORS_PROXIES.length}: ${proxy}`);
        
        const htmlContent = await this.fetchWithProxy(url, proxy);
        
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
        
        console.log(`Sucesso com proxy ${i + 1}: ${proxy}`);
        
        return {
          title,
          content,
          url,
          domain,
          wordCount
        };
        
      } catch (error) {
        console.error(`Erro com proxy ${i + 1} (${this.CORS_PROXIES[i]}):`, error);
        lastError = error instanceof Error ? error : new Error('Erro desconhecido');
        
        // Continue to next proxy
        continue;
      }
    }
    
    // If all proxies failed, throw the last error
    throw new Error(`Todos os proxies falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
  }
  
  private static async fetchWithProxy(url: string, proxy: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      let proxyUrl: string;
      let response: Response;
      
      if (proxy.includes('allorigins.win')) {
        proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.contents || '';
        
      } else if (proxy.includes('corsproxy.io')) {
        proxyUrl = `${proxy}${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl, {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
        
      } else {
        // For other proxies, append URL directly
        proxyUrl = `${proxy}${url}`;
        response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.text();
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Timeout: A requisição demorou muito para responder');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
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