"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const templateEngine_1 = require("./src/services/templateEngine");
// Test AI content with different header variations
const testContent = `
## Résumé Professionnel
Développeur expérimenté avec 5 ans d'expérience...

## Compétences
- JavaScript
- React
- Node.js

## Expérience Professionnelle
### Développeur Senior - TechCorp (2020-2023)
- Développement d'applications web
- Gestion d'équipe
- Architecture logicielle

### Développeur Junior - StartupInc (2018-2020)
- Développement frontend
- Maintenance de code existant

## Formation
Master en Informatique - Université XYZ (2018)

## Langues
- Français: Langue maternelle
- Anglais: Courant
`;
console.log('Testing template engine experience processing...');
// Test user profile
const testProfile = {
    fullName: 'Jean Dupont',
    email: 'jean.dupont@email.com',
    phone: '01 23 45 67 89',
    location: 'Paris, France',
    currentTitle: 'Développeur Senior',
    experience: '5-10',
    skills: 'JavaScript, React, Node.js',
    summary: 'Développeur expérimenté',
    education: 'Master Informatique',
    languages: 'Français, Anglais',
    experiences: [
        {
            jobTitle: 'Développeur Senior',
            company: 'TechCorp',
            startDate: '2020-01',
            endDate: '2023-12',
            responsibilities: 'Développement d\'applications web, gestion d\'équipe'
        }
    ]
};
// Test the parseAIContent method directly
console.log('\n=== Testing parseAIContent method ===');
// Access the private method via type assertion
const engine = templateEngine_1.templateEngine;
const sections = engine.parseAIContent(testContent);
console.log('Parsed sections:', Object.keys(sections));
console.log('Experiences section:', sections.experiences);
console.log('Summary section:', sections.summary);
console.log('Skills section:', sections.skills);
// Test the mapHeaderToSection method
console.log('\n=== Testing mapHeaderToSection method ===');
const testHeaders = [
    'expérience professionnelle',
    'experience',
    'professional experience',
    'expérience',
    'work experience',
    'emploi'
];
testHeaders.forEach(header => {
    const mapped = engine.mapHeaderToSection(header);
    console.log(`"${header}" -> "${mapped}"`);
});
// Test full template rendering
console.log('\n=== Testing full template rendering ===');
try {
    const result = templateEngine_1.templateEngine.renderTemplate('classique', testProfile, testContent);
    // Check if experiences section is present
    const experienceMatch = result.match(/{{experiences}}/g);
    if (experienceMatch) {
        console.log('❌ Found unreplaced {{experiences}} placeholder');
    }
    else {
        console.log('✅ {{experiences}} placeholder was replaced');
    }
    // Look for the experience content
    const hasExperienceContent = result.includes('TechCorp') || result.includes('Développeur Senior');
    if (hasExperienceContent) {
        console.log('✅ Experience content found in output');
    }
    else {
        console.log('❌ Experience content NOT found in output');
    }
    console.log('\n=== Experience section from output ===');
    const experienceStart = result.indexOf('Expérience Professionnelle');
    if (experienceStart !== -1) {
        const experienceEnd = result.indexOf('</section>', experienceStart);
        const experienceSection = result.substring(experienceStart, experienceEnd + 10);
        console.log(experienceSection);
    }
    else {
        console.log('Experience section not found in output');
    }
}
catch (error) {
    console.error('Error testing template engine:', error);
}
