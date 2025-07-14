import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { GeneratedDocument } from '@./shared-types';

// Helper function to generate descriptive filenames for ATS optimization
export function generateDescriptiveFilename(
  fullName: string,
  jobTitle: string,
  documentType: 'CV' | 'COVER_LETTER',
  year?: number
): string {
  const currentYear = year || new Date().getFullYear();
  
  // Clean and format the name (remove special characters, replace spaces with hyphens)
  const cleanName = fullName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Clean and format the job title
  const cleanJobTitle = jobTitle
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  // Create the filename based on document type
  const docType = documentType === 'CV' ? 'CV' : 'Lettre-Motivation';
  
  return `${cleanName}-${docType}-${cleanJobTitle}-${currentYear}`;
}

export async function generatePDF(content: string, fileName: string): Promise<Buffer> {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Apply single-page optimization for HTML content
    let htmlContent = content;
    if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html')) {
      // Inject additional single-page optimization CSS
      htmlContent = content.replace(
        '</style>',
        `
          /* SINGLE-PAGE PDF OPTIMIZATION OVERRIDES */
          @media print {
            * {
              margin: 0 !important;
              padding: 0 !important;
            }
            
            body {
              font-size: 10pt !important;
              line-height: 1.3 !important;
              margin: 0 !important;
              padding: 9mm !important;
            }
            
            .cv-container {
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              min-height: auto !important;
              max-height: 277mm !important;
              overflow: hidden !important;
            }
            
            .cv-header {
              margin-bottom: 8px !important;
              padding-bottom: 6px !important;
            }
            
            .full-name {
              font-size: 20pt !important;
              margin-bottom: 3px !important;
            }
            
            .current-title {
              font-size: 12pt !important;
              margin-bottom: 5px !important;
            }
            
            .cv-section {
              margin-bottom: 10px !important;
              page-break-inside: avoid !important;
            }
            
            .section-header {
              margin-bottom: 4px !important;
            }
            
            .section-title {
              font-size: 12pt !important;
              margin-bottom: 3px !important;
              padding-bottom: 2px !important;
            }
            
            .section-content {
              font-size: 10pt !important;
              line-height: 1.3 !important;
            }
            
            .summary-content {
              padding: 8px !important;
            }
            
            .experience-item, .education-item {
              margin-bottom: 8px !important;
              padding-bottom: 5px !important;
            }
            
            .job-title, .degree {
              font-size: 11pt !important;
              margin-bottom: 2px !important;
            }
            
            .company-name, .institution {
              margin-bottom: 1px !important;
            }
            
            .job-description {
              margin-top: 2px !important;
            }
            
            .contact-info {
              font-size: 9pt !important;
              padding: 3px !important;
              margin-bottom: 5px !important;
            }
            
            .skills-grid {
              gap: 4px !important;
            }
            
            .skill-item, .language-item {
              padding: 4px 8px !important;
              margin-bottom: 4px !important;
              font-size: 9pt !important;
            }
            
            ul {
              margin-left: 15px !important;
              margin-bottom: 5px !important;
            }
            
            li {
              margin-bottom: 2px !important;
              font-size: 10pt !important;
            }
            
            p {
              margin-bottom: 3px !important;
              font-size: 10pt !important;
            }
            
            h1, h2, h3 {
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
            
            .experience-section, .education-section, .skills-section {
              page-break-inside: avoid !important;
            }
            
            /* Allow content to flow naturally */
            .section-content {
              overflow: visible !important;
            }
          }
          
          @page {
            size: A4 !important;
            margin: 9mm !important;
          }
        </style>`
      );
    } else {
      // For markdown content, use optimized HTML template
      htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, Calibri, Helvetica, sans-serif;
            line-height: 1.3;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 9mm;
            font-size: 10pt;
          }
          
          h1 {
            color: #2c3e50;
            border-bottom: 1px solid #3498db;
            padding-bottom: 3px;
            margin-bottom: 6px;
            font-size: 16pt;
            margin-top: 0;
            page-break-after: avoid;
          }
          
          h2 {
            color: #34495e;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 2px;
            margin-top: 8px;
            margin-bottom: 4px;
            font-size: 12pt;
            page-break-after: avoid;
          }
          
          h3 {
            color: #2c3e50;
            margin-top: 4px;
            margin-bottom: 3px;
            font-size: 11pt;
            page-break-after: avoid;
          }
          
          p {
            margin-bottom: 3px;
            font-size: 10pt;
            line-height: 1.3;
          }
          
          ul {
            margin-left: 15px;
            margin-top: 2px;
            margin-bottom: 4px;
          }
          
          li {
            margin-bottom: 2px;
            font-size: 10pt;
            line-height: 1.3;
          }
          
          .contact-info {
            background: #ecf0f1;
            padding: 4px;
            border-radius: 3px;
            margin-bottom: 6px;
            font-size: 9pt;
          }
          
          .skills {
            background: #f8f9fa;
            padding: 3px;
            border-left: 2px solid #3498db;
            margin: 3px 0;
            font-size: 9pt;
          }
          
          @page {
            size: A4;
            margin: 8mm;
          }
          
          @media print {
            body {
              max-height: 277mm;
              overflow: hidden;
            }
          }
        </style>
      </head>
      <body>
        ${markdownToHTML(content)}
      </body>
      </html>
    `;
    }
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for content to render properly
    await page.evaluateHandle('document.fonts.ready');
    
    // Calculate content height and adjust scale if needed
    const contentHeight = await page.evaluate(() => {
      // Get the actual content height more accurately
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });
    
    // More accurate A4 calculations with proper margins
    const maxA4Height = 279; // mm (297mm - 18mm margins)
    const pixelsPerMm = 3.779527559; // More precise conversion (96 DPI)
    const maxHeightPixels = maxA4Height * pixelsPerMm;
    
    // Conservative scaling - only scale if content significantly exceeds page height
    let scale = 1.0;
    const threshold = maxHeightPixels * 0.92; // 8% buffer for better layout
    
    if (contentHeight > threshold) {
      // More conservative scaling - maintain readability
      const rawScale = maxHeightPixels / contentHeight;
      scale = Math.max(0.88, Math.min(0.99, rawScale)); // Scale range: 88%-99%
      console.log(`Content height ${contentHeight}px exceeds threshold ${threshold}px, scaling to ${scale}`);
    } else {
      console.log(`Content height ${contentHeight}px fits within page, no scaling needed`);
    }
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '9mm',
        right: '9mm',
        bottom: '9mm',
        left: '9mm'
      },
      preferCSSPageSize: true,
      scale: scale, // Use calculated scale (minimum 85%)
      displayHeaderFooter: false,
      omitBackground: false,
      pageRanges: '1' // Ensure only first page is generated
    });
    
    console.log(`Generated PDF with scale: ${scale} for content height: ${contentHeight}px`);
    
    return Buffer.from(pdf);
    
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function generateDOCX(content: string, _fileName: string): Promise<Buffer> {
  // Convert HTML to text if needed, otherwise use as markdown
  const textContent = content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html') 
    ? htmlToText(content)
    : content;
  
  // Parse the content and create proper DOCX document
  const paragraphs = parseContentToParagraphs(textContent);
  
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
  
  // Simple regex for **bold** and *italic*
  const boldRegex = /\*\*(.*?)\*\*/g;
  const italicRegex = /\*(.*?)\*/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
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

function htmlToText(html: string): string {
  return html
    // Remove script and style tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    
    // Convert headers to markdown
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
    
    // Convert formatting
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    
    // Convert lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '* $1\n')
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    
    // Convert paragraphs and line breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
    
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, '')
    
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    
    // Decode HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function markdownToHTML(markdown: string): string {
  return markdown
    // Remove horizontal rule separators (---) first
    .replace(/^-{3,}$/gm, '')
    .replace(/\n\n\n+/g, '\n\n')
    
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
    .replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gs, '<ul>$1</ul>')
    
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