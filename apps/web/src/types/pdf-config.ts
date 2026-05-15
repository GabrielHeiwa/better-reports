export interface PdfConfig {
  format: 'A4' | 'A3' | 'Letter' | 'Legal'
  landscape: boolean
  marginTop: string
  marginRight: string
  marginBottom: string
  marginLeft: string
  filename: string
}

export const DEFAULT_PDF_CONFIG: PdfConfig = {
  format: 'A4',
  landscape: false,
  marginTop: '1cm',
  marginRight: '1cm',
  marginBottom: '1cm',
  marginLeft: '1cm',
  filename: 'report',
}
