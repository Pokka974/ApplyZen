# 📄 ApplyZen - AI-Powered Job Application Generator

**ApplyZen** is a comprehensive Chrome extension that automatically generates personalized CVs and cover letters from LinkedIn job postings using AI. Built with modern TypeScript, React, and Node.js in an Nx monorepo with full user authentication, database persistence, and usage tracking.

## 🚀 Features

### 🎯 **Core Functionality**
- **Smart Job Detection**: Automatically detects LinkedIn job pages and scrapes job data
- **AI-Powered Generation**: Creates personalized CVs and cover letters using OpenAI GPT-4
- **Multi-Language Support**: Automatically detects job language (French, English, German, Spanish)
- **Multiple Export Formats**: Download documents as PDF, DOCX, or Markdown
- **Intelligent Document Caching**: Remembers generated documents to avoid regeneration

### 👤 **User Management**
- **Full Authentication System**: Local registration + OAuth (Google, LinkedIn, Facebook)
- **Email Verification**: Secure account activation with email confirmation
- **User Profiles**: Comprehensive profile management with experience tracking
- **Usage Tracking**: Fair usage limits with upgrade paths (FREE: 5/month, PREMIUM: 50/month)

### 📊 **Advanced Features**
- **Job Application History**: Track all your applications with document management
- **Document Downloads**: Download any previously generated document from history
- **Profile Import**: Import CV data from PDF files using AI parsing
- **Real-time Progress**: Visual usage indicators and generation cost display
- **Responsive UI**: Professional interface with loading states and error handling

## 🏗️ Architecture

This is an **Nx monorepo** containing:

```
📁 ApplyZen/
├── 🚀 apps/
│   ├── 🎨 extension/          # React + Vite Chrome extension (Manifest V3)
│   ├── 🛡️ api/               # Node.js + Express + Prisma backend
│   └── 🧪 api-e2e/          # API end-to-end tests
├── 📚 libs/
│   └── 🔗 shared-types/     # Shared TypeScript interfaces
└── 📜 legacy-code/          # Original implementation (reference)
```

## 🛠️ Tech Stack

### Frontend (Chrome Extension)
- **React 19** with TypeScript
- **Vite** for fast builds
- **Chrome Extension Manifest V3**
- **CSS Modules** with modern styling
- **Chrome APIs** for tab management and content scripts

### Backend (API)
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** with Prisma ORM
- **Passport.js** for authentication
- **Express Sessions** with PostgreSQL storage
- **Nodemailer** for email verification
- **OpenAI API** for document generation
- **PDF parsing** with pdf-parse
- **Document export** (PDF via Puppeteer, DOCX via docx library)

### Infrastructure
- **Docker** ready (PostgreSQL)
- **Nx** for monorepo management
- **ESLint** + **Prettier** for code quality
- **Environment-based configuration**

## 🚦 Getting Started

### Prerequisites

- **Node.js 18+**
- **npm**
- **PostgreSQL** (local or Docker)
- **OpenAI API key**
- **Google OAuth credentials** (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ApplyZen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup PostgreSQL**
   ```bash
   # Option 1: Docker
   docker run --name applyzen-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=applyzendb -p 5432:5432 -d postgres
   
   # Option 2: Local PostgreSQL
   createdb applyzendb
   ```

4. **Configure environment**
   ```bash
   # Copy and edit environment file
   cp apps/api/.env.example apps/api/.env
   ```
   
   Edit `apps/api/.env` with your configuration:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=sk-your-openai-api-key-here
   
   # Database Configuration
   DATABASE_URL="postgresql://username:password@localhost:5432/applyzendb?schema=public"
   
   # Google OAuth (optional)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   
   # Email Configuration (optional - for real emails)
   # EMAIL_HOST=smtp.gmail.com
   # EMAIL_USER=your-gmail@gmail.com
   # EMAIL_PASS=your-app-password
   ```

5. **Setup database**
   ```bash
   cd apps/api
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Build shared types**
   ```bash
   npx nx build shared-types
   ```

### Development

1. **Start the backend API**
   ```bash
   npx nx serve api
   # API runs on http://localhost:3000
   ```

2. **Build the Chrome extension**
   ```bash
   npx nx build extension
   ```

3. **Load the extension in Chrome**
   - Open Chrome → `chrome://extensions/`
   - Enable "**Developer mode**"
   - Click "**Load unpacked**" → select `dist/apps/extension`

4. **Test the extension**
   - Visit a LinkedIn job page
   - Click the ApplyZen extension icon
   - Register/login and generate documents!

## 📁 Project Structure

### Chrome Extension (`apps/extension/`)
```
src/
├── app/
│   ├── components/
│   │   ├── AuthModal.tsx         # Login/Register modal
│   │   ├── JobDetected.tsx       # Job generation interface
│   │   ├── UserProfile.tsx       # User profile display
│   │   ├── DownloadOptions.tsx   # Document download interface
│   │   └── ...
│   ├── services/
│   │   └── authService.ts        # Authentication API calls
│   └── app.tsx                   # Main application component
public/
├── manifest.json                 # Extension manifest
├── background.js                 # Service worker
├── content/scraper.js           # LinkedIn job scraper
├── history.html                 # Job history page
└── js/history.js               # History page functionality
```

### Backend API (`apps/api/`)
```
src/
├── config/
│   ├── database.ts              # Prisma configuration
│   └── passport.ts              # Authentication strategies
├── middleware/
│   └── auth.ts                  # Auth middleware & usage limits
├── routes/
│   ├── auth.ts                  # Authentication endpoints
│   └── jobs.ts                  # Job history endpoints
├── services/
│   ├── documentGenerator.ts     # AI document generation
│   ├── emailService.ts          # Email verification
│   ├── jobService.ts            # Job & document management
│   ├── cvParser.ts              # PDF parsing
│   └── documentExporter.ts      # PDF/DOCX export
└── main.ts                      # Express server setup
prisma/
├── schema.prisma                # Database schema
└── migrations/                  # Database migrations
```

## 🔧 Configuration

### Environment Variables

**Required:**
```env
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL="postgresql://user:pass@localhost:5432/applyzendb"
```

**Optional (Authentication):**
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
SESSION_SECRET="your-session-secret"
```

**Optional (Email Verification):**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="ApplyZen <your-gmail@gmail.com>"
```

### Available Commands

```bash
# 🏗️ Build everything
npx nx run-many -t build

# 🚀 Development
npx nx serve api                 # Start API server
npx nx build extension           # Build extension

# 🧪 Testing
npx nx test                      # Run tests
npx nx e2e api-e2e              # Run API e2e tests

# 🔍 Code Quality
npx nx lint                      # Lint all projects
npx nx format:check              # Check formatting

# 📊 Database
cd apps/api
npx prisma studio               # Database GUI
npx prisma migrate dev          # Run migrations
npx prisma generate             # Generate client
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/verify-email` - Email verification
- `GET /api/auth/me` - Current user info

### Document Generation
- `POST /api/generate` - Generate CV/cover letter
- `POST /api/parse-pdf` - Parse CV from PDF
- `POST /api/export/pdf` - Export document as PDF
- `POST /api/export/docx` - Export document as DOCX

### Job Management
- `GET /api/jobs/history` - Get job application history
- `GET /api/jobs/documents/:id` - Get specific document
- `PATCH /api/jobs/:id/status` - Update application status

### Health & Monitoring
- `GET /api/health` - Health check endpoint

## 🔒 Security Features

- **Session-based authentication** with PostgreSQL storage
- **Password hashing** with bcrypt (12 rounds)
- **Email verification** before account activation
- **CORS protection** for Chrome extension communication
- **Helmet.js** for security headers
- **Input validation** and sanitization
- **Usage rate limiting** to prevent abuse

## 📊 Usage Plans

| Plan | Monthly Generations | Features |
|------|-------------------|----------|
| **FREE** | 5 | Basic CV/Cover letter generation |
| **PREMIUM** | 50 | Advanced formats, Priority support |
| **ENTERPRISE** | 1000 | Custom features, Team management |

## 🤝 Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Frontend: Edit files in `apps/extension/`
   - Backend: Edit files in `apps/api/`
   - Shared: Edit files in `libs/shared-types/`

3. **Test your changes**
   ```bash
   npx nx build extension
   npx nx serve api
   # Test in Chrome extension
   ```

4. **Database changes**
   ```bash
   cd apps/api
   npx prisma migrate dev --name your-migration-name
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   git push origin feature/your-feature-name
   ```

## 🛡️ Production Deployment

### Backend (API)
```bash
# Build production bundle
npx nx build api --prod

# Setup production database
DATABASE_URL="postgresql://prod-user:pass@prod-host:5432/applyzen"
npx prisma migrate deploy

# Start production server
NODE_ENV=production node dist/apps/api/main.js
```

### Chrome Extension
```bash
# Build production extension
npx nx build extension --prod

# Package for Chrome Web Store
cd dist/apps/extension
zip -r applyzen-extension.zip .
```

## 🐛 Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure you've built the extension: `npx nx build extension`
- Check Chrome developer console for errors
- Verify manifest.json is valid

**API connection issues:**
- Ensure API is running on port 3000
- Check CORS configuration in main.ts
- Verify environment variables are set

**Database issues:**
- Ensure PostgreSQL is running
- Run migrations: `npx prisma migrate dev`
- Check DATABASE_URL format

**Authentication issues:**
- Verify Google OAuth credentials
- Check session configuration
- Ensure email service is configured

### Development Tips

- Use `console.log` in extension background.js for debugging
- Monitor API logs when developing
- Use Chrome DevTools for extension debugging
- Use Prisma Studio for database inspection

## 🚧 Roadmap

### ✅ Completed
- Full authentication system with OAuth
- PostgreSQL database with Prisma
- Document generation and export
- Job application history
- Email verification system
- Usage tracking and limits
- Professional UI/UX

### 🔄 In Progress
- Chrome Web Store optimization
- Performance improvements
- Enhanced error handling

### 📋 Planned
- **Multi-platform support** (Indeed, Welcome to the Jungle)
- **Team collaboration** features
- **Analytics dashboard** 
- **Mobile companion app**
- **API rate limiting** improvements
- **Webhook integrations**
- **Advanced document templates**

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/AmazingFeature`)
3. **Make your changes** with proper TypeScript types
4. **Add tests** if applicable
5. **Run linting** (`npx nx lint`)
6. **Commit your changes** (`git commit -m 'Add some AmazingFeature'`)
7. **Push to the branch** (`git push origin feature/AmazingFeature`)
8. **Open a Pull Request**

### Development Guidelines
- Use **TypeScript** strictly typed
- Follow **ESLint** and **Prettier** rules
- Write **meaningful commit messages**
- Update **documentation** for new features
- Test **Chrome extension** thoroughly

## 📞 Support

- **🐛 Bug Reports**: Create a GitHub issue
- **💡 Feature Requests**: Open a GitHub discussion
- **❓ Questions**: Check existing issues or create a new one

---

## 🔧 Nx Workspace

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

This workspace was created with [Nx](https://nx.dev).

### Nx Useful Commands

```bash
# 📊 Visualize the project graph
npx nx graph

# 🔍 Show project dependencies
npx nx show projects --with-deps

# 🧹 Clear Nx cache
npx nx reset

# 📈 Run dependency graph analysis
npx nx dep-graph
```

---

**Made with ❤️ by the ApplyZen team**