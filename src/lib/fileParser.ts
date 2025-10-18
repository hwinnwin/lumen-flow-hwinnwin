// File parser utilities for extracting text from various file types

export const SUPPORTED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', label: 'PDF' },
  'application/msword': { ext: '.doc', label: 'Word (DOC)' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', label: 'Word (DOCX)' },
  'text/plain': { ext: '.txt', label: 'Text' },
  'text/rtf': { ext: '.rtf', label: 'Rich Text' },
  'application/rtf': { ext: '.rtf', label: 'Rich Text' },
  'application/vnd.oasis.opendocument.text': { ext: '.odt', label: 'OpenDocument Text' },
  
  // Spreadsheets
  'application/vnd.ms-excel': { ext: '.xls', label: 'Excel (XLS)' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', label: 'Excel (XLSX)' },
  'text/csv': { ext: '.csv', label: 'CSV' },
  'application/vnd.oasis.opendocument.spreadsheet': { ext: '.ods', label: 'OpenDocument Spreadsheet' },
  
  // Data/Config
  'application/json': { ext: '.json', label: 'JSON' },
  'application/xml': { ext: '.xml', label: 'XML' },
  'text/xml': { ext: '.xml', label: 'XML' },
  'application/x-yaml': { ext: '.yaml', label: 'YAML' },
  'text/yaml': { ext: '.yaml', label: 'YAML' },
  
  // Text/Markdown
  'text/markdown': { ext: '.md', label: 'Markdown' },
  
  // Presentations
  'application/vnd.ms-powerpoint': { ext: '.ppt', label: 'PowerPoint (PPT)' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: '.pptx', label: 'PowerPoint (PPTX)' },
  'application/vnd.oasis.opendocument.presentation': { ext: '.odp', label: 'OpenDocument Presentation' },
};

export const isFileTypeSupported = (mimeType: string): boolean => {
  return mimeType in SUPPORTED_FILE_TYPES;
};

export const getFileTypeLabel = (mimeType: string): string => {
  return SUPPORTED_FILE_TYPES[mimeType as keyof typeof SUPPORTED_FILE_TYPES]?.label || 'Unknown';
};

export const parseTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const parseJSONFile = async (file: File): Promise<string> => {
  const text = await parseTextFile(file);
  try {
    const json = JSON.parse(text);
    return JSON.stringify(json, null, 2);
  } catch {
    return text;
  }
};

export const parseCSVFile = async (file: File): Promise<string> => {
  const text = await parseTextFile(file);
  const lines = text.split('\n');
  const preview = lines.slice(0, 10).join('\n');
  return `CSV File (${lines.length} rows)\n\nPreview:\n${preview}`;
};

export const parsePDFFile = async (file: File): Promise<string> => {
  // For PDF files, we'll need a library like pdf.js
  // For now, return a placeholder that indicates the file type
  return `PDF Document: ${file.name}\nSize: ${formatFileSize(file.size)}\n\nNote: Full text extraction from PDF requires additional processing. This file has been uploaded and will be analyzed by AI.`;
};

export const parseDocxFile = async (file: File): Promise<string> => {
  // For DOCX files, we'll need a library like mammoth
  // For now, return a placeholder
  return `Word Document: ${file.name}\nSize: ${formatFileSize(file.size)}\n\nNote: Full text extraction from DOCX requires additional processing. This file has been uploaded and will be analyzed by AI.`;
};

export const parseExcelFile = async (file: File): Promise<string> => {
  // For Excel files, we'll need a library like xlsx
  // For now, return a placeholder
  return `Excel Spreadsheet: ${file.name}\nSize: ${formatFileSize(file.size)}\n\nNote: Full data extraction from Excel requires additional processing. This file has been uploaded and will be analyzed by AI.`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const extractFileContent = async (file: File): Promise<string> => {
  const mimeType = file.type;
  
  try {
    // Text-based files
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return await parseTextFile(file);
    }
    
    // JSON
    if (mimeType === 'application/json') {
      return await parseJSONFile(file);
    }
    
    // CSV
    if (mimeType === 'text/csv') {
      return await parseCSVFile(file);
    }
    
    // XML/YAML
    if (mimeType.includes('xml') || mimeType.includes('yaml')) {
      return await parseTextFile(file);
    }
    
    // PDF
    if (mimeType === 'application/pdf') {
      return await parsePDFFile(file);
    }
    
    // Word documents
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return await parseDocxFile(file);
    }
    
    // Excel/Spreadsheets
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return await parseExcelFile(file);
    }
    
    // Default fallback
    return `${file.name}\nSize: ${formatFileSize(file.size)}\nType: ${getFileTypeLabel(mimeType)}\n\nThis file type will be analyzed by AI for categorization.`;
    
  } catch (error) {
    console.error('Error extracting file content:', error);
    return `Error extracting content from ${file.name}. File will be uploaded for AI analysis.`;
  }
};