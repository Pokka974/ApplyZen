import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
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
      },
      preferCSSPageSize: true
    });
    
    return Buffer.from(pdf);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateDOCX(content: string, fileName: string): Promise<Buffer> {
  // Parse the content and create proper DOCX document
  const paragraphs = parseContentToParagraphs(content);
  
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });
  
  return await Packer.toBuffer(doc);
}

function parseContentToParagraphs(content: string): Paragraph[] {
  const lines = content.split('\n');
  const paragraphs: Paragraph[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Add empty paragraph for spacing
      paragraphs.push(new Paragraph({
        children: [new TextRun("")],
        spacing: { after: 200 }
      }));
      continue;
    }
    
    // Handle headers
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({
          text: line.substring(2),
          bold: true,
          size: 32
        })],
        spacing: { after: 200, before: 200 }
      }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({
          text: line.substring(3),
          bold: true,
          size: 28
        })],
        spacing: { after: 200, before: 200 }
      }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({
          text: line.substring(4),
          bold: true,
          size: 24
        })],
        spacing: { after: 200, before: 200 }
      }));
    } else if (line.startsWith('**') && line.endsWith('**')) {
      // Bold text
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: line.substring(2, line.length - 2),
          bold: true
        })],
        spacing: { after: 120 }
      }));
    } else if (line.startsWith('*') && line.endsWith('*')) {
      // Italic text
      paragraphs.push(new Paragraph({
        children: [new TextRun({
          text: line.substring(1, line.length - 1),
          italics: true
        })],
        spacing: { after: 120 }
      }));
    } else {
      // Regular paragraph - handle inline formatting
      const textRuns = parseInlineFormatting(line);
      paragraphs.push(new Paragraph({
        children: textRuns,
        spacing: { after: 120 },
        alignment: line.includes('@') || line.includes('|') ? AlignmentType.LEFT : AlignmentType.JUSTIFIED
      }));
    }
  }
  
  return paragraphs;
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let currentText = text;
  
  // Simple regex for **bold** and *italic*
  const boldRegex = /\*\*(.*?)\*\*/g;
  const italicRegex = /\*(.*?)\*/g;
  
  let lastIndex = 0;
  let match;
  
  // Handle bold text
  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.substring(lastIndex, match.index)));
    }
    runs.push(new TextRun({
      text: match[1],
      bold: true
    }));
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    
    // Check for italic in remaining text
    lastIndex = 0;
    while ((match = italicRegex.exec(remainingText)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun(remainingText.substring(lastIndex, match.index)));
      }
      runs.push(new TextRun({
        text: match[1],
        italics: true
      }));
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < remainingText.length) {
      runs.push(new TextRun(remainingText.substring(lastIndex)));
    }
  }
  
  // If no formatting found, return simple text run
  if (runs.length === 0) {
    runs.push(new TextRun(text));
  }
  
  return runs;
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