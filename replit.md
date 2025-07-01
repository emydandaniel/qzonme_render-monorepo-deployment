# QzonMe - How Well Do You Know Me Quiz Platform

## Overview
QzonMe is a social quiz web application that enables users to create and share personalized "How Well Do You Know Me?" quizzes with friends. The platform focuses on interactive, engaging quiz experiences with comprehensive security measures and data integrity.

### Key Features
- Create personalized quizzes with multiple question types
- Unique shareable URLs using custom domain (qzonme.com)
- Image support for questions via Cloudinary integration
- 7-day quiz validity period with automatic cleanup
- Dashboard functionality for creators to view quiz attempts
- Leaderboard system showcasing participants' scores
- Personalized remarks based on score performance
- Admin panel for managing contact messages
- SEO-optimized content with 21+ pages including blog posts

### Technology Stack
- **Frontend**: React 18 with TypeScript, Vite build system
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with shadcn/ui components
- **Image Storage**: Cloudinary for optimized image hosting
- **Authentication**: JWT-based secure authentication
- **Security**: Production-ready input validation and sanitization

## Project Architecture

### Database Schema
- **Users**: Basic user information (currently minimal usage)
- **Quizzes**: Quiz metadata with creator info, access codes, URL slugs
- **Questions**: Individual quiz questions with multiple types support
- **Quiz Attempts**: User attempt records with scores and answers

### Security Architecture (Updated January 1, 2025)
- **Input Validation**: Comprehensive Zod schema validation for all user inputs
- **Rate Limiting**: IP-based rate limiting for quiz creation and other sensitive operations
- **Admin Authentication**: JWT-based authentication replacing simple password system
- **HTML Sanitization**: All user-generated content sanitized to prevent XSS attacks
- **File Upload Security**: Secure filename sanitization and type validation
- **CORS Protection**: Proper CORS configuration for production deployment

### File Structure
- `client/`: React frontend application
- `server/`: Express backend with API routes
- `shared/`: Shared TypeScript schemas and types
- `public/`: Static assets and favicon

## Recent Changes

### January 1, 2025 - Homepage Content Update & Security Overhaul
- ✅ Updated homepage content to reflect broader quiz platform use case
- ✅ Changed main heading from "How Well Do Your Friends Know You?" to "Create Any Quiz in Minutes!"
- ✅ Updated meta description to include trivia, classroom games, fandom quizzes
- ✅ Modified features section to emphasize "Any Quiz Type" capabilities
- ✅ Updated testimonials to showcase different quiz types (Harry Potter, football, family)
- ✅ Enhanced "What is QzonMe" section with comprehensive quiz type examples
- ✅ Maintained fun, casual, youth-friendly tone while broadening appeal

### January 1, 2025 - Major Security Overhaul
- ✅ Implemented production-ready security measures
- ✅ Added comprehensive input validation using Zod schemas
- ✅ Upgraded admin authentication from simple password to JWT-based system
- ✅ Added rate limiting for quiz creation and sensitive operations
- ✅ Implemented HTML sanitization to prevent XSS attacks
- ✅ Secured Cloudinary credentials using environment variables
- ✅ Added proper authorization checks for admin endpoints
- ✅ Created SECURITY.md documentation with security guidelines

### Previous Updates
- ✅ Removed advertisement infrastructure (pending ad network approval)
- ✅ Fixed critical data loss bug with comprehensive local storage implementation
- ✅ Resolved sitemap.xml content-type issue for Google Search Console
- ✅ Updated blog posts with functional external links
- ✅ Implemented 7-day quiz cleanup system with Cloudinary image management

## Security Protocols

### Authentication Flow
1. Admin login requires username and password
2. Server validates credentials against secure hash
3. JWT token issued with 24-hour expiration
4. All admin routes require valid Bearer token
5. Tokens automatically refreshed or require re-login

### Data Protection
- All user inputs validated against strict schemas
- HTML content sanitized before storage
- File uploads restricted to specific types and sizes
- Database queries use parameterized statements via Drizzle ORM

## User Preferences
- Communication: Professional, concise, technical when appropriate
- Code Style: TypeScript with strong typing, functional components
- Architecture: Prefer backend validation over frontend-only solutions
- Security: Production-ready security measures over prototype solutions

## Environment Requirements
- DATABASE_URL: PostgreSQL connection string
- CLOUDINARY_API_KEY: Required for image uploads
- CLOUDINARY_API_SECRET: Required for image uploads
- VITE_GA_MEASUREMENT_ID: Google Analytics tracking (optional)

## Known Issues
- Cloudinary credentials need to be configured in production environment
- Some blog post content needs review for SEO optimization
- Mobile responsiveness could be enhanced for quiz creation interface

## Future Enhancements
- Email notification system for quiz responses
- Enhanced analytics and reporting dashboard
- Social media sharing integration
- Multi-language support
- Advanced question types (drag-and-drop, ranking)