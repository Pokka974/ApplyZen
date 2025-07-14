import OpenAI from 'openai';
import { UserProfile } from '@./shared-types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 1500;
const TEMPERATURE = 0.1;

export async function parseCVWithAI(cvText: string): Promise<Partial<UserProfile>> {
  const prompt = createCVParsingPrompt(cvText);
  
  console.log('Sending CV parsing request to OpenAI API...');
  console.log('CV text length:', cvText.length);
  console.log('Model:', DEFAULT_MODEL);
  
  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert at parsing CVs and extracting structured information. Always respond with valid JSON only, no additional text.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE
  });

  console.log('OpenAI API response status: success');

  const jsonResponse = response.choices[0]?.message?.content;
  if (!jsonResponse) {
    throw new Error('No content generated from OpenAI API');
  }
  
  console.log('AI Raw response:', jsonResponse);
  
  try {
    // Clean the response in case it has markdown formatting
    let cleanResponse = jsonResponse.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/```\s*$/, '');
    }
    
    console.log('Cleaned response:', cleanResponse);
    const parsedData = JSON.parse(cleanResponse);
    
    // Validate and clean the parsed data
    return validateAndCleanParsedData(parsedData);
    
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', jsonResponse);
    console.error('Parse error:', e);
    throw new Error('Invalid response format from AI');
  }
}

function createCVParsingPrompt(cvText: string): string {
  return `
Extract and structure the following information from this CV text. Return the data as a JSON object with the exact structure shown below.

CV TEXT:
${cvText}

Please extract and return a JSON object with this exact structure:
{
  "fullName": "",
  "email": "",
  "phone": "",
  "location": "",
  "address": "",
  "currentTitle": "",
  "experience": "", // Choose from: "0-1", "1-3", "3-5", "5-10", "10+"
  "skills": "", // Comma-separated list of technical skills
  "summary": "", // Professional summary or objective
  "education": "", // Main degree or education
  "languages": "", // Languages spoken
  "experiences": [
    {
      "jobTitle": "",
      "company": "",
      "startDate": "", // Format: YYYY-MM
      "endDate": "", // Format: YYYY-MM or empty for current
      "responsibilities": "" // Main responsibilities and achievements
    }
  ]
}

Guidelines:
- Extract exact information from the CV
- For experience level, leave empty - it will be calculated from work history
- For dates, convert to YYYY-MM format
- If information is not found or uncertain, use empty string
- Include ALL work experiences found
- Be precise and concise
- For address, only extract if a complete address is clearly provided, otherwise leave empty
- For location, extract city and country only if clearly stated
- For skills, focus on technical/professional skills
- For summary, extract or create a concise professional summary
- IMPORTANT: Only fill fields with confident, relevant information. Leave uncertain data empty.
`;
}

function validateAndCleanParsedData(data: any): Partial<UserProfile> {
  // Validate and clean experiences first
  const experiences = validateExperiences(data.experiences);
  
  // Calculate experience level from work history
  const calculatedExperience = calculateExperienceFromHistory(experiences);
  
  // Clean and filter out irrelevant data
  const cleanedData: Partial<UserProfile> = {
    fullName: cleanString(data.fullName),
    email: cleanString(data.email),
    phone: cleanString(data.phone),
    location: cleanString(data.location),
    address: cleanString(data.address),
    currentTitle: cleanString(data.currentTitle),
    experience: calculatedExperience,
    skills: cleanString(data.skills),
    summary: cleanString(data.summary),
    education: cleanString(data.education),
    languages: cleanString(data.languages),
    experiences: experiences
  };

  return cleanedData;
}

function cleanString(value: any): string {
  if (!value || typeof value !== 'string') return '';
  
  const cleaned = value.trim();
  
  // Filter out clearly irrelevant data
  if (cleaned.length < 2) return '';
  if (/^\d{5}$/.test(cleaned)) return ''; // Just a zipcode
  if (/^[A-Z]{2,3}$/.test(cleaned)) return ''; // Just state abbreviation
  
  return cleaned;
}

function calculateExperienceFromHistory(experiences: UserProfile['experiences']): UserProfile['experience'] {
  if (!experiences || experiences.length === 0) {
    return '0-1';
  }

  let totalMonths = 0;
  const currentDate = new Date();

  for (const exp of experiences) {
    if (!exp.startDate) continue;

    try {
      const startDate = new Date(exp.startDate + '-01');
      let endDate: Date;

      if (exp.endDate) {
        endDate = new Date(exp.endDate + '-01');
      } else {
        // Current job
        endDate = currentDate;
      }

      if (startDate && endDate) {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                      (endDate.getMonth() - startDate.getMonth());
        totalMonths += Math.max(0, months);
      }
    } catch (error) {
      console.warn('Error calculating experience for:', exp);
    }
  }

  const totalYears = totalMonths / 12;

  if (totalYears < 1) return '0-1';
  if (totalYears < 3) return '1-3';
  if (totalYears < 5) return '3-5';
  if (totalYears < 10) return '5-10';
  return '10+';
}


function validateExperiences(experiences: any): UserProfile['experiences'] {
  if (!Array.isArray(experiences)) {
    return [];
  }

  return experiences.map(exp => ({
    jobTitle: String(exp.jobTitle || ''),
    company: String(exp.company || ''),
    startDate: String(exp.startDate || ''),
    endDate: String(exp.endDate || ''),
    responsibilities: String(exp.responsibilities || '')
  })).filter(exp => exp.jobTitle || exp.company); // Filter out empty experiences
}