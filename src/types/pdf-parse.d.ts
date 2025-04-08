declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: Record<string, any>;
    metadata: Record<string, any>;
    version: string;
    filename?: string;
  }

  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: {
    pagerender?: (pageData: any) => string | null;
    max?: number;
    version?: string;
  }): Promise<PDFData>;

  export = pdfParse;
} 