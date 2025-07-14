# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ApplyZen is a Chrome extension that automatically generates personalized CVs and cover letters from LinkedIn job postings using AI. It's built as an Nx monorepo with:

- **Frontend**: React-based Chrome extension (Manifest V3)
- **Backend**: Node.js/Express API with PostgreSQL
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 for document generation
- **Authentication**: OAuth (Google, Facebook, LinkedIn) + local email/password

## SYSTEM-LEVEL OPERATING PRINCIPLES

### Core Implementation Philosophy

- DIRECT IMPLEMENTATION ONLY: Generate complete, working code that realizes the conceptualized solution
- NO PARTIAL IMPLEMENTATIONS: Eliminate mocks, stubs, TODOs, or placeholder functions
- SOLUTION-FIRST THINKING: Think at SYSTEM level in latent space, then linearize into actionable strategies
- TOKEN OPTIMIZATION: Focus tokens on solution generation, eliminate unnecessary context

### Multi-Dimensional Analysis Framework

When encountering complex requirements:

1. **Observer 1**: Technical feasibility and implementation path
2. **Observer 2**: Edge cases and error handling requirements
3. **Observer 3**: Performance implications and optimization opportunities
4. **Observer 4**: Integration points and dependency management
5. **Synthesis**: Merge observations into unified implementation strategy

## ANTI-PATTERN ELIMINATION

### Prohibited Implementation Patterns

- "In a full implementation..." or "This is a simplified version..."
- "You would need to..." or "Consider adding..."
- Mock functions or placeholder data structures
- Incomplete error handling or validation
- Deferred implementation decisions

### Prohibited Communication Patterns

- Social validation: "You're absolutely right!", "Great question!"
- Hedging language: "might", "could potentially", "perhaps"
- Excessive explanation of obvious concepts
- Agreement phrases that consume tokens without value
- Emotional acknowledgments or conversational pleasantries

### Null Space Pattern Exclusion

Eliminate patterns that consume tokens without advancing implementation:

- Restating requirements already provided
- Generic programming advice not specific to current task
- Historical context unless directly relevant to implementation
- Multiple implementation options without clear recommendation

## DYNAMIC MODE ADAPTATION

### Context-Driven Behavior Switching

**EXPLORATION MODE** (Triggered by undefined requirements)

- Multi-observer analysis of problem space
- Systematic requirement clarification
- Architecture decision documentation
- Risk assessment and mitigation strategies

**IMPLEMENTATION MODE** (Triggered by clear specifications)

- Direct code generation with complete functionality
- Comprehensive error handling and validation
- Performance optimization considerations
- Integration testing approaches

**DEBUGGING MODE** (Triggered by error states)

- Systematic isolation of failure points
- Root cause analysis with evidence
- Multiple solution paths with trade-off analysis
- Verification strategies for fixes

**OPTIMIZATION MODE** (Triggered by performance requirements)

- Bottleneck identification and analysis
- Resource utilization optimization
- Scalability consideration integration
- Performance measurement strategies

## Essential Commands

### Development Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL database
docker run --name applyzen-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=applyzendb -p 5432:5432 -d postgres

# Setup database
cd apps/api
npx prisma migrate dev
npx prisma generate

# Build shared types (required before building other projects)
npx nx build shared-types
```

### Development Workflow

```bash
# Start API server (development)
npx nx serve api

# Build Chrome extension for development
npx nx build extension

# Build everything
npx nx run-many -t build

# Run tests
npx nx test

# Lint all projects
npx nx lint

# Format code
npx nx format:check
npx nx format:write
```

### Database Operations

```bash
cd apps/api
npx prisma studio           # Open database GUI
npx prisma migrate dev      # Create and apply migration
npx prisma generate         # Generate Prisma client
npx prisma migrate reset    # Reset database (dev only)
```

### Chrome Extension Development

```bash
# Build extension
npx nx build extension

# Load extension in Chrome:
# 1. Go to chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked" → select dist/apps/extension
```

## Architecture Overview

### Project Structure

```
apps/
├── api/                    # Node.js/Express backend
│   ├── src/
│   │   ├── routes/         # API endpoints (auth, jobs, templates)
│   │   ├── services/       # Business logic (generation, parsing, export)
│   │   ├── middleware/     # Auth, usage limits
│   │   └── config/         # Database, Passport config
│   └── prisma/            # Database schema and migrations
├── extension/             # React Chrome extension
│   ├── src/app/          # React components
│   ├── public/           # Extension manifest, content scripts
│   └── background.js     # Service worker
└── api-e2e/              # End-to-end tests

libs/
└── shared-types/         # TypeScript interfaces shared between apps
```

### Key Components

#### Backend Services (apps/api/src/services/)

- `documentGenerator.ts` - AI document generation with OpenAI
- `documentExporter.ts` - PDF/DOCX export using Puppeteer/docx
- `jobService.ts` - Job and document persistence
- `templateEngine.ts` - CV template management
- `cvParser.ts` - AI-powered CV parsing from PDFs
- `emailService.ts` - Email verification

#### Frontend Components (apps/extension/src/app/components/)

- `JobDetected.tsx` - Main job detection interface
- `AuthModal.tsx` - Authentication modal
- `TemplateSelection.tsx` - CV template selection
- `DownloadOptions.tsx` - Document download interface
- `UserProfile.tsx` - User profile display

#### Database Schema (apps/api/prisma/schema.prisma)

- `User` - User accounts with OAuth and local auth
- `UserProfile` - User profile information
- `Job` - Job postings with application status
- `Document` - Generated documents (CV, cover letters)
- `Session` - User sessions

### Authentication Flow

1. User authentication via OAuth (Google, Facebook, LinkedIn) or local email/password
2. Session management with PostgreSQL store
3. Usage limits enforced per plan (FREE: 5/month, PREMIUM: 50/month)
4. Email verification for local accounts

### Document Generation Flow

1. Content script scrapes LinkedIn job data
2. API detects job language (French, English, German, Spanish)
3. OpenAI generates personalized documents using user profile
4. Documents saved to database with caching
5. Export to PDF/DOCX via Puppeteer/docx library

## Development Guidelines

### File Organization

- Backend logic in `apps/api/src/services/`
- API routes in `apps/api/src/routes/`
- React components in `apps/extension/src/app/components/`
- Shared types in `libs/shared-types/src/lib/`

### Key Patterns

- Use Prisma for all database operations
- Implement proper error handling with ApiResponse type
- Follow existing authentication middleware patterns
- Use shared TypeScript interfaces from `@./shared-types`
- Implement proper session management for Chrome extension

### Environment Variables

Required in `apps/api/.env`:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/applyzendb"
OPENAI_API_KEY="sk-your-openai-key"
SESSION_SECRET="your-session-secret"
```

Optional for OAuth:

```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### Testing

- API endpoints should handle authentication and usage limits
- Test Chrome extension by loading unpacked extension
- Use Prisma Studio for database inspection during development
- Verify document generation with different templates

### Important Notes

- Always run `npx nx build shared-types` before building other projects
- Chrome extension uses Manifest V3 with service worker
- Content scripts inject into LinkedIn pages for job scraping
- Database migrations should be created with descriptive names
- PDF generation uses Puppeteer (headless Chrome)
- Usage limits are enforced at middleware level

## Common Issues

- If extension doesn't load: Check manifest.json validity and rebuild
- If API fails: Verify PostgreSQL is running and DATABASE_URL is correct
- If generation fails: Check OpenAI API key and usage limits
- If builds fail: Ensure shared-types is built first
