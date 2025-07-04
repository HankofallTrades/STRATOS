# STRATOS - Modern Fitness Tracking App

A comprehensive fitness tracking application built with modern web technologies, featuring strength training, cardio tracking, nutrition logging, and AI-powered coaching.

## 🏋️ Features

### Core Functionality
- **Workout Tracking**: Log strength training and cardio sessions with detailed set tracking
- **Exercise Library**: Comprehensive database of exercises with equipment variations
- **Session Focus**: Target specific training goals (strength, hypertrophy, zone2, zone5, speed, recovery)
- **Real-time Timing**: Track workout duration and set rest periods
- **Equipment Support**: Multiple equipment types (dumbbells, barbells, kettlebells, cables, bodyweight)

### Analytics & Progress
- **Performance Overview**: Track your fitness progress over time
- **One Rep Max Calculations**: Automatic 1RM estimations based on your lifts
- **Volume Tracking**: Monitor training volume and intensity
- **Recent Workouts**: Quick access to your training history

### Nutrition & Wellness
- **Protein Logging**: Track daily protein intake with simple logging
- **Sun Exposure Tracking**: Monitor daily sun exposure for vitamin D optimization
- **Hydration Goals**: Stay on top of your daily water intake

### AI Coach Integration
- **Personalized Recommendations**: Get workout suggestions based on your goals and history
- **Form Guidance**: Exercise technique tips and coaching cues
- **Program Design**: AI-assisted workout planning and periodization

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Redux Toolkit with persistence
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Supabase Auth
- **AI Integration**: Custom LLM client for coaching features
- **Build Tool**: Vite with hot reload

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Supabase account for database and authentication

### Installation

1. **Clone the repository**
   ```sh
   git clone <YOUR_GIT_URL>
   cd STRATOS
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   Run the Supabase migrations to set up your database schema:
   ```sh
   npx supabase db reset
   ```

5. **Start the development server**
   ```sh
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## 📱 Usage

1. **Sign Up/Login**: Create an account or sign in with existing credentials
2. **Complete Onboarding**: Set your fitness goals and preferences
3. **Start Training**: Begin logging workouts with the intuitive interface
4. **Track Progress**: Monitor your gains through the analytics dashboard
5. **Get Coached**: Use the AI coach for personalized guidance

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── core/           # shadcn/ui base components
│   ├── features/       # Feature-specific components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and integrations
│   ├── integrations/   # Supabase client and API functions
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper functions
├── pages/              # Page components
├── state/              # Redux store and slices
└── main.tsx           # Application entry point
```

## 🗄️ Database Schema

The app uses a normalized PostgreSQL schema with the following key tables:
- `profiles` - User profiles and preferences
- `exercises` - Exercise definitions and metadata
- `workouts` - Workout sessions
- `workout_exercises` - Exercises within workouts
- `exercise_sets` - Individual sets with reps, weight, time, distance
- `protein_intake` - Daily protein logging
- `sun_exposure_log` - Sun exposure tracking

## 🔧 Development

### Key Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

### Database Migrations
- Add new migrations in `supabase/migrations/`
- Apply migrations with `npx supabase db reset`

## 🚀 Deployment

The app can be deployed to any static hosting service:

1. **Build the project**
   ```sh
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting service of choice

### Recommended Platforms
- Vercel
- Netlify
- Cloudflare Pages

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

Built with ❤️ for the fitness community
