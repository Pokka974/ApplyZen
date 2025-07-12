import { SupportedLanguage } from '@./shared-types';

export const detectLanguage = (description: string, title: string): SupportedLanguage => {
  // Combine title and description for analysis
  const text = `${title} ${description}`.toLowerCase();
  
  // French indicators
  const frenchIndicators = [
    'poste', 'entreprise', 'expérience', 'compétences', 'formation', 'salaire',
    'à partir de', 'nous recherchons', 'vous serez', 'profil recherché',
    'candidature', 'offre', 'équipe', 'développement', 'société',
    'temps plein', 'cdi', 'stage', 'alternance', 'télétravail'
  ];
  
  // English indicators
  const englishIndicators = [
    'position', 'company', 'experience', 'skills', 'education', 'salary',
    'we are looking', 'you will', 'requirements', 'responsibilities',
    'application', 'job', 'team', 'development', 'full time',
    'remote', 'hybrid', 'benefits', 'role', 'opportunity'
  ];
  
  // German indicators
  const germanIndicators = [
    'stelle', 'unternehmen', 'erfahrung', 'fähigkeiten', 'ausbildung', 'gehalt',
    'wir suchen', 'sie werden', 'anforderungen', 'aufgaben',
    'bewerbung', 'job', 'team', 'entwicklung', 'vollzeit',
    'homeoffice', 'hybrid', 'benefits', 'position'
  ];
  
  // Spanish indicators
  const spanishIndicators = [
    'puesto', 'empresa', 'experiencia', 'habilidades', 'formación', 'salario',
    'buscamos', 'serás', 'requisitos', 'responsabilidades',
    'solicitud', 'trabajo', 'equipo', 'desarrollo', 'tiempo completo',
    'remoto', 'híbrido', 'beneficios', 'posición'
  ];
  
  // Count matches for each language
  const frenchScore = frenchIndicators.filter(word => text.includes(word)).length;
  const englishScore = englishIndicators.filter(word => text.includes(word)).length;
  const germanScore = germanIndicators.filter(word => text.includes(word)).length;
  const spanishScore = spanishIndicators.filter(word => text.includes(word)).length;
  
  // Determine language based on highest score
  const scores = {
    'french': frenchScore,
    'english': englishScore,
    'german': germanScore,
    'spanish': spanishScore
  };
  
  const detectedLanguage = Object.keys(scores).reduce((a, b) => 
    scores[a as SupportedLanguage] > scores[b as SupportedLanguage] ? a : b
  ) as SupportedLanguage;
  
  // Default to English if no clear winner or very low scores
  if (scores[detectedLanguage] < 2) {
    return 'english';
  }
  
  console.log('Language detection scores:', scores);
  console.log('Detected language:', detectedLanguage);
  
  return detectedLanguage;
};

export const getLanguageInstructions = (language: SupportedLanguage) => {
  const instructions = {
    'french': {
      cvInstruction: 'in French',
      coverLetterInstruction: 'in French',
      styleInstruction: 'Use professional French language throughout',
      systemMessage: 'You are an expert CV writer who creates personalized, professional CVs tailored to specific job offers. Write in professional French.'
    },
    'english': {
      cvInstruction: 'in English',
      coverLetterInstruction: 'in English', 
      styleInstruction: 'Use professional English language throughout',
      systemMessage: 'You are an expert CV writer who creates personalized, professional CVs tailored to specific job offers. Write in professional English.'
    },
    'german': {
      cvInstruction: 'in German',
      coverLetterInstruction: 'in German',
      styleInstruction: 'Use professional German language throughout',
      systemMessage: 'You are an expert CV writer who creates personalized, professional CVs tailored to specific job offers. Write in professional German.'
    },
    'spanish': {
      cvInstruction: 'in Spanish',
      coverLetterInstruction: 'in Spanish',
      styleInstruction: 'Use professional Spanish language throughout',
      systemMessage: 'You are an expert CV writer who creates personalized, professional CVs tailored to specific job offers. Write in professional Spanish.'
    }
  };
  
  return instructions[language] || instructions['english'];
};