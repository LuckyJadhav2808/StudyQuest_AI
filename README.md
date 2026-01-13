# 🎓 StudyQuest - Student Productivity Platform

> **Your All-in-One Study Companion** - A comprehensive web application designed to help students organize, track, and optimize their academic journey with AI-powered assistance.

![StudyQuest Banner](https://img.shields.io/badge/StudyQuest-Student%20Productivity-blue?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Authentication-orange?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Styling-38bdf8?style=flat-square)

---

## ✨ Features

### 🔐 **Authentication System**
- **Email/Password Authentication** via Firebase
- **Google Sign-In** integration for quick access
- Secure user session management
- Password reset functionality

### 📊 **Dashboard Overview**
- Real-time statistics display
  - Total tasks count
  - Upcoming events (next 7 days)
  - Study streak tracking
  - Total XP/points earned
- Quick action buttons for rapid navigation
- Personalized user greeting

### ✅ **Task Manager**
- Create, edit, and delete tasks
- Priority levels (High, Medium, Low)
- Due date tracking with overdue indicators
- Task completion with XP rewards
- Advanced filtering:
  - Search by title/description
  - Filter by priority
  - Filter by status (pending/completed)
- Real-time task statistics

### 📅 **Event Manager**
- Interactive calendar view
- Create and manage events with:
  - Title and description
  - Date and time scheduling
  - Start and end times
- Calendar navigation (previous/next month, today)
- Event statistics:
  - Total events
  - Today's events
  - Upcoming events (7 days)
  - Past events

### ⏰ **Timetable Manager**
- Weekly schedule management
- Class/activity scheduling
- Time slot organization
- Visual timetable grid

### 📝 **Notes Editor**
- Rich text editing with Quill.js
- Create, edit, and organize notes
- PDF export functionality
- Markdown support
- Categorization and tagging

### 📁 **Resource Storage**
- Upload and manage study materials
- File organization system
- Resource categorization
- Quick access to frequently used materials

### 🤖 **AI Assistant (Chatbot)**
- Powered by OpenRouter AI (DeepSeek Chat model)
- Study help and question answering
- Markdown-formatted responses
- Conversation history
- Context-aware assistance

### 📈 **Analytics Dashboard**
- Productivity tracking with Chart.js
- Visual data representation
- Study pattern analysis
- Performance metrics

### 🏆 **Gamification System**
- XP (Experience Points) system
- Achievement tracking
- Study streak monitoring
- Level progression
- Rewards for task completion

### 💾 **Backup & Restore**
- Data export functionality
- Backup management
- Restore from previous backups
- Data migration support

### 👤 **User Profile**
- Customizable profile information
- Avatar upload
- Personal goals setting
- Account preferences
- Display name customization

---

## 🛠️ Technology Stack

### **Frontend**
- **HTML5** - Structure and semantics
- **TailwindCSS** - Modern utility-first styling
- **JavaScript (ES6+)** - Application logic
- **Font Awesome** - Icon library
- **Google Fonts** - Inter & Outfit typography

### **Backend Services**
- **Firebase Authentication** - User authentication and session management
- **Supabase** - PostgreSQL database for data persistence
  - User profiles
  - Tasks
  - Events
  - Notes
  - Resources
  - Gamification data

### **Third-Party Libraries**
- **Quill.js** - Rich text editor for notes
- **html2pdf.js** - PDF export functionality
- **Marked.js** - Markdown parsing
- **DOMPurify** - XSS protection for markdown
- **Chart.js** - Data visualization for analytics

### **AI Integration**
- **OpenRouter API** - AI-powered chatbot using DeepSeek Chat model

---

## 📋 Prerequisites

Before running this project, ensure you have:

1. **Firebase Project**
   - Create a project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Email/Password authentication
   - (Optional) Enable Google Sign-In provider

2. **Supabase Project**
   - Create a project at [Supabase](https://supabase.com/)
   - Set up the required database tables (see Database Setup section)

3. **OpenRouter API Key**
   - Sign up at [OpenRouter](https://openrouter.ai/)
   - Generate an API key for AI chatbot functionality

4. **Modern Web Browser**
   - Chrome, Firefox, Safari, or Edge (latest versions)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/studyquest-ai.git
cd studyquest-ai
```

### 2. Configure Credentials
1. **Copy the configuration template:**
   ```bash
   cp config.example.js config.js
   ```

2. **Open `config.js`** and replace the placeholder values with your actual API credentials:

   ```javascript
   // Firebase Configuration
   const firebaseConfig = {
       apiKey: "YOUR_FIREBASE_API_KEY",
       // ... other firebase config
   };

   // Supabase Configuration
   const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

   // OpenRouter API Configuration
   const OPENROUTER_API_KEY = 'YOUR_OPENROUTER_API_KEY';
   ```

   > **Note:** `config.js` is gitignored to secure your API keys. Never commit this file to GitHub!

### 5. Database Setup

Run the following SQL commands in your Supabase SQL Editor to create the required tables:

#### **Tasks Table**
```sql
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (true);
```

#### **Events Table**
```sql
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events" ON events FOR SELECT USING (true);
CREATE POLICY "Users can insert own events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own events" ON events FOR UPDATE USING (true);
CREATE POLICY "Users can delete own events" ON events FOR DELETE USING (true);
```

#### **Notes Table**
```sql
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON notes FOR SELECT USING (true);
CREATE POLICY "Users can insert own notes" ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notes" ON notes FOR UPDATE USING (true);
CREATE POLICY "Users can delete own notes" ON notes FOR DELETE USING (true);
```

#### **Resources Table**
```sql
CREATE TABLE resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resources" ON resources FOR SELECT USING (true);
CREATE POLICY "Users can insert own resources" ON resources FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own resources" ON resources FOR UPDATE USING (true);
CREATE POLICY "Users can delete own resources" ON resources FOR DELETE USING (true);
```

#### **User Gamification Table**
```sql
CREATE TABLE user_gamification (
    user_id TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    achievements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gamification" ON user_gamification FOR SELECT USING (true);
CREATE POLICY "Users can insert own gamification" ON user_gamification FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own gamification" ON user_gamification FOR UPDATE USING (true);
```

### 6. Run the Application

Since this is a static web application, you can run it using:

#### **Option 1: Live Server (VS Code)**
1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

#### **Option 2: Python HTTP Server**
```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000 in your browser
```

#### **Option 3: Node.js HTTP Server**
```bash
npx http-server -p 8000
```

---

## 📖 Usage Guide

### **Getting Started**

1. **Register an Account**
   - Click "Register" on the login page
   - Enter your email and password (minimum 6 characters)
   - Or use "Continue with Google" for quick sign-up

2. **Explore the Dashboard**
   - View your productivity statistics
   - Use quick action buttons to navigate
   - Check your study streak and XP

3. **Create Your First Task**
   - Navigate to "Task Manager"
   - Click "Add New Task"
   - Fill in title, description, priority, and due date
   - Earn XP by completing tasks!

4. **Schedule Events**
   - Go to "Event Manager"
   - Click "Add New Event"
   - Set date, time, and details
   - View events in the interactive calendar

5. **Take Notes**
   - Open "Notes Editor"
   - Create rich-formatted notes
   - Export to PDF when needed

6. **Get AI Help**
   - Access "AI Assistant"
   - Ask study-related questions
   - Get instant, intelligent responses

---

## 🎨 Features in Detail

### **Dark Mode**
- Toggle between light and dark themes
- Preference saved in localStorage
- Smooth transition animations

### **Responsive Design**
- Mobile-friendly interface
- Adaptive sidebar navigation
- Touch-optimized controls

### **Gamification**
- Earn 10 XP for each completed task
- Level up as you progress
- Track your study streak
- Unlock achievements

### **Data Persistence**
- All data stored in Supabase
- Real-time synchronization
- Automatic backups
- Export/import functionality

---

## 🔒 Security Features

- Firebase Authentication for secure login
- Row Level Security (RLS) in Supabase
- User data isolation
- XSS protection with DOMPurify
- Secure API key management

---

## 🐛 Troubleshooting

### **Authentication Issues**
- Ensure Firebase Email/Password authentication is enabled
- Check Firebase configuration in `script.js`
- Verify internet connection

### **Database Errors**
- Confirm all Supabase tables are created
- Check RLS policies are properly set
- Verify Supabase URL and API key

### **AI Chatbot Not Working**
- Validate OpenRouter API key
- Check API quota/limits
- Ensure internet connectivity

---

## 🙏 Acknowledgments

- **Firebase** - Authentication services
- **Supabase** - Database and backend
- **OpenRouter** - AI API integration
- **TailwindCSS** - Styling framework
- **Font Awesome** - Icon library
- **Quill.js** - Rich text editor
- **Chart.js** - Data visualization

---

## 📞 Support

For support, email luckymanojjadhav@gmail.com or open an issue in the GitHub repository.

---

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Collaborative study groups
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Advanced analytics with ML insights
- [ ] Pomodoro timer integration
- [ ] Study material recommendations
- [ ] Flashcard system
- [ ] Quiz generator

---

**Made with ❤️ for students, by students**

