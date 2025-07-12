import puppeteer from 'puppeteer';
import { GeneratedDocument } from '@./shared-types';

export async function generatePDF(content: string, fileName: string): Promise<Buffer> {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Create HTML content for CV
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          h2 {
            color: #34495e;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          h3 {
            color: #2c3e50;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          p {
            margin-bottom: 12px;
          }
          ul {
            margin-left: 20px;
          }
          li {
            margin-bottom: 5px;
          }
          .contact-info {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
          }
          .skills {
            background: #f8f9fa;
            padding: 10px;
            border-left: 4px solid #3498db;
          }
        </style>
      </head>
      <body>
        ${markdownToHTML(content)}
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    return pdf;
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export function generateDOCX(content: string, fileName: string): Buffer {
  // For now, we'll use a simple HTML to DOCX conversion
  // In a production environment, you'd want to use a proper library like docx
  
  const htmlContent = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.15;
          margin: 1in;
        }
        h1 { font-size: 16pt; font-weight: bold; margin-bottom: 12pt; }
        h2 { font-size: 14pt; font-weight: bold; margin-bottom: 10pt; margin-top: 18pt; }
        h3 { font-size: 12pt; font-weight: bold; margin-bottom: 8pt; margin-top: 12pt; }
        p { margin-bottom: 6pt; }
        .header { text-align: left; margin-bottom: 24pt; }
        .date { margin-bottom: 12pt; }
        .subject { font-weight: bold; margin-bottom: 12pt; }
      </style>
    </head>
    <body>
      ${markdownToHTML(content)}
    </body>
    </html>
  `;
  
  // Convert HTML to RTF (Rich Text Format) which can be opened by Word
  const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ${htmlContent.replace(/<[^>]*>/g, '').replace(/\n/g, '\\par ')}}`;
  
  return Buffer.from(rtfContent, 'utf-8');
}

function markdownToHTML(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    
    // Wrap in paragraphs
    .replace(/^(?!<[hul])/gm, '<p>')
    .replace(/(?<![>])$/gm, '</p>')
    
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
    .replace(/(<\/[hul]>)<\/p>/g, '$1');
}