export type FileCategory =
  | 'Invoices'
  | 'Receipts'
  | 'Images'
  | 'Documents'
  | 'Code'
  | 'Spreadsheets'
  | 'Presentations'
  | 'Videos'
  | 'Audio'
  | 'Archives'
  | 'Other';

export interface OrganizedFile {
  id: string;
  name: string;
  category: FileCategory;
  size: number;
  type: string;
  handle?: FileSystemFileHandle;
}
