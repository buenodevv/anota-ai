import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
// Removed pdfConfig import to avoid top-level await issues

type Document = Database['public']['Tables']['documents']['Row'];
type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

export class DocumentService {
  static async uploadFile(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file);

    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  static async extractTextFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        try {
          let text = '';
          
          if (file.type === 'application/pdf') {
            // For PDF files, we'll implement a basic text extraction
            // In production, you'd want to use a proper PDF parsing library
            text = await this.extractTextFromPDF(arrayBuffer);
          } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            // For DOCX files, we'll use mammoth
            const mammoth = await import('mammoth');
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
          } else if (file.type === 'text/plain') {
            // For TXT files
            text = new TextDecoder('utf-8').decode(arrayBuffer);
          } else {
            throw new Error('Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.');
          }
          
          if (!text || text.trim().length < 50) {
            throw new Error('Não foi possível extrair texto suficiente do arquivo. Verifique se o arquivo contém texto legível.');
          }
          
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static async extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
    console.log('🔍 Iniciando extração de PDF, tamanho do buffer:', arrayBuffer.byteLength);
    
    try {
      console.log('🔍 Starting PDF text extraction...');
      
      // Dynamic import of PDF.js
      console.log('⚙️ Loading PDF.js...');
      const pdfjsModule = await import('pdfjs-dist');
      const pdfjsLib = pdfjsModule.default || pdfjsModule;
      
      // Configure worker with correct unpkg path
       pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.mjs';
      
      console.log('📄 Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableFontFace: true,
        useSystemFonts: true,
        stopAtErrors: false
      });
      
      const pdf = await loadingTask.promise;
      console.log(`📊 PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          console.log(`📖 Processing page ${pageNum}/${pdf.numPages}...`);
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
          console.log(`✅ Page ${pageNum} processed successfully`);
        } catch (pageError) {
          console.error(`❌ Error processing page ${pageNum}:`, pageError);
          // Continue with other pages
        }
      }
      
      console.log(`📝 Raw text extracted (${fullText.length} characters)`);
      console.log('🧹 Cleaning and validating text...');
      
      // Clean and validate the extracted text
      const cleanedText = fullText.trim();
      console.log(`📏 Final text length: ${cleanedText.length} characters`);
      
      if (cleanedText.length > 0) {
        console.log(`📄 First 200 characters: ${cleanedText.substring(0, 200)}...`);
        console.log('✅ PDF text extraction completed successfully');
        return cleanedText;
      } else {
        console.log('⚠️ No text found in PDF');
        throw new Error('No text content found in PDF');
      }
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  static async createDocument(documentData: DocumentInsert): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateDocument(id: string, updates: DocumentUpdate): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .update({ is_favorite: isFavorite })
      .eq('id', id);

    if (error) throw error;
  }
}