# Technology Stack

## Framework & Runtime

- **Next.js 15.2.4** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript
- **Node.js** - Runtime environment

## Database & Backend

- **Neon Database** - Serverless PostgreSQL database
- **@neondatabase/serverless** - Database client with connection pooling
- **Next.js API Routes** - RESTful API endpoints

## UI & Styling

- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Headless UI components for accessibility
- **Lucide React** - Icon library
- **next-themes** - Dark/light theme support
- **Recharts 2.15.0** - Chart library for data visualization

## Forms & Validation

- **React Hook Form 7.54.1** - Form state management
- **Zod 3.24.1** - Schema validation
- **@hookform/resolvers** - Form validation integration

## Development Tools

- **ESLint** - Code linting (build errors ignored in config)
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## Build Configuration

- **Images**: Unoptimized (static export friendly)
- **Timezone**: America/Bogota (Colombia)
- **TypeScript**: Build errors ignored for development speed
- **ESLint**: Build errors ignored for development speed

## Common Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Package Management
npm install          # Install dependencies
```

## Environment Variables

- `DATABASE_URL_NEW` - Neon database connection string
- `TZ=America/Bogota` - Application timezone
