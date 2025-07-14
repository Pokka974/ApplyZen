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
import { templateEngine } from './templateEngine';

interface GenerateDocumentsParams {
  jobData: JobData;
  profile: UserProfile;
  type: DocumentType;
  language: SupportedLanguage;
  templateId?: string;
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
  templateId,
}: GenerateDocumentsParams): Promise<DocumentsResponse> {
  const result: DocumentsResponse = {
    success: true,
  };

  try {
    // Default to 'classique' template if none specified
    const selectedTemplateId = templateId || 'classique';

    if (type === 'cv' || type === 'both') {
      const cvContent = await generateCV(
        jobData,
        profile,
        language,
        selectedTemplateId
      );
      result.cv = {
        content: cvContent,
        type: 'cv',
        language,
        wordCount: cvContent.split(' ').length,
        generatedAt: new Date().toISOString(),
        templateId: selectedTemplateId,
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
  language: SupportedLanguage,
  templateId: string
): Promise<string> {
  console.log(
    `Generating CV in ${language} for ${jobData.title} at ${jobData.company} using template: ${templateId}`
  );

  // Step 1: Generate dedicated summary first
  const guaranteedSummary = await generateDedicatedSummary(
    jobData,
    profile,
    language
  );
  console.log(
    'Guaranteed summary generated:',
    guaranteedSummary ? 'SUCCESS' : 'FAILED'
  );

  // Step 2: Generate the rest of the CV content
  const languageInstructions = getLanguageInstructions(language);
  const prompt = createCVPrompt(jobData, profile, languageInstructions);

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

  // Clean the response to remove markdown code blocks
  let content = response.choices[0].message.content.trim();

  // Remove markdown code block markers
  if (content.startsWith('```markdown')) {
    content = content.replace(/^```markdown\s*/, '').replace(/```\s*$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  // Remove horizontal rule separators (---) that appear in AI-generated content
  content = content.replace(/^-{3,}$/gm, '').replace(/\n\n\n+/g, '\n\n');

  // Remove any conversational/promotional text and markdown artifacts
  content = content
    // Remove any text that looks like questions or calls to action (but not at the beginning of sections)
    .replace(/^(?!##\s).*[Pp]rêt à.*$\n?/gm, '')
    .replace(/^(?!##\s).*[Ee]nthousiaste.*$\n?/gm, '')
    .replace(/^(?!##\s).*[Cc]ontacter.*$\n?/gm, '')
    .replace(/^(?!##\s).*[Pp]articiper.*$\n?/gm, '')
    .replace(/^(?!##\s).*[Rr]ejoindre.*$\n?/gm, '')

    // Remove markdown code block explanations
    .replace(/^Ce CV.*$/gm, '')
    .replace(/^Ce document.*$/gm, '')
    .replace(/^Cette.*optimis.*$/gm, '')
    .replace(/^.*optimis.*pour.*$/gm, '')
    .replace(/^.*en mettant en avant.*$/gm, '')
    .replace(/^.*vocabulaire exact.*$/gm, '')

    // Remove any remaining markdown artifacts
    .replace(/^```.*$/gm, '')
    .replace(/^\*\*Note\*\*.*$/gm, '')
    .replace(/^\*\*Important\*\*.*$/gm, '')

    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Step 3: Render template with guaranteed summary injection
  try {
    console.log(`Looking for template: ${templateId}`);
    const template = templateEngine.getTemplate(templateId);

    if (template) {
      console.log(
        `Template found: ${template.name}, rendering with profile and content`
      );
      // Pass the guaranteed summary to ensure it's always injected
      const renderedContent =
        templateEngine.renderTemplateWithGuaranteedSummary(
          templateId,
          profile,
          content,
          guaranteedSummary
        );
      console.log(
        `Template rendered successfully for ${templateId} with guaranteed summary`
      );
      return renderedContent;
    } else {
      console.warn(
        `Template ${templateId} not found, falling back to markdown`
      );
    }
  } catch (error) {
    console.warn(
      `Template rendering failed for ${templateId}, falling back to markdown:`,
      error
    );
  }

  // Fallback to markdown content if template rendering fails
  console.log(`Using markdown fallback for ${templateId}`);
  return content.trim();
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

  // Clean the response to remove markdown code blocks
  let content = response.choices[0].message.content.trim();

  // Remove markdown code block markers
  if (content.startsWith('```markdown')) {
    content = content.replace(/^```markdown\s*/, '').replace(/```\s*$/, '');
  } else if (content.startsWith('```')) {
    content = content.replace(/^```\s*/, '').replace(/```\s*$/, '');
  }

  // Remove horizontal rule separators (---) that appear in AI-generated content
  content = content.replace(/^-{3,}$/gm, '').replace(/\n\n\n+/g, '\n\n');

  // Remove any conversational/promotional text and markdown artifacts
  content = content
    // Remove any text that looks like questions or calls to action
    .replace(/^.*[Pp]rêt à.*$\n?/gm, '')
    .replace(/^.*[Ee]nthousiaste.*$\n?/gm, '')
    .replace(/^.*[Jj]e suis.*$\n?/gm, '')
    .replace(/^.*[Cc]ontacter.*$\n?/gm, '')
    .replace(/^.*[Pp]articiper.*$\n?/gm, '')
    .replace(/^.*[Rr]ejoindre.*$\n?/gm, '')

    // Remove markdown code block explanations
    .replace(/^Ce CV.*$/gm, '')
    .replace(/^Ce document.*$/gm, '')
    .replace(/^Cette.*optimis.*$/gm, '')
    .replace(/^.*optimis.*pour.*$/gm, '')
    .replace(/^.*en mettant en avant.*$/gm, '')
    .replace(/^.*vocabulaire exact.*$/gm, '')

    // Remove any remaining markdown artifacts
    .replace(/^```.*$/gm, '')
    .replace(/^\*\*Note\*\*.*$/gm, '')
    .replace(/^\*\*Important\*\*.*$/gm, '')

    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return content.trim();
}

function getSectionHeaders(language: SupportedLanguage): string {
  const headers = {
    french: {
      summary: '## Résumé Professionnel',
      summaryDesc:
        "Write a compelling 2-3 sentence professional summary that:\n- Highlights your expertise directly relevant to this position\n- Mentions key skills that match the job requirements\n- Shows your value proposition for the company\n- Uses keywords from the job description\n- Demonstrates why you're the perfect fit for this role",
      skills: '## Compétences',
      skillsDesc:
        '[List relevant technical and soft skills, prioritizing those that match the job requirements]',
      experience: '## Expérience Professionnelle',
      experienceDesc:
        '[Detail work experience with bullet points, emphasizing achievements relevant to the target role]',
      education: '## Formation',
      educationDesc: '[List education and certifications]',
      languages: '## Langues',
      languagesDesc: '[List languages and proficiency levels if applicable]',
    },
    english: {
      summary: '## Professional Summary',
      summaryDesc:
        "Write a compelling 2-3 sentence professional summary that:\n- Highlights your expertise directly relevant to this position\n- Mentions key skills that match the job requirements\n- Shows your value proposition for the company\n- Uses keywords from the job description\n- Demonstrates why you're the perfect fit for this role",
      skills: '## Skills',
      skillsDesc:
        '[List relevant technical and soft skills, prioritizing those that match the job requirements]',
      experience: '## Professional Experience',
      experienceDesc:
        '[Detail work experience with bullet points, emphasizing achievements relevant to the target role]',
      education: '## Education',
      educationDesc: '[List education and certifications]',
      languages: '## Languages',
      languagesDesc: '[List languages and proficiency levels if applicable]',
    },
    german: {
      summary: '## Berufliches Profil',
      summaryDesc:
        "Write a compelling 2-3 sentence professional summary that:\n- Highlights your expertise directly relevant to this position\n- Mentions key skills that match the job requirements\n- Shows your value proposition for the company\n- Uses keywords from the job description\n- Demonstrates why you're the perfect fit for this role",
      skills: '## Fähigkeiten',
      skillsDesc:
        '[List relevant technical and soft skills, prioritizing those that match the job requirements]',
      experience: '## Berufserfahrung',
      experienceDesc:
        '[Detail work experience with bullet points, emphasizing achievements relevant to the target role]',
      education: '## Ausbildung',
      educationDesc: '[List education and certifications]',
      languages: '## Sprachen',
      languagesDesc: '[List languages and proficiency levels if applicable]',
    },
    spanish: {
      summary: '## Resumen Profesional',
      summaryDesc:
        "Write a compelling 2-3 sentence professional summary that:\n- Highlights your expertise directly relevant to this position\n- Mentions key skills that match the job requirements\n- Shows your value proposition for the company\n- Uses keywords from the job description\n- Demonstrates why you're the perfect fit for this role",
      skills: '## Habilidades',
      skillsDesc:
        '[List relevant technical and soft skills, prioritizing those that match the job requirements]',
      experience: '## Experiencia Profesional',
      experienceDesc:
        '[Detail work experience with bullet points, emphasizing achievements relevant to the target role]',
      education: '## Formación',
      educationDesc: '[List education and certifications]',
      languages: '## Idiomas',
      languagesDesc: '[List languages and proficiency levels if applicable]',
    },
  };

  const h = headers[language] || headers['english'];

  return `${h.summary}\n${h.summaryDesc}\n\n${h.skills}\n${h.skillsDesc}\n\n${h.experience}\n${h.experienceDesc}\n\n${h.education}\n${h.educationDesc}\n\n${h.languages}\n${h.languagesDesc}`;
}

function createCVPrompt(
  jobData: JobData,
  profile: UserProfile,
  languageInstructions: any & { language: SupportedLanguage }
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
4. **CRITICAL ATS KEYWORDS**: You MUST include ONLY relevant terms that match the candidate's profile:
   - Use the EXACT job title as it appears in the offer
   - Include ONLY technical skills from the job requirements that the candidate ACTUALLY has in their profile
   - Integrate ONLY qualifications that match the candidate's experience and education
   - Use industry-specific terms ONLY if they align with the candidate's background
   - Include ONLY software, tools, and technologies that the candidate has listed in their skills
   - NEVER add skills or technologies not present in the candidate's profile
   - Match exact language and phrasing but only for skills the candidate possesses
5. **Company Alignment**: Show understanding of the company's sector and demonstrate relevant experience

Create a professional CV in Markdown format with these REQUIRED sections in this exact order:

${getSectionHeaders(languageInstructions.language)}


**Requirements:**
- **ATS OPTIMIZATION**: Use EXACT keywords, phrases, and terminology from the job description
- **KEYWORD DENSITY**: Ensure high-impact keywords appear multiple times throughout the CV
- **EXACT MATCHING**: Use the same spelling, capitalization, and phrasing as in the job offer
- Shows clear value proposition for this specific role
- ${languageInstructions.styleInstruction}
- Follows modern CV formatting standards
- IMPORTANT: Keep content concise and optimized for single-page layout
- Use bullet points for work experience rather than long paragraphs
- Prioritize the most relevant and recent experiences
- Keep each section focused and impactful

**STRICT FORMATTING RULES:**
- Output ONLY pure CV content in markdown format
- NO conversational language or questions (e.g., "Prêt à rejoindre...")
- NO promotional or marketing language
- NO closing statements or calls to action
- NO explanatory text about the CV optimization
- NO meta-comments about the CV creation process
- End with the last relevant CV section, no additional commentary

The CV should make it immediately clear why this candidate is an excellent fit for this specific position at this specific company while fitting on a single page. Output only the CV content itself.
`;
}

/**
 * Generate a dedicated professional summary that's guaranteed to be relevant
 * and always injected into the CV template
 */
async function generateDedicatedSummary(
  jobData: JobData,
  profile: UserProfile,
  language: SupportedLanguage
): Promise<string> {
  const languageInstructions = getLanguageInstructions(language);

  const summaryPrompt = `
Create a compelling professional summary ${
    languageInstructions.cvInstruction
  } specifically for this job application.

JOB DETAILS:
- Position: ${jobData.title}
- Company: ${jobData.company}
- Key requirements from description: ${jobData.description.substring(0, 500)}...

CANDIDATE PROFILE:
- Name: ${profile.fullName}
- Current Title: ${profile.currentTitle}
- Experience Level: ${profile.experience}
- Key Skills: ${profile.skills}
- Recent Experience: ${
    profile.experiences?.[0]?.jobTitle || 'Not specified'
  } at ${profile.experiences?.[0]?.company || 'Not specified'}

Requirements:
1. Write EXACTLY 2-3 sentences that highlight why this candidate is perfect for THIS specific position
2. Include specific skills from the candidate's profile that match the job requirements
3. Show clear value proposition for the target company
4. Use keywords from the job description that align with the candidate's experience
5. Be professional and impactful
6. Output ONLY the summary text, no additional formatting or explanations

Example structure:
"[Experience level] [current title] with [X years] of experience in [relevant field]. Proven expertise in [specific skills that match job] with a track record of [relevant achievements]. Seeking to leverage [specific skills/experience] to drive [company goal/value] at [company name]."

Output the summary in plain text format, no markdown, no extra formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert professional summary writer. Create compelling, job-specific summaries that highlight candidate strengths. Write ${languageInstructions.cvInstruction}. Output ONLY the summary text, nothing else.`,
        },
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      max_tokens: 200, // Limit for concise summary
      temperature: 0.7,
    });

    if (response.choices[0]?.message?.content) {
      let summary = response.choices[0].message.content.trim();

      // Clean any markdown or formatting
      summary = summary
        .replace(/^```.*$/gm, '')
        .replace(/^#+\s*/, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .trim();

      console.log(
        'Generated dedicated summary:',
        summary.substring(0, 100) + '...'
      );
      return summary;
    }
  } catch (error) {
    console.error('Failed to generate dedicated summary:', error);
  }

  // Fallback summary based on profile and job
  const fallbackSummary = createFallbackSummary(jobData, profile, language);
  console.log(
    'Using fallback summary:',
    fallbackSummary.substring(0, 100) + '...'
  );
  return fallbackSummary;
}

/**
 * Create a fallback summary when AI generation fails
 */
function createFallbackSummary(
  jobData: JobData,
  profile: UserProfile,
  language: SupportedLanguage
): string {
  const templates = {
    french: `${profile.currentTitle || 'Professionnel'} ${
      profile.experience || 'expérimenté'
    } avec une expertise en ${
      profile.skills?.split(',')[0]?.trim() || 'son domaine'
    }. Passionné par l'innovation et l'excellence professionnelle, je souhaite contribuer au succès de ${
      jobData.company
    } en tant que ${jobData.title}.`,
    english: `${profile.experience || 'Experienced'} ${
      profile.currentTitle || 'professional'
    } with expertise in ${
      profile.skills?.split(',')[0]?.trim() || 'their field'
    }. Passionate about innovation and professional excellence, seeking to contribute to ${
      jobData.company
    }'s success as ${jobData.title}.`,
    german: `${profile.experience || 'Erfahrener'} ${
      profile.currentTitle || 'Fachkraft'
    } mit Expertise in ${
      profile.skills?.split(',')[0]?.trim() || 'ihrem Bereich'
    }. Leidenschaftlich für Innovation und berufliche Exzellenz, möchte zum Erfolg von ${
      jobData.company
    } als ${jobData.title} beitragen.`,
    spanish: `${profile.currentTitle || 'Profesional'} ${
      profile.experience || 'experimentado'
    } con experiencia en ${
      profile.skills?.split(',')[0]?.trim() || 'su campo'
    }. Apasionado por la innovación y la excelencia profesional, busca contribuir al éxito de ${
      jobData.company
    } como ${jobData.title}.`,
  };

  return templates[language] || templates['english'];
}

function createCoverLetterPrompt(
  jobData: JobData,
  profile: UserProfile,
  languageInstructions: any
): string {
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
- Be exactly 200-300 words long (after header)
- ${languageInstructions.styleInstruction}
- Include specific keywords from the job description
- Show genuine enthusiasm for the role and company
- Demonstrate clear value the candidate would bring
- Be personalized and authentic, not generic
- Include specific examples and achievements
- Use the same language used in the job description
- End with appropriate formal closing and signature line
- Format as clean text without markdown formatting (no bold, italic, or headers)
- Use proper line breaks and spacing for business letter format

**EXAMPLE STRUCTURE:**
[Candidate Name]
[Full Address]
[Phone] | [Email]

[Date]

[Company Name]
[Company Address]
À l'attention du service RH / Hiring Manager

Objet: Candidature pour le poste de [Position Title]

[Letter content in 200-300 words]

Cordialement,
[Candidate Name]
`;
}
