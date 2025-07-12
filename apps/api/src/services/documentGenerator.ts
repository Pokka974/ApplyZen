import OpenAI from 'openai';
import {
  JobData,
  UserProfile,
  DocumentType,
  SupportedLanguage,
  GeneratedDocument,
  DocumentsResponse,
} from '@./shared-types';
import { getLanguageInstructions } from '../utils/languageDetection';

interface GenerateDocumentsParams {
  jobData: JobData;
  profile: UserProfile;
  type: DocumentType;
  language: SupportedLanguage;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.7;

export async function generateDocuments({
  jobData,
  profile,
  type,
  language,
}: GenerateDocumentsParams): Promise<DocumentsResponse> {
  const result: DocumentsResponse = {
    success: true,
  };

  try {
    if (type === 'cv' || type === 'both') {
      const cvContent = await generateCV(jobData, profile, language);
      result.cv = {
        content: cvContent,
        type: 'cv',
        language,
        wordCount: cvContent.split(' ').length,
        generatedAt: new Date().toISOString(),
      };
    }

    if (type === 'cover-letter' || type === 'both') {
      const coverLetterContent = await generateCoverLetter(
        jobData,
        profile,
        language
      );
      result.coverLetter = {
        content: coverLetterContent,
        type: 'cover-letter',
        language,
        wordCount: coverLetterContent.split(' ').length,
        generatedAt: new Date().toISOString(),
      };
    }

    return result;
  } catch (error) {
    console.error('Document generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

async function generateCV(
  jobData: JobData,
  profile: UserProfile,
  language: SupportedLanguage
): Promise<string> {
  const languageInstructions = getLanguageInstructions(language);
  const prompt = createCVPrompt(jobData, profile, languageInstructions);

  console.log(
    `Generating CV in ${language} for ${jobData.title} at ${jobData.company}`
  );

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: languageInstructions.systemMessage,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  if (!response.choices[0]?.message?.content) {
    throw new Error('No content generated from OpenAI API');
  }

  return response.choices[0].message.content;
}

async function generateCoverLetter(
  jobData: JobData,
  profile: UserProfile,
  language: SupportedLanguage
): Promise<string> {
  const languageInstructions = getLanguageInstructions(language);
  const prompt = createCoverLetterPrompt(
    jobData,
    profile,
    languageInstructions
  );

  console.log(
    `Generating cover letter in ${language} for ${jobData.title} at ${jobData.company}`
  );

  const coverLetterSystemMessage = languageInstructions.systemMessage.replace(
    'CV writer',
    'cover letter writer'
  );

  const response = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: coverLetterSystemMessage,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
  });

  if (!response.choices[0]?.message?.content) {
    throw new Error('No content generated from OpenAI API');
  }

  return response.choices[0].message.content;
}

function createCVPrompt(
  jobData: JobData,
  profile: UserProfile,
  languageInstructions: any
): string {
  return `
Create a highly personalized CV ${
    languageInstructions.cvInstruction
  } specifically tailored for this job offer. The CV should directly address the job requirements and showcase relevant experience.

JOB OFFER ANALYSIS:
- Position: ${jobData.title}
- Company: ${jobData.company}
- Location: ${jobData.location}
- Job Description: ${jobData.description}
- Work Type: ${jobData.contractTypes?.join(', ') || 'Not specified'}
- Company Sector: ${jobData.companySector || 'Not specified'}
- Company Size: ${jobData.companySize?.join(', ') || 'Not specified'}

CANDIDATE PROFILE:
- Name: ${profile.fullName}
- Email: ${profile.email}
- Phone: ${profile.phone}
- Location: ${profile.location}
- Current Title: ${profile.currentTitle}
- Experience Level: ${profile.experience}
- Technical Skills: ${profile.skills}
- Professional Summary: ${profile.summary}
- Education: ${profile.education}
- Languages: ${profile.languages}

WORK EXPERIENCE:
${
  profile.experiences
    ?.map(
      (exp) => `
Position: ${exp.jobTitle} at ${exp.company} (${exp.startDate} - ${
        exp.endDate || 'Present'
      })
Responsibilities: ${exp.responsibilities}
`
    )
    .join('\n') || 'No work experience provided'
}

PERSONALIZATION REQUIREMENTS:
1. **Professional Summary**: Rewrite to directly mention the target position and company, highlighting why the candidate is perfect for THIS specific role
2. **Skills Section**: Prioritize and emphasize skills that directly match the job requirements
3. **Experience Section**: For each role, highlight achievements and responsibilities that are most relevant to the target position
4. **Keywords**: Integrate key terms from the job description naturally throughout the CV
5. **Company Alignment**: Show understanding of the company's sector and demonstrate relevant experience

Create a professional CV in Markdown format that:
- Opens with a compelling summary that directly addresses this job offer
- Reorganizes skills to highlight the most relevant ones first
- Adapts work experience descriptions to emphasize relevant aspects
- Uses keywords from the job description naturally
- Shows clear value proposition for this specific role
- ${languageInstructions.styleInstruction}
- Follows modern CV formatting standards

The CV should make it immediately clear why this candidate is an excellent fit for this specific position at this specific company.
`;
}

function createCoverLetterPrompt(
  jobData: JobData,
  profile: UserProfile,
  languageInstructions: any
): string {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
Create a compelling, personalized cover letter ${
    languageInstructions.coverLetterInstruction
  } for this specific job application.

CANDIDATE CONTACT INFORMATION (must be included at the top):
- Full Name: ${profile.fullName}
- Address: ${profile.address || profile.location}
- Phone: ${profile.phone}
- Email: ${profile.email}
- Date: ${currentDate}

JOB OFFER DETAILS:
- Position: ${jobData.title}
- Company: ${jobData.company}
- Company Address: ${jobData.location}
- Job Description: ${jobData.description}
- Company Sector: ${jobData.companySector || 'Not specified'}

CANDIDATE PROFESSIONAL INFORMATION:
- Current Title: ${profile.currentTitle}
- Experience Level: ${profile.experience}
- Key Skills: ${profile.skills}
- Professional Summary: ${profile.summary}
- Most Recent Experience: ${
    profile.experiences?.[0]?.jobTitle || 'Not specified'
  } at ${profile.experiences?.[0]?.company || 'Not specified'}

COVER LETTER REQUIREMENTS:

**HEADER FORMAT (must include):**
1. Start with candidate's full contact information (name, address, phone, email)
2. Add the current date
3. Add company information and hiring manager details
4. Include subject line mentioning the specific position

**LETTER CONTENT:**
1. **Opening**: Address the specific position and company, showing knowledge of their business
2. **Value Proposition**: Clearly articulate why the candidate is perfect for THIS specific role
3. **Relevant Experience**: Highlight specific experiences and achievements that match the job requirements
4. **Company Connection**: Show understanding of the company's mission/sector and explain why you want to work there
5. **Call to Action**: End with a strong, confident request for an interview

**FORMATTING REQUIREMENTS:**
- Start with proper business letter header including all contact information
- Include date prominently
- Use formal business letter structure
- Be exactly 3-4 paragraphs long (after header)
- ${languageInstructions.styleInstruction}
- Include specific keywords from the job description
- Show genuine enthusiasm for the role and company
- Demonstrate clear value the candidate would bring
- Be personalized and authentic, not generic
- Include specific examples and achievements
- End with appropriate formal closing and signature line

**EXAMPLE STRUCTURE:**
[Candidate Name]
[Full Address]
[Phone] | [Email]

[Date]

[Company Name]
[Company Address]
À l'attention du service RH / Hiring Manager

Objet: Candidature pour le poste de [Position Title]

[Letter content in 3-4 paragraphs]

Cordialement,
[Candidate Name]
`;
}
