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
- For experience level, estimate based on work history
- For dates, convert to YYYY-MM format
- If information is not found, use empty string
- Include ALL work experiences found
- Be precise and concise
- For address, extract full address if available
- For location, extract city and country
- For skills, focus on technical/professional skills
- For summary, extract or create a concise professional summary
`;
}

function validateAndCleanParsedData(data: any): Partial<UserProfile> {
  // Ensure all required fields are strings
  const cleanedData: Partial<UserProfile> = {
    fullName: String(data.fullName || ''),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    location: String(data.location || ''),
    address: String(data.address || ''),
    currentTitle: String(data.currentTitle || ''),
    experience: validateExperienceLevel(data.experience),
    skills: String(data.skills || ''),
    summary: String(data.summary || ''),
    education: String(data.education || ''),
    languages: String(data.languages || ''),
    experiences: validateExperiences(data.experiences)
  };

  return cleanedData;
}

function validateExperienceLevel(experience: any): UserProfile['experience'] {
  const validLevels: UserProfile['experience'][] = ['0-1', '1-3', '3-5', '5-10', '10+'];
  
  if (typeof experience === 'string' && validLevels.includes(experience as UserProfile['experience'])) {
    return experience as UserProfile['experience'];
  }
  
  // Default to '1-3' if invalid
  return '1-3';
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