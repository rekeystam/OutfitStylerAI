# AI Outfit Recommender

## Overview

This is a full-stack web application that provides AI-powered outfit recommendations by analyzing photos of clothing items. Users can take or upload photos of their wardrobe, and the application uses Google's Gemini AI to identify clothing items and suggest stylish outfit combinations.

## System Architecture

The application follows a modern full-stack architecture with a clear separation between frontend and backend:

- **Frontend**: React-based SPA using Vite as the build tool
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: Google Gemini AI for image analysis and outfit recommendations
- **UI Framework**: Tailwind CSS with shadcn/ui components

## Key Components

### Frontend Architecture
- **React + TypeScript**: Main frontend framework with type safety
- **Vite**: Fast build tool and development server
- **TanStack Query**: State management and API data fetching
- **shadcn/ui**: Pre-built UI component library based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling

### Backend Architecture
- **Express.js**: Web server framework
- **Drizzle ORM**: Type-safe database ORM
- **PostgreSQL**: Primary database (configured via Neon Database)
- **Session Management**: PostgreSQL-based session storage using connect-pg-simple

### Database Schema
- **Users Table**: Basic user authentication with username/password
- **Wardrobe Items Table**: Enhanced with detailed categorization
  - Categories: tops, bottoms, dresses, shoes, socks, accessories
  - Subcategories: blouses, shirts, t-shirts, heels, flats, etc.
  - Color system: primary/secondary colors plus full color array
  - Style tags: casual, formal, sporty, elegant, etc.
  - Layering capability and versatility ratings
  - Gender targeting (focused on female fashion)
- **Outfits Table**: Combination records for outfit recommendations
- Database migrations are managed through Drizzle Kit
- Schema definitions are shared between frontend and backend via the `shared` directory

### AI Integration
- **Google Gemini AI**: Used for analyzing clothing photos and generating outfit recommendations
- Enhanced image analysis with detailed categorization (category, subcategory, colors, style tags)
- Processes uploaded images to identify clothing items with layering capability and versatility ratings
- Generates creative outfit combinations using advanced color harmony rules
- Color matching system with complementary, analogous, and neutral color coordination
- Temperature-based styling recommendations (warm, mild, cool, cold)

## Data Flow

1. **Image Capture/Upload**: Users take photos or upload images of clothing items
2. **AI Processing**: Images are sent to Google Gemini AI for analysis
3. **Item Recognition**: AI identifies and catalogs individual clothing pieces
4. **Recommendation Generation**: AI creates outfit combinations based on available items
5. **Display Results**: Styled recommendations are presented to the user

## External Dependencies

- **@google/genai**: Google Gemini AI SDK for image analysis and text generation
- **@neondatabase/serverless**: Neon Database driver for PostgreSQL
- **Drizzle ORM**: Database toolkit and ORM
- **Radix UI**: Headless UI primitives for component library
- **TanStack Query**: Data fetching and state management
- **React Hook Form**: Form handling and validation

## Deployment Strategy

- **Development**: 
  - Vite dev server for frontend hot reloading
  - tsx for running TypeScript backend in development
  - Environment variable based configuration

- **Production Build**:
  - Vite builds the frontend to `dist/public`
  - esbuild bundles the backend server
  - Static file serving through Express

- **Database**:
  - Uses DATABASE_URL environment variable
  - Drizzle migrations handle schema changes
  - Configured for PostgreSQL dialect

## Changelog
- January 4, 2025. Enhanced categorization system with detailed color harmony rules
  - Advanced outfit generator with uniqueness tracking
  - Performance optimization with early stopping (max 4 unique outfits)
  - Partial outfit support (missing optional items like socks/accessories)
  - User preference integration for color and style prioritization
  - Signature-based duplicate prevention using sorted item IDs
- June 29, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.