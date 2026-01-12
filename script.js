// ============================================
// CONFIGURATION SECTION
// ============================================

// Firebase Configuration
// TODO: Replace with your Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyB7ju28Uayy0PqQieEpp038OWHlXnvKN2I",
    authDomain: "studyquest-bfb6c.firebaseapp.com",
    projectId: "studyquest-bfb6c",
    storageBucket: "studyquest-bfb6c.firebasestorage.app",
    messagingSenderId: "873056599416",
    appId: "1:873056599416:web:6c83657028fb5fccc7dc8d",
    measurementId: "G-16JBSWXEED"
};

// Supabase Configuration
// TODO: Replace with your Supabase project credentials
const SUPABASE_URL = 'https://zkklwgrfdwnqowoaqsss.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2x3Z3JmZHducW93b2Fxc3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTA5NjIsImV4cCI6MjA4MzcyNjk2Mn0.b3QU-n33XMe9QbP6BY48InJa1Iw4aBAnXomuQ2p_GKQ';

// OpenRouter AI API Configuration
const OPENROUTER_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat'; // Fast and good model

// ============================================
// FIREBASE INITIALIZATION
// ============================================

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Initialize Supabase Client (renamed to avoid conflict with CDN global)
let supabaseClient;
try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error('Supabase initialization error:', error);
}

// ============================================
// GLOBAL STATE
// ============================================

let currentUser = null;
let currentTool = 'dashboard';
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// ============================================
// DOM ELEMENTS
// ============================================

// Auth Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginPage = document.getElementById('login-page');
const registerPage = document.getElementById('register-page');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');

// Dashboard Elements
const navItems = document.querySelectorAll('.nav-item');
const toolSections = document.querySelectorAll('.tool-section');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const userEmailDisplay = document.getElementById('user-email-display');
const themeToggle = document.getElementById('theme-toggle');
const loadingSpinner = document.getElementById('loading-spinner');

// Quick Action Buttons
const quickActionBtns = document.querySelectorAll('.quick-action-btn');

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

// Check Authentication State
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        showDashboard();

        if (userEmailDisplay) userEmailDisplay.textContent = user.email;

        // Also update profile tool email if it exists
        const profileEmail = document.getElementById('profile-email-display');
        if (profileEmail) profileEmail.textContent = user.email;

        // Load all data when user logs in
        TaskManager.loadTasks();
        EventManager.loadEvents();
        await GamificationManager.init();
        await ProfileManager.init();

        // Update dashboard stats after all data is loaded
        setTimeout(() => updateDashboardStats(), 500);
    } else {
        currentUser = null;
        showAuth();
    }
});

// Show Authentication Pages
function showAuth() {
    authContainer.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
}

// Show Dashboard
function showDashboard() {
    authContainer.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
}

// Toggle between Login and Register
showRegisterBtn.addEventListener('click', () => {
    loginPage.classList.add('hidden');
    registerPage.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerPage.classList.add('hidden');
    loginPage.classList.remove('hidden');
});

// Login Form Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('auth-error');

    showLoading(true);

    try {
        await auth.signInWithEmailAndPassword(email, password);
        errorDiv.classList.add('hidden');
    } catch (error) {
        errorDiv.textContent = getErrorMessage(error.code);
        errorDiv.classList.remove('hidden');
    } finally {
        showLoading(false);
    }
});

// Register Form Handler
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const errorDiv = document.getElementById('register-error');

    // Validate passwords match
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match!';
        errorDiv.classList.remove('hidden');
        return;
    }

    showLoading(true);

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        errorDiv.classList.add('hidden');

        // Initialize user data in Supabase
        await initializeUserData(email);
    } catch (error) {
        errorDiv.textContent = getErrorMessage(error.code);
        errorDiv.classList.remove('hidden');
    } finally {
        showLoading(false);
    }
});

// Logout Handler
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Failed to logout', 'error');
    }
});

// Google Sign-In Handler
const googleLoginBtn = document.getElementById('google-login-btn');
if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        showLoading(true);

        try {
            const result = await auth.signInWithPopup(provider);
            showNotification('Successfully logged in with Google!', 'success');

            // Initialize user data if new user
            if (result.additionalUserInfo && result.additionalUserInfo.isNewUser) {
                await initializeUserData(result.user.email);
            }
        } catch (error) {
            console.error('Google sign-in error:', error);

            // Show user-friendly error message
            let errorMessage = 'Failed to sign in with Google';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign-in cancelled';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Popup was blocked. Please allow popups for this site.';
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your connection.';
            }

            showNotification(errorMessage, 'error');

            // Also show in auth error div
            const authError = document.getElementById('auth-error');
            if (authError) {
                authError.textContent = errorMessage;
                authError.classList.remove('hidden');
            }
        } finally {
            showLoading(false);
        }
    });
}

// Get User-Friendly Error Messages
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/operation-not-allowed': '⚠️ Email/Password authentication is not enabled. Please go to Firebase Console → Authentication → Sign-in method → Enable Email/Password.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Please check your internet connection.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed.',
        'auth/popup-blocked': 'Popup was blocked by browser.',
        'auth/account-exists-with-different-credential': 'An account already exists with this email.'
    };

    return errorMessages[errorCode] || `An error occurred: ${errorCode}. Please try again.`;
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

// Handle Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tool = item.getAttribute('data-tool');
        switchTool(tool);
    });
});

// Handle Quick Actions
quickActionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tool = btn.getAttribute('data-tool');
        switchTool(tool);

        // Open modal for specific tools
        if (tool === 'events') {
            setTimeout(() => EventManager.openAddModal(), 100);
        } else if (tool === 'tasks') {
            // Use timeout to allow view to switch first
            setTimeout(() => {
                const addTaskBtn = document.getElementById('add-task-btn');
                if (addTaskBtn) addTaskBtn.click();
            }, 100);
        }
    });
});

// Switch Tool/Section
function switchTool(tool) {
    currentTool = tool;

    // Update active nav item
    navItems.forEach(item => {
        if (item.getAttribute('data-tool') === tool) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Hide all tool sections
    toolSections.forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected tool section
    const selectedSection = document.getElementById(`tool-${tool}`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }

    // Update page title
    updatePageTitle(tool);

    // Initialize tool-specific logic
    if (tool === 'events') {
        EventManager.loadEvents();
    } else if (tool === 'timetable') {
        TimetableManager.loadTimetable();
    } else if (tool === 'notes') {
        NotesManager.init();
    } else if (tool === 'resources') {
        ResourceManager.loadResources();
        if (!ResourceManager.listenersSet) {
            ResourceManager.setupEventListeners();
            ResourceManager.listenersSet = true;
        }
    } else if (tool === 'chatbot') {
        ChatManager.init();
    } else if (tool === 'analytics') {
        AnalyticsManager.loadData();
    } else if (tool === 'gamification') {
        GamificationManager.init();
    } else if (tool === 'backup') {
        BackupManager.init();
    } else if (tool === 'profile') {
        ProfileManager.init();
    }
}

// Update Page Title
function updatePageTitle(tool) {
    const titles = {
        'dashboard': { title: 'Dashboard', subtitle: 'Welcome back to StudyQuest' },
        'tasks': { title: 'Task Manager', subtitle: 'Organize and track your tasks' },
        'events': { title: 'Event Manager', subtitle: 'Manage your calendar events' },
        'timetable': { title: 'Timetable', subtitle: 'Manage your weekly schedule' },
        'notes': { title: 'Notes Editor', subtitle: 'Take and organize your notes' },
        'resources': { title: 'Resource Storage', subtitle: 'Store and manage your study materials' },
        'chatbot': { title: 'AI Assistant', subtitle: 'Get help with your studies' },
        'analytics': { title: 'Analytics Dashboard', subtitle: 'Track your productivity' },
        'gamification': { title: 'Achievements', subtitle: 'Your progress and rewards' },
        'backup': { title: 'Backup & Restore', subtitle: 'Manage your data backups' },
        'profile': { title: 'User Profile', subtitle: 'Customize your identity and goals' }
    };

    const toolInfo = titles[tool] || { title: 'StudyQuest', subtitle: 'Student Productivity Platform' };
    pageTitle.textContent = toolInfo.title;
    pageSubtitle.textContent = toolInfo.subtitle;
}

// ============================================
// THEME FUNCTIONS
// ============================================

// Initialize Theme
function initializeTheme() {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        themeToggle.innerHTML = '<i class="fas fa-sun text-gray-600 dark:text-gray-300"></i>';
    } else {
        document.documentElement.classList.remove('dark');
        themeToggle.innerHTML = '<i class="fas fa-moon text-gray-600 dark:text-gray-300"></i>';
    }
}

// Toggle Theme
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    initializeTheme();
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show/Hide Loading Spinner
function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
        } text-white`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Update Dashboard Statistics
function updateDashboardStats() {
    // Update Total Tasks
    const dashboardTotalTasks = document.getElementById('dashboard-total-tasks');
    if (dashboardTotalTasks && TaskManager.tasks) {
        dashboardTotalTasks.textContent = TaskManager.tasks.length;
    }

    // Update Upcoming Events (next 7 days)
    const dashboardUpcomingEvents = document.getElementById('dashboard-upcoming-events');
    if (dashboardUpcomingEvents && EventManager.events) {
        const today = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);

        const upcomingCount = EventManager.events.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= today && eventDate <= nextWeek;
        }).length;

        dashboardUpcomingEvents.textContent = upcomingCount;
    }

    // Update Study Streak
    const dashboardStreak = document.getElementById('dashboard-streak');
    if (dashboardStreak && GamificationManager) {
        const streak = GamificationManager.streak || 0;
        dashboardStreak.textContent = `${streak} day${streak !== 1 ? 's' : ''}`;
    }

    // Update Total XP
    const dashboardTotalXP = document.getElementById('dashboard-total-xp');
    if (dashboardTotalXP && GamificationManager) {
        dashboardTotalXP.textContent = GamificationManager.xp || 0;
    }
}

// ============================================
// SUPABASE FUNCTIONS
// ============================================

// Initialize User Data in Supabase
async function initializeUserData(email) {
    // This function will be expanded when we integrate Supabase
    // For now, it's a placeholder
    console.log('Initializing user data for:', email);

    // TODO: Create user profile in Supabase
    // TODO: Initialize empty tables for tasks, events, notes, etc.
}

// ============================================
// DATA MANAGEMENT FUNCTIONS
// ============================================

// These will be implemented as we add each tool

// Task Manager Functions
const TaskManager = {
    tasks: [],
    filteredTasks: [],

    async loadTasks() {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('user_id', currentUser.uid)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.tasks = data || [];
            this.filteredTasks = this.tasks;
            this.renderTasks();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
        } catch (error) {
            console.error('Error loading tasks:', error);
            // If table doesn't exist, create it
            if (error.code === '42P01') {
                await this.createTasksTable();
            }
        }
    },

    async createTasksTable() {
        console.log('Tasks table needs to be created in Supabase');
        showNotification('Please create the tasks table in Supabase. Check console for details.', 'warning');

        console.log(`
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

-- Create policy to allow users to see only their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own tasks" ON tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own tasks" ON tasks
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own tasks" ON tasks
    FOR DELETE USING (true);
        `);
    },

    async createTask(taskData) {
        if (!currentUser) return;

        try {
            const newTask = {
                user_id: currentUser.uid,
                title: taskData.title,
                description: taskData.description || '',
                priority: taskData.priority,
                status: 'pending',
                due_date: taskData.dueDate || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabaseClient
                .from('tasks')
                .insert([newTask])
                .select();

            if (error) throw error;

            this.tasks.unshift(data[0]);
            this.applyFilters();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
            showNotification('Task created successfully!', 'success');
        } catch (error) {
            console.error('Error creating task:', error);
            showNotification('Failed to create task', 'error');
        }
    },

    async updateTask(taskId, updates) {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('tasks')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', taskId)
                .select();

            if (error) throw error;

            const index = this.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.tasks[index] = data[0];
            }

            this.applyFilters();
            this.updateStatistics();
            showNotification('Task updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating task:', error);
            showNotification('Failed to update task', 'error');
        }
    },

    async deleteTask(taskId) {
        if (!currentUser) return;
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const { error } = await supabaseClient
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) throw error;

            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.applyFilters();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
            showNotification('Task deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            showNotification('Failed to delete task', 'error');
        }
    },

    async toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const newStatus = task.status === 'completed' ? 'pending' : 'completed';

        // Optimistic update
        task.status = newStatus;
        task.completed = newStatus === 'completed'; // Ensure legacy support
        this.renderTasks();

        if (newStatus === 'completed') {
            GamificationManager.addXP(10, 'Task Completed');
            GamificationManager.checkAchievements('task_complete');
            showNotification('Task Completed! +10 XP', 'success');
        }

        await this.updateTask(taskId, { status: newStatus });
    },

    applyFilters() {
        const searchTerm = document.getElementById('task-search')?.value.toLowerCase() || '';
        const priorityFilter = document.getElementById('task-priority-filter')?.value || 'all';
        const statusFilter = document.getElementById('task-status-filter')?.value || 'all';

        this.filteredTasks = this.tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchTerm) ||
                (task.description && task.description.toLowerCase().includes(searchTerm));
            const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

            return matchesSearch && matchesPriority && matchesStatus;
        });

        this.renderTasks();
    },

    renderTasks() {
        const container = document.getElementById('tasks-container');
        const emptyState = document.getElementById('tasks-empty-state');

        if (!container) return;

        if (this.filteredTasks.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = this.filteredTasks.map(task => this.createTaskCard(task)).join('');

        // Add event listeners
        this.filteredTasks.forEach(task => {
            const card = document.getElementById(`task-${task.id}`);
            if (!card) return;

            // Toggle completion
            const checkbox = card.querySelector('.task-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', () => this.toggleTaskStatus(task.id));
            }

            // Edit task
            const editBtn = card.querySelector('.edit-task-btn');
            if (editBtn) {
                editBtn.addEventListener('click', () => this.openEditModal(task));
            }

            // Delete task
            const deleteBtn = card.querySelector('.delete-task-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
            }
        });
    },

    createTaskCard(task) {
        const priorityColors = {
            high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        };

        const priorityIcons = {
            high: 'fa-exclamation-circle',
            medium: 'fa-minus-circle',
            low: 'fa-check-circle'
        };

        const isCompleted = task.status === 'completed';
        const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !isCompleted;

        return `
            <div id="task-${task.id}" class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition ${isCompleted ? 'opacity-60' : ''}">
                <div class="flex items-start gap-4">
                    <input type="checkbox" class="task-checkbox w-5 h-5 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${isCompleted ? 'checked' : ''}>
                    
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-2">
                            <h3 class="text-lg font-bold text-gray-800 dark:text-white ${isCompleted ? 'line-through' : ''}">${task.title}</h3>
                            <div class="flex gap-2">
                                <button class="edit-task-btn text-blue-500 hover:text-blue-600 p-2">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-task-btn text-red-500 hover:text-red-600 p-2">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        
                        ${task.description ? `<p class="text-gray-600 dark:text-gray-400 mb-3 ${isCompleted ? 'line-through' : ''}">${task.description}</p>` : ''}
                        
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="px-3 py-1 rounded-full text-xs font-semibold ${priorityColors[task.priority]}">
                                <i class="fas ${priorityIcons[task.priority]} mr-1"></i>${task.priority.toUpperCase()}
                            </span>
                            
                            ${task.due_date ? `
                                <span class="px-3 py-1 rounded-full text-xs font-semibold ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}">
                                    <i class="fas fa-calendar mr-1"></i>${new Date(task.due_date).toLocaleDateString()}
                                </span>
                            ` : ''}
                            
                            <span class="px-3 py-1 rounded-full text-xs font-semibold ${isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}">
                                ${isCompleted ? 'Completed' : 'Pending'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    updateStatistics() {
        const totalCount = document.getElementById('total-tasks-count');
        const completedCount = document.getElementById('completed-tasks-count');
        const pendingCount = document.getElementById('pending-tasks-count');
        const highPriorityCount = document.getElementById('high-priority-count');

        if (totalCount) totalCount.textContent = this.tasks.length;
        if (completedCount) completedCount.textContent = this.tasks.filter(t => t.status === 'completed').length;
        if (pendingCount) pendingCount.textContent = this.tasks.filter(t => t.status === 'pending').length;
        if (highPriorityCount) highPriorityCount.textContent = this.tasks.filter(t => t.priority === 'high').length;

        // Update dashboard total tasks count
        this.updateDashboardStats();
    },

    updateDashboardStats() {
        const dashboardTotalTasks = document.getElementById('dashboard-total-tasks');
        if (dashboardTotalTasks) {
            dashboardTotalTasks.textContent = this.tasks.length;
        }
    },

    openAddModal() {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const modalTitle = document.getElementById('task-modal-title');
        const submitText = document.getElementById('task-submit-text');

        if (!modal || !form) return;

        form.reset();
        document.getElementById('task-id').value = '';
        modalTitle.textContent = 'Add New Task';
        submitText.textContent = 'Add Task';
        modal.classList.remove('hidden');
    },

    openEditModal(task) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        const modalTitle = document.getElementById('task-modal-title');
        const submitText = document.getElementById('task-submit-text');

        if (!modal || !form) return;

        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-due-date').value = task.due_date || '';

        modalTitle.textContent = 'Edit Task';
        submitText.textContent = 'Update Task';
        modal.classList.remove('hidden');
    },

    closeModal() {
        const modal = document.getElementById('task-modal');
        if (modal) modal.classList.add('hidden');
    }
};

// Event Manager Functions
const EventManager = {
    events: [],
    currentDate: new Date(),
    selectedDate: new Date(),

    async loadEvents() {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('events')
                .select('*')
                .eq('user_id', currentUser.uid)
                .order('event_date', { ascending: true });

            if (error) throw error;

            this.events = data || [];
            this.renderCalendar();
            this.renderEventList();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
        } catch (error) {
            console.error('Error loading events:', error);
            if (error.code === '42P01') {
                await this.createEventsTable();
            }
        }
    },

    async createEventsTable() {
        console.log('Events table needs to be created in Supabase');
        showNotification('Please create the events table in Supabase. Check console for details.', 'warning');

        console.log(`
CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for all users" ON events
    FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_date ON events(event_date);
        `);
    },

    async createEvent(eventData) {
        if (!currentUser) return;

        try {
            const newEvent = {
                user_id: currentUser.uid,
                title: eventData.title,
                description: eventData.description || '',
                event_date: eventData.date,
                start_time: eventData.startTime,
                end_time: eventData.endTime || null,
                color: eventData.color || '#3b82f6',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabaseClient
                .from('events')
                .insert([newEvent])
                .select();

            if (error) throw error;

            this.events.push(data[0]);
            this.renderCalendar();
            this.renderEventList();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
            showNotification('Event created successfully!', 'success');
        } catch (error) {
            console.error('Error creating event:', error);
            showNotification('Failed to create event', 'error');
        }
    },

    async updateEvent(eventId, updates) {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('events')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', eventId)
                .select();

            if (error) throw error;

            const index = this.events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                this.events[index] = data[0];
            }

            this.renderCalendar();
            this.renderEventList();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
            showNotification('Event updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating event:', error);
            showNotification('Failed to update event', 'error');
        }
    },

    async deleteEvent(eventId) {
        if (!currentUser) return;
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            const { error } = await supabaseClient
                .from('events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;

            this.events = this.events.filter(e => e.id !== eventId);
            this.renderCalendar();
            this.renderEventList();
            this.updateStatistics();
            updateDashboardStats(); // Update dashboard
            showNotification('Event deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting event:', error);
            showNotification('Failed to delete event', 'error');
        }
    },

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthYearEl = document.getElementById('calendar-month-year');
        if (monthYearEl) {
            monthYearEl.textContent = `${monthNames[month]} ${year}`;
        }

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Get calendar container
        const calendarDates = document.getElementById('calendar-dates');
        if (!calendarDates) return;

        // Clear existing dates
        calendarDates.innerHTML = '';

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-date-cell empty';
            calendarDates.appendChild(emptyCell);
        }

        // Add date cells
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            const cellDate = new Date(year, month, day);
            const dateStr = this.formatDate(cellDate);

            // Check if this date has events
            const dayEvents = this.events.filter(e => e.event_date === dateStr);

            // Determine if this is today
            const isToday = cellDate.toDateString() === today.toDateString();

            // Determine if this is selected date
            const isSelected = cellDate.toDateString() === this.selectedDate.toDateString();

            dateCell.className = `calendar-date-cell p-2 text-center rounded-lg cursor-pointer transition ${isToday ? 'bg-blue-500 text-white font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                } ${isSelected && !isToday ? 'ring-2 ring-green-500' : ''}`;

            dateCell.innerHTML = `
                <div class="text-sm">${day}</div>
                ${dayEvents.length > 0 ? `
                    <div class="flex justify-center gap-1 mt-1">
                        ${dayEvents.slice(0, 3).map(e => `
                            <div class="w-2 h-2 rounded-full" style="background-color: ${e.color}"></div>
                        `).join('')}
                        ${dayEvents.length > 3 ? '<div class="text-xs">+</div>' : ''}
                    </div>
                ` : ''}
            `;

            dateCell.addEventListener('click', () => this.selectDate(cellDate));
            calendarDates.appendChild(dateCell);
        }
    },

    selectDate(date) {
        this.selectedDate = date;
        this.renderCalendar();
        this.renderEventList();
    },

    renderEventList() {
        const container = document.getElementById('events-list-container');
        const emptyState = document.getElementById('events-empty-state');
        const titleEl = document.getElementById('selected-date-title');

        if (!container) return;

        const dateStr = this.formatDate(this.selectedDate);
        const dayEvents = this.events.filter(e => e.event_date === dateStr);

        // Update title
        if (titleEl) {
            const isToday = this.selectedDate.toDateString() === new Date().toDateString();
            titleEl.textContent = isToday ? 'Events for Today' : `Events for ${this.selectedDate.toLocaleDateString()}`;
        }

        if (dayEvents.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = dayEvents.map(event => this.createEventCard(event)).join('');

        // Add event listeners
        dayEvents.forEach(event => {
            const editBtn = document.getElementById(`edit-event-${event.id}`);
            const deleteBtn = document.getElementById(`delete-event-${event.id}`);

            if (editBtn) {
                editBtn.addEventListener('click', () => this.openEditModal(event));
            }

            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteEvent(event.id));
            }
        });
    },

    createEventCard(event) {
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4" style="border-color: ${event.color}">
                <div class="flex items-start justify-between mb-2">
                    <h4 class="font-bold text-gray-800 dark:text-white">${event.title}</h4>
                    <div class="flex gap-2">
                        <button id="edit-event-${event.id}" class="text-blue-500 hover:text-blue-600 p-1">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button id="delete-event-${event.id}" class="text-red-500 hover:text-red-600 p-1">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${event.description ? `<p class="text-gray-600 dark:text-gray-400 text-sm mb-2">${event.description}</p>` : ''}
                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <i class="fas fa-clock"></i>
                    <span>${event.start_time}${event.end_time ? ` - ${event.end_time}` : ''}</span>
                </div>
            </div>
        `;
    },

    updateStatistics() {
        const totalCount = document.getElementById('total-events-count');
        const todayCount = document.getElementById('today-events-count');
        const upcomingCount = document.getElementById('upcoming-events-count');
        const pastCount = document.getElementById('past-events-count');

        const today = this.formatDate(new Date());
        const nextWeek = this.formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

        if (totalCount) totalCount.textContent = this.events.length;
        if (todayCount) todayCount.textContent = this.events.filter(e => e.event_date === today).length;
        if (upcomingCount) {
            const upcoming = this.events.filter(e => e.event_date > today && e.event_date <= nextWeek).length;
            upcomingCount.textContent = upcoming;
        }
        if (pastCount) pastCount.textContent = this.events.filter(e => e.event_date < today).length;

        // Update dashboard
        this.updateDashboardStats();
    },

    updateDashboardStats() {
        const dashboardUpcoming = document.getElementById('dashboard-upcoming-events');
        if (dashboardUpcoming) {
            const today = this.formatDate(new Date());
            const upcoming = this.events.filter(e => e.event_date >= today).length;
            dashboardUpcoming.textContent = upcoming;
        }
    },

    changeMonth(delta) {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
        this.renderCalendar();
    },

    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.renderCalendar();
        this.renderEventList();
    },

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    openAddModal() {
        const modal = document.getElementById('event-modal');
        const form = document.getElementById('event-form');
        const modalTitle = document.getElementById('event-modal-title');
        const submitText = document.getElementById('event-submit-text');

        if (!modal || !form) return;

        form.reset();
        document.getElementById('event-id').value = '';
        document.getElementById('event-date').value = this.formatDate(this.selectedDate);
        document.getElementById('event-color').value = '#3b82f6';
        document.getElementById('event-color-text').value = '#3b82f6';

        modalTitle.textContent = 'Add New Event';
        submitText.textContent = 'Add Event';
        modal.classList.remove('hidden');
    },

    openEditModal(event) {
        const modal = document.getElementById('event-modal');
        const form = document.getElementById('event-form');
        const modalTitle = document.getElementById('event-modal-title');
        const submitText = document.getElementById('event-submit-text');

        if (!modal || !form) return;

        document.getElementById('event-id').value = event.id;
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-date').value = event.event_date;
        document.getElementById('event-start-time').value = event.start_time;
        document.getElementById('event-end-time').value = event.end_time || '';
        document.getElementById('event-color').value = event.color;
        document.getElementById('event-color-text').value = event.color;

        modalTitle.textContent = 'Edit Event';
        submitText.textContent = 'Update Event';
        modal.classList.remove('hidden');
    },

    closeModal() {
        const modal = document.getElementById('event-modal');
        if (modal) modal.classList.add('hidden');
    }
};

// Timetable Manager Functions
const TimetableManager = {
    classes: [],

    async loadTimetable() {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('timetable')
                .select('*')
                .eq('user_id', currentUser.uid);

            if (error) throw error;

            this.classes = data || [];
            this.renderTimetable();
        } catch (error) {
            console.error('Error loading timetable:', error);
            if (error.code === '42P01') {
                await this.createTimetableTable();
            }
        }
    },

    async createTimetableTable() {
        console.log('Timetable table needs to be created in Supabase');
        showNotification('Please create the timetable table in Supabase. Check console for details.', 'warning');

        console.log(`
CREATE TABLE timetable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    professor TEXT,
    color TEXT DEFAULT '#8b5cf6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for users" ON timetable FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_timetable_user ON timetable(user_id);
        `);
    },

    async addClass(classData) {
        if (!currentUser) return;

        try {
            const newClass = {
                user_id: currentUser.uid,
                subject: classData.subject,
                day_of_week: classData.day,
                start_time: classData.startTime,
                end_time: classData.endTime,
                location: classData.location || '',
                professor: classData.professor || '',
                color: classData.color || '#8b5cf6'
            };

            const { data, error } = await supabaseClient
                .from('timetable')
                .insert([newClass])
                .select();

            if (error) throw error;

            this.classes.push(data[0]);
            this.renderTimetable();
            showNotification('Class added successfully!', 'success');
        } catch (error) {
            console.error('Error adding class:', error);
            showNotification('Failed to add class', 'error');
        }
    },

    async updateClass(classId, updates) {
        if (!currentUser) return;

        try {
            // Fix field names to match DB
            const dbUpdates = {
                subject: updates.subject,
                day_of_week: updates.day_of_week,
                start_time: updates.start_time,
                end_time: updates.end_time,
                location: updates.location,
                professor: updates.professor,
                color: updates.color,
                // updated_at is handled by DB triggers or we can set it
            };

            const { data, error } = await supabaseClient
                .from('timetable')
                .update(dbUpdates)
                .eq('id', classId)
                .select();

            if (error) throw error;

            const index = this.classes.findIndex(c => c.id === classId);
            if (index !== -1) {
                this.classes[index] = data[0];
            }

            this.renderTimetable();
            showNotification('Class updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating class:', error);
            showNotification('Failed to update class', 'error');
        }
    },

    async deleteClass(classId) {
        if (!currentUser) return;
        if (!confirm('Are you sure you want to delete this class?')) return;

        try {
            const { error } = await supabaseClient
                .from('timetable')
                .delete()
                .eq('id', classId);

            if (error) throw error;

            this.classes = this.classes.filter(c => c.id !== classId);
            this.renderTimetable();
            showNotification('Class deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting class:', error);
            showNotification('Failed to delete class', 'error');
        }
    },

    renderTimetable() {
        const container = document.getElementById('timetable-content');
        if (!container) return;

        const startHour = 8; // 8 AM
        const endHour = 20; // 8 PM
        const totalHours = endHour - startHour;
        const hourHeight = 60; // 60px per hour

        container.innerHTML = '';
        container.style.height = `${totalHours * hourHeight}px`;

        // Render Background Grid
        for (let i = 0; i < totalHours; i++) {
            const row = document.createElement('div');
            row.className = 'absolute w-full border-b border-gray-200 dark:border-gray-700 flex items-center';
            row.style.height = `${hourHeight}px`;
            row.style.top = `${i * hourHeight}px`;

            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'w-[12.5%] text-center text-xs text-gray-500 -mt-full pr-2';
            timeLabel.textContent = `${(startHour + i).toString().padStart(2, '0')}:00`;
            // row.appendChild(timeLabel); // We can place this differently if using grid layout

            // Actually, the HTML grid has a separate column for time.
            // Let's use the layout from HTML: grid-cols-8.
            // So we need to put indicators in the first column?
            // The container currently is just one big block.
            // Let's stick to absolute positioning for everything.

            // Add grid column lines
            for (let c = 1; c < 8; c++) {
                const colLine = document.createElement('div');
                colLine.className = 'absolute h-full border-r border-gray-100 dark:border-gray-700 pointer-events-none';
                colLine.style.left = `${(c / 8) * 100}%`;
                colLine.style.top = 0;
                container.appendChild(colLine);
            }

            container.appendChild(row);

            // Add time label absolutely positioned to left, centered in the slot
            const tLabel = document.createElement('div');
            tLabel.className = 'absolute left-0 w-[12.5%] flex items-center justify-center text-xs text-gray-500 font-medium z-20 pointer-events-none';
            tLabel.style.top = `${i * hourHeight}px`;
            tLabel.style.height = `${hourHeight}px`;
            tLabel.textContent = `${(startHour + i).toString().padStart(2, '0')}:00`;
            container.appendChild(tLabel);
        }

        // Render Classes
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        this.classes.forEach(cls => {
            const dayIndex = days.indexOf(cls.day_of_week);
            if (dayIndex === -1) return;

            const [startH, startM] = cls.start_time.split(':').map(Number);
            const [endH, endM] = cls.end_time.split(':').map(Number);

            const startVal = startH + startM / 60;
            const endVal = endH + endM / 60;

            if (startVal < startHour) return; // Clamped for view

            const top = (startVal - startHour) * hourHeight;
            const height = (endVal - startVal) * hourHeight;
            const left = ((dayIndex + 1) / 8) * 100; // +1 because col 0 is Time
            const width = (100 / 8);

            const block = document.createElement('div');
            block.className = 'absolute rounded-md p-2 text-white shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden z-10';
            block.style.top = `${top}px`;
            block.style.height = `${Math.max(height, 30)}px`; // Min height
            block.style.left = `calc(${left}% + 2px)`;
            block.style.width = `calc(${width}% - 4px)`;
            block.style.backgroundColor = cls.color;

            block.innerHTML = `
                <div class="font-bold text-xs truncate">${cls.subject}</div>
                <div class="text-[10px] truncate opacity-90">${cls.location || ''}</div>
                <div class="text-[9px] opacity-80 mt-0.5">${cls.start_time.slice(0, 5)} - ${cls.end_time.slice(0, 5)}</div>
                <div class="absolute top-1 right-1 opacity-0 hover:opacity-100 transition z-20">
                     <button class="delete-class-btn text-white hover:text-red-200" data-id="${cls.id}"><i class="fas fa-times"></i></button>
                </div>
            `;

            // Edit handler (click on block)
            block.addEventListener('click', () => this.openEditModal(cls));

            // Delete handler
            block.querySelector('.delete-class-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteClass(cls.id);
            });

            container.appendChild(block);
        });
    },

    openAddModal() {
        const modal = document.getElementById('class-modal');
        const form = document.getElementById('class-form');
        const title = document.getElementById('class-modal-title');
        const submitText = document.getElementById('class-submit-text');

        if (!modal || !form) return;

        // Reset state for add
        form.reset();
        document.getElementById('class-id').value = '';
        document.getElementById('class-subject').value = '';
        document.getElementById('class-color').value = '#8b5cf6';

        title.textContent = 'Add Class';
        submitText.textContent = 'Add Class';

        modal.classList.remove('hidden');
    },

    openEditModal(cls) {
        const modal = document.getElementById('class-modal');
        const title = document.getElementById('class-modal-title');
        const submitText = document.getElementById('class-submit-text');

        if (!modal) return;

        // Populate fields
        document.getElementById('class-id').value = cls.id;
        document.getElementById('class-subject').value = cls.subject;
        document.getElementById('class-day').value = cls.day_of_week;
        document.getElementById('class-location').value = cls.location || '';
        document.getElementById('class-start-time').value = cls.start_time;
        document.getElementById('class-end-time').value = cls.end_time;
        document.getElementById('class-professor').value = cls.professor || '';
        document.getElementById('class-color').value = cls.color;

        title.textContent = 'Edit Class';
        submitText.textContent = 'Update Class';

        modal.classList.remove('hidden');
    },

    closeModal() {
        const modal = document.getElementById('class-modal');
        if (modal) modal.classList.add('hidden');
    }
};


// Analytics Manager Functions
const AnalyticsManager = {
    charts: {},

    loadData() {
        if (!TaskManager.tasks) return;

        const tasks = TaskManager.tasks;
        this.updateStats(tasks);
        this.renderCharts(tasks);
    },

    updateStats(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // This Week Completed
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const completedThisWeek = tasks.filter(t => {
            if (!t.completed) return false;
            // Assuming we had a 'completed_at' field, but we might rely on created_at or due_date for approximation if not tracked
            // Since we don't strictly track 'completed_at' in the schema yet, we'll approximate using updated_at for now (or fallback to created_at)
            // Ideally schema should have completed_at. Let's use updated_at as a proxy for now.
            const date = new Date(t.updated_at || t.created_at);
            return date >= oneWeekAgo && date <= now;
        }).length;

        document.getElementById('stat-completion-rate').textContent = `${rate}%`;
        document.getElementById('stat-total-tasks').textContent = total;
        document.getElementById('stat-pending-tasks').textContent = pending;
        document.getElementById('stat-week-completed').textContent = completedThisWeek;
    },

    renderCharts(tasks) {
        // Prepare Data
        const completed = tasks.filter(t => t.completed).length;
        const pending = tasks.length - completed;

        // By Subject
        const subjects = {};
        tasks.forEach(t => {
            const subject = t.tag || 'Uncategorized'; // Using tag as subject proxy from TaskManager
            subjects[subject] = (subjects[subject] || 0) + 1;
        });

        // Weekly Trend (Last 7 days)
        const weeklyData = new Array(7).fill(0);
        const labels = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);
            labels.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        tasks.filter(t => t.completed).forEach(t => {
            const date = new Date(t.updated_at || t.created_at);
            const diffTime = Math.abs(today - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 7) {
                weeklyData[6 - diffDays]++;
            }
        });

        // Theme colors
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#e5e7eb' : '#374151';
        const gridColor = isDark ? '#374151' : '#f3f4f6';

        // Destroy existing charts
        if (this.charts.productivity) this.charts.productivity.destroy();
        if (this.charts.subjects) this.charts.subjects.destroy();
        if (this.charts.weekly) this.charts.weekly.destroy();

        // Chart 1: Productivity Split (Doughnut)
        const ctx1 = document.getElementById('chart-productivity').getContext('2d');
        this.charts.productivity = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    data: [completed, pending],
                    backgroundColor: ['#10b981', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor } }
                }
            }
        });

        // Chart 2: Subjects (Bar)
        const ctx2 = document.getElementById('chart-subjects').getContext('2d');
        this.charts.subjects = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: Object.keys(subjects),
                datasets: [{
                    label: 'Tasks',
                    data: Object.values(subjects),
                    backgroundColor: '#6366f1',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // Chart 3: Weekly Activity (Line)
        const ctx3 = document.getElementById('chart-weekly').getContext('2d');
        this.charts.weekly = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Completed Tasks',
                    data: weeklyData,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, stepSize: 1 } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
};

// Gamification Manager Functions
const GamificationManager = {
    xp: 0,
    level: 1,
    streak: 0,
    badges: [],

    // Config
    levelThresholds: [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000],
    levelTitles: [
        "Novice Explorer", "Apprentice Learner", "Dedicated Student", "Knowledge Seeker",
        "Academic Warrior", "Scholar", "Master of Focus", "Grandmaster Scholar",
        "Productivity Sage", "Legendary Achiever"
    ],
    availableBadges: [
        { id: 'first_task', icon: 'fas fa-check', title: 'First Step', desc: 'Complete your first task' },
        { id: 'streak_3', icon: 'fas fa-fire', title: 'On Fire', desc: 'Login 3 days in a row' },
        { id: 'streak_7', icon: 'fas fa-bolt', title: 'Unstoppable', desc: 'Login 7 days in a row' },
        { id: 'task_10', icon: 'fas fa-tasks', title: 'Task Master', desc: 'Complete 10 tasks' },
        { id: 'task_50', icon: 'fas fa-star', title: 'Productivity Pro', desc: 'Complete 50 tasks' },
        { id: 'night_owl', icon: 'fas fa-moon', title: 'Night Owl', desc: 'Complete a task after 10 PM' }
    ],

    async init() {
        await this.loadStats();
        this.checkStreak();
        this.renderStats();
        this.renderBadges();
        updateDashboardStats(); // Update dashboard on init

        // Listen for level up close
        document.getElementById('close-levelup-btn')?.addEventListener('click', () => {
            document.getElementById('levelup-modal').classList.add('hidden');
            document.getElementById('levelup-modal').classList.remove('flex');
        });

        // Notifications Button Listener
        const notifBtn = document.getElementById('notifications-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', () => {
                showNotification('No new notifications', 'info');
                // Optional: clear the red dot
                const dot = notifBtn.querySelector('.bg-red-500');
                if (dot) dot.style.display = 'none';
            });
        }
    },

    async loadStats() {
        if (!currentUser) {
            // Load from localStorage if not logged in
            const stats = JSON.parse(localStorage.getItem('gamification_stats')) || {};
            this.xp = stats.xp || 0;
            this.level = stats.level || 1;
            this.streak = stats.streak || 0;
            this.badges = stats.badges || [];
            this.lastLogin = stats.lastLogin;
            return;
        }

        try {
            // Try to load from Supabase first
            const { data, error } = await supabaseClient
                .from('user_gamification')
                .select('*')
                .eq('user_id', currentUser.uid)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No record found, load from localStorage and sync to Supabase
                    const stats = JSON.parse(localStorage.getItem('gamification_stats')) || {};
                    this.xp = stats.xp || 0;
                    this.level = stats.level || 1;
                    this.streak = stats.streak || 0;
                    this.badges = stats.badges || [];
                    this.lastLogin = stats.lastLogin;

                    // Create initial record in Supabase
                    await this.syncToSupabase();
                } else if (error.code === '42P01') {
                    // Table doesn't exist
                    await this.createGamificationTable();
                    // Load from localStorage
                    const stats = JSON.parse(localStorage.getItem('gamification_stats')) || {};
                    this.xp = stats.xp || 0;
                    this.level = stats.level || 1;
                    this.streak = stats.streak || 0;
                    this.badges = stats.badges || [];
                    this.lastLogin = stats.lastLogin;
                } else {
                    throw error;
                }
            } else if (data) {
                // Successfully loaded from Supabase
                this.xp = data.xp || 0;
                this.level = data.level || 1;
                this.streak = data.streak || 0;
                this.badges = data.badges || [];
                this.lastLogin = data.last_login;

                // Also update localStorage for offline access
                localStorage.setItem('gamification_stats', JSON.stringify({
                    xp: this.xp,
                    level: this.level,
                    streak: this.streak,
                    badges: this.badges,
                    lastLogin: this.lastLogin
                }));
            }
        } catch (error) {
            console.error('Error loading gamification stats from Supabase:', error);
            // Fallback to localStorage
            const stats = JSON.parse(localStorage.getItem('gamification_stats')) || {};
            this.xp = stats.xp || 0;
            this.level = stats.level || 1;
            this.streak = stats.streak || 0;
            this.badges = stats.badges || [];
            this.lastLogin = stats.lastLogin;
        }
    },

    saveStats() {
        const stats = {
            xp: this.xp,
            level: this.level,
            streak: this.streak,
            badges: this.badges,
            lastLogin: this.lastLogin
        };
        localStorage.setItem('gamification_stats', JSON.stringify(stats));

        // Sync to Supabase
        this.syncToSupabase();
    },

    checkStreak() {
        const today = new Date().toDateString();
        if (this.lastLogin !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (this.lastLogin === yesterday.toDateString()) {
                this.streak++;
                this.checkAchievements('streak');
            } else {
                this.streak = 1; // Reset or Start
            }
            this.lastLogin = today;
            this.saveStats();
        }
    },

    addXP(amount, reason = "Activity") {
        const oldLevel = this.level;
        this.xp += amount;

        // Calculate Level
        let newLevel = 1;
        for (let i = 0; i < this.levelThresholds.length; i++) {
            if (this.xp >= this.levelThresholds[i]) {
                newLevel = i + 1;
            } else {
                break;
            }
        }

        if (newLevel > oldLevel) {
            this.level = newLevel;
            this.showLevelUpModal();
        }

        this.saveStats();
        this.renderStats();
        updateDashboardStats(); // Update dashboard

        // Show small toast/notification for XP gain
        showNotification(`+${amount} XP: ${reason}`, 'success');

        // Add to history (UI only for now)
        this.addToHistory(reason, amount);
    },

    checkAchievements(triggerType, value) {
        let earned = false;

        // Logic to check badges based on trigger
        if (triggerType === 'task_complete') {
            if (TaskManager.tasks.filter(t => t.completed).length >= 1 && !this.hasBadge('first_task')) {
                this.unlockBadge('first_task');
                earned = true;
            }
            if (TaskManager.tasks.filter(t => t.completed).length >= 10 && !this.hasBadge('task_10')) {
                this.unlockBadge('task_10');
                earned = true;
            }
        }

        if (triggerType === 'streak') {
            if (this.streak >= 3 && !this.hasBadge('streak_3')) this.unlockBadge('streak_3');
            if (this.streak >= 7 && !this.hasBadge('streak_7')) this.unlockBadge('streak_7');
        }
    },

    hasBadge(id) {
        return this.badges.includes(id);
    },

    unlockBadge(id) {
        this.badges.push(id);
        const badge = this.availableBadges.find(b => b.id === id);
        showNotification(`Achievement Unlocked: ${badge.title}!`, 'success');
        this.saveStats();
        this.renderBadges();

        // Animate the specific badge
        setTimeout(() => {
            const badgeEl = document.getElementById(`badge-${id}`);
            if (badgeEl) {
                badgeEl.classList.add('scale-110', 'bg-yellow-100');
                setTimeout(() => badgeEl.classList.remove('scale-110'), 500);
            }
        }, 100);

        this.addXP(50, `Achievement: ${badge.title}`);
    },

    renderStats() {
        document.getElementById('profile-level-badge').textContent = `Lvl ${this.level}`;
        document.getElementById('modal-new-level').textContent = `Level ${this.level}`;

        const currentLevelBase = this.levelThresholds[this.level - 1] || 0;
        const nextLevelReq = this.levelThresholds[this.level] || (currentLevelBase * 2);
        const xpInLevel = this.xp - currentLevelBase;
        const reqInLevel = nextLevelReq - currentLevelBase;
        const progress = Math.min(100, Math.floor((xpInLevel / reqInLevel) * 100));

        document.getElementById('xp-text').textContent = `${this.xp} / ${nextLevelReq} XP`;
        document.getElementById('xp-progress-bar').style.width = `${progress}%`;
        document.getElementById('profile-title').textContent = this.levelTitles[Math.min(this.level - 1, this.levelTitles.length - 1)];

        document.getElementById('stat-total-xp').textContent = this.xp;
        document.getElementById('stat-streak').textContent = this.streak;

        // Sync Dashboard Widget
        const dashboardXP = document.getElementById('dashboard-total-xp');
        if (dashboardXP) {
            dashboardXP.textContent = this.xp;
        }
    },

    renderBadges() {
        const grid = document.getElementById('badges-grid');
        if (!grid) return;

        grid.innerHTML = this.availableBadges.map(badge => {
            const unlocked = this.hasBadge(badge.id);
            return `
                <div id="badge-${badge.id}" class="p-4 rounded-xl border ${unlocked ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-700 animate-fade-in' : 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50 grayscale opacity-60'} flex flex-col items-center text-center transition duration-300 transform">
                    <div class="w-16 h-16 rounded-full ${unlocked ? 'bg-yellow-100 text-yellow-500 dark:bg-yellow-800 dark:text-yellow-300' : 'bg-gray-200 text-gray-400 dark:bg-gray-600 dark:text-gray-500'} flex items-center justify-center text-3xl mb-3 shadow-sm ${unlocked ? 'animate-bounce-short' : ''}">
                        <i class="${badge.icon}"></i>
                    </div>
                    <h4 class="font-bold ${unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}">${badge.title}</h4>
                    <p class="text-xs ${unlocked ? 'text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-500'}">${badge.desc}</p>
                </div>
            `;
        }).join('');
    },

    addToHistory(action, xp) {
        const list = document.getElementById('xp-history-list');
        if (!list) return;

        // Remove empty state if present
        if (list.querySelector('.text-center')) {
            list.innerHTML = '';
        }

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm animate-fade-in';
        item.innerHTML = `
            <span class="text-sm text-gray-700 dark:text-gray-300">${action}</span>
            <span class="text-xs font-bold text-green-600 dark:text-green-400">+${xp} XP</span>
        `;

        list.prepend(item);
        if (list.children.length > 5) list.lastElementChild.remove();
    },

    showLevelUpModal() {
        const modal = document.getElementById('levelup-modal');
        document.getElementById('modal-new-title').textContent = this.levelTitles[Math.min(this.level - 1, this.levelTitles.length - 1)];
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.fireConfetti();
    },

    fireConfetti() {
        // Simple confetti implementation or placeholder
        // Using a basic canvas drawing for now since we didn't import a library, 
        // but for MVP let's just let the modal show. 
        // Ideally we'd use canvas-confetti library.
    },

    async syncToSupabase() {
        if (!currentUser) return;

        try {
            const gamificationData = {
                user_id: currentUser.uid,
                xp: this.xp,
                level: this.level,
                streak: this.streak,
                badges: this.badges,
                last_login: this.lastLogin,
                updated_at: new Date().toISOString()
            };

            // Use upsert to insert or update
            const { error } = await supabaseClient
                .from('user_gamification')
                .upsert(gamificationData, {
                    onConflict: 'user_id'
                });

            if (error) {
                if (error.code === '42P01') {
                    // Table doesn't exist, create it
                    await this.createGamificationTable();
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error syncing gamification stats to Supabase:', error);
            // Don't show error to user, just log it
        }
    },

    async createGamificationTable() {
        console.log('User gamification table needs to be created in Supabase');
        showNotification('Please create the user_gamification table in Supabase. Check console for SQL.', 'warning');

        console.log(`
CREATE TABLE user_gamification (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak INTEGER NOT NULL DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    last_login TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own gamification stats" ON user_gamification
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own gamification stats" ON user_gamification
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own gamification stats" ON user_gamification
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own gamification stats" ON user_gamification
    FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_gamification_user_id ON user_gamification(user_id);
        `);
    }
};

// Global Notification Function (Override/New)
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return; // Fallback or assume fallback already handled

    const div = document.createElement('div');
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    div.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center transform transition-all duration-300 translate-x-full hover:scale-105 pointer-events-auto`;
    div.innerHTML = `
        <i class="fas ${icons[type]} mr-2"></i>
        <span class="font-medium">${message}</span>
    `;

    container.appendChild(div);

    // Animate in
    requestAnimationFrame(() => {
        div.classList.remove('translate-x-full');
    });

    // Auto remove
    setTimeout(() => {
        div.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 300);
    }, 3000);
}

// Backup & Restore Manager
const BackupManager = {
    init() {
        // Event Listeners
        const exportBtn = document.getElementById('export-btn');
        const selectFileBtn = document.getElementById('select-file-btn');
        const fileInput = document.getElementById('import-file');
        const resetBtn = document.getElementById('reset-data-btn');
        const dropZone = document.getElementById('drop-zone');

        if (exportBtn) exportBtn.onclick = () => this.exportData();
        if (selectFileBtn) selectFileBtn.onclick = () => fileInput.click();
        if (fileInput) fileInput.onchange = (e) => this.importData(e.target.files[0]);
        if (resetBtn) resetBtn.onclick = () => this.resetData();

        // Drag and Drop
        if (dropZone) {
            dropZone.ondragover = (e) => {
                e.preventDefault();
                dropZone.classList.add('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/10');
            };
            dropZone.ondragleave = () => {
                dropZone.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/10');
            };
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-purple-500', 'bg-purple-50', 'dark:bg-purple-900/10');
                if (e.dataTransfer.files.length > 0) {
                    this.importData(e.dataTransfer.files[0]);
                }
            };
        }
    },

    exportData() {
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            user: currentUser ? currentUser.email : 'anonymous',
            // Local Storage Data
            gamification: JSON.parse(localStorage.getItem('gamification_stats') || '{}'),
            settings: {
                openRouterApiKey: localStorage.getItem('openRouterApiKey'),
                openRouterModel: localStorage.getItem('openRouterModel'),
                darkMode: localStorage.getItem('darkMode')
            },
            // Application Data (In-Memory Snapshopt)
            tasks: TaskManager.tasks,
            events: EventManager.events,
            // Note: Timetable and Notes would be here if we cache them
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studyquest_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Backup downloaded successfully', 'success');
    },

    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // version check could go here

                if (confirm(`Restore backup from ${new Date(data.timestamp).toLocaleDateString()}? This will merge data.`)) {
                    // Restore Local Storage
                    if (data.gamification) localStorage.setItem('gamification_stats', JSON.stringify(data.gamification));
                    if (data.settings) {
                        if (data.settings.openRouterApiKey) localStorage.setItem('openRouterApiKey', data.settings.openRouterApiKey);
                        if (data.settings.openRouterModel) localStorage.setItem('openRouterModel', data.settings.openRouterModel);
                    }

                    // Reload Managers
                    GamificationManager.loadStats();

                    // Import Tasks (Simple duplication check by title approx)
                    let importedCount = 0;
                    if (data.tasks) {
                        for (const task of data.tasks) {
                            // Strip ID to create new
                            const { id, user_id, created_at, updated_at, ...taskData } = task;
                            // Check if exists (simple check)
                            const exists = TaskManager.tasks.some(t => t.title === taskData.title && t.description === taskData.description);
                            if (!exists) {
                                await TaskManager.createTask({
                                    title: taskData.title,
                                    description: taskData.description,
                                    priority: taskData.priority,
                                    dueDate: taskData.due_date
                                });
                                importedCount++;
                            }
                        }
                    }

                    showNotification(`Restored! Added ${importedCount} tasks.`, 'success');
                    setTimeout(() => location.reload(), 1500);
                }
            } catch (error) {
                console.error('Import error:', error);
                showNotification('Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
    },

    resetData() {
        if (confirm('WARNING: This will clear all local data (Gamification, Settings). Supabase data will remain. Are you sure?')) {
            localStorage.clear();
            showNotification('Local data cleared', 'warning');
            setTimeout(() => location.reload(), 1000);
        }
    }
};

// Profile Manager Functions
const ProfileManager = {
    profile: {
        name: 'Student',
        bio: 'Ready to learn!',
        avatarId: 0,
        studyGoal: 4,
        themeColor: 'blue',
        joinedDate: new Date().toLocaleDateString()
    },

    avatars: [
        { id: 0, icon: 'fa-user', color: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
        { id: 1, icon: 'fa-user-graduate', color: 'bg-gradient-to-br from-blue-400 to-blue-600' },
        { id: 2, icon: 'fa-user-astronaut', color: 'bg-gradient-to-br from-gray-700 to-gray-900' },
        { id: 3, icon: 'fa-user-ninja', color: 'bg-gradient-to-br from-red-500 to-red-700' },
        { id: 4, icon: 'fa-user-tie', color: 'bg-gradient-to-br from-green-500 to-teal-600' },
        { id: 5, icon: 'fa-cat', color: 'bg-gradient-to-br from-yellow-400 to-orange-500' },
        { id: 6, icon: 'fa-dog', color: 'bg-gradient-to-br from-orange-600 to-amber-700' },
        { id: 7, icon: 'fa-robot', color: 'bg-gradient-to-br from-indigo-400 to-blue-500' },
        { id: 8, icon: 'fa-dragon', color: 'bg-gradient-to-br from-purple-600 to-pink-600' },
        { id: 9, icon: 'fa-brain', color: 'bg-gradient-to-br from-pink-400 to-rose-500' }
    ],

    async init() {
        // Load profile data from Supabase or localStorage
        await this.loadProfile();

        this.renderProfile();
        this.renderAvatarSelector();
        this.updateGlobalUI();

        // Listeners
        const form = document.getElementById('profile-form');
        if (form && !form.dataset.listening) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
            form.dataset.listening = "true";
        }

        const goalInput = document.getElementById('study-goal-input');
        if (goalInput) {
            goalInput.addEventListener('input', (e) => {
                document.getElementById('study-goal-display').textContent = `${e.target.value} hours`;
            });
        }

        const colorBtns = document.querySelectorAll('.theme-color-btn');
        colorBtns.forEach(btn => {
            btn.onclick = () => {
                this.profile.themeColor = btn.dataset.color;
                showNotification(`Theme set to ${this.profile.themeColor}`, 'info');
                // Visual feedback only for now
            };
        });
    },

    renderProfile() {
        // Update Sidebar/Header
        this.updateGlobalUI();

        // Update Profile Page inputs
        const nameInput = document.getElementById('profile-name-input');
        const bioInput = document.getElementById('profile-bio-input');
        const goalInput = document.getElementById('study-goal-input');

        if (nameInput) nameInput.value = this.profile.name;
        if (bioInput) bioInput.value = this.profile.bio;
        if (goalInput) {
            goalInput.value = this.profile.studyGoal;
            document.getElementById('study-goal-display').textContent = `${this.profile.studyGoal} hours`;
        }

        // Stats
        const joined = document.getElementById('profile-joined-date');
        const level = document.getElementById('profile-level-stat');
        if (joined) joined.textContent = this.profile.joinedDate;
        if (level && window.GamificationManager) level.textContent = GamificationManager.level || 1;

        // Visual
        this.updateAvatarDisplay();
    },

    renderAvatarSelector() {
        const grid = document.getElementById('avatar-selector');
        if (!grid) return;

        grid.innerHTML = this.avatars.map(av => `
            <div class="cursor-pointer aspect-square rounded-full flex items-center justify-center text-xl text-white shadow-sm transition hover:scale-110 ${av.color} ${this.profile.avatarId === av.id ? 'ring-4 ring-offset-2 ring-indigo-500' : ''}" 
                 onclick="ProfileManager.selectAvatar(${av.id})">
                <i class="fas ${av.icon}"></i>
            </div>
        `).join('');
    },

    selectAvatar(id) {
        this.profile.avatarId = id;
        this.renderAvatarSelector(); // Re-render to show selection ring
        this.updateAvatarDisplay();
    },

    updateAvatarDisplay() {
        const avatar = this.avatars.find(a => a.id === this.profile.avatarId) || this.avatars[0];

        // Profile Page Display
        const display = document.getElementById('profile-avatar-display');
        if (display) {
            display.className = `w-full h-full rounded-full flex items-center justify-center text-4xl shadow-md overflow-hidden ring-4 ring-white dark:ring-gray-700 ${avatar.color}`;
            display.innerHTML = `<i class="fas ${avatar.icon} text-white"></i>`;
        }

        // Profile Page Texts
        const nameDisp = document.getElementById('profile-name-display');
        const emailDisp = document.getElementById('profile-email-display');
        const bioDisp = document.getElementById('profile-bio-display');

        if (nameDisp) nameDisp.textContent = this.profile.name;
        if (emailDisp) emailDisp.textContent = currentUser ? currentUser.email : 'local user';
        if (bioDisp) bioDisp.textContent = `"${this.profile.bio}"`;
    },

    updateGlobalUI() {
        // Update Sidebar
        const sidebarName = document.getElementById('user-display-name');
        const sidebarAvatar = document.getElementById('sidebar-avatar');

        if (sidebarName) sidebarName.textContent = this.profile.name;

        if (sidebarAvatar) {
            const avatar = this.avatars.find(a => a.id === this.profile.avatarId) || this.avatars[0];
            sidebarAvatar.className = `w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-sm overflow-hidden ${avatar.color}`;
            sidebarAvatar.innerHTML = `<i class="fas ${avatar.icon} text-white"></i>`;
        }

        // Could update Greeting on Dashboard if element exists
    },

    saveProfile() {
        // Get values from inputs
        const nameInput = document.getElementById('profile-name-input');
        const bioInput = document.getElementById('profile-bio-input');
        const goalInput = document.getElementById('study-goal-input');

        if (nameInput) this.profile.name = nameInput.value;
        if (bioInput) this.profile.bio = bioInput.value;
        if (goalInput) this.profile.studyGoal = parseInt(goalInput.value);

        localStorage.setItem('user_profile', JSON.stringify(this.profile));
        this.renderProfile();
        showNotification('Profile saved successfully!', 'success');

        // Sync to Supabase
        this.syncToSupabase();

        if (currentUser && typeof currentUser.updateProfile === 'function') {
            currentUser.updateProfile({ displayName: this.profile.name }).catch(console.error);
        }
    },

    async loadProfile() {
        if (!currentUser) {
            // Load from localStorage if not logged in
            const saved = localStorage.getItem('user_profile');
            if (saved) {
                this.profile = { ...this.profile, ...JSON.parse(saved) };
            }
            return;
        }

        try {
            // Try to load from Supabase first
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('*')
                .eq('user_id', currentUser.uid)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No record found, load from localStorage and sync to Supabase
                    const saved = localStorage.getItem('user_profile');
                    if (saved) {
                        this.profile = { ...this.profile, ...JSON.parse(saved) };
                    } else if (currentUser) {
                        this.profile.name = currentUser.displayName || 'Student';
                    }

                    // Create initial record in Supabase
                    await this.syncToSupabase();
                } else if (error.code === '42P01') {
                    // Table doesn't exist
                    await this.createProfileTable();
                    // Load from localStorage
                    const saved = localStorage.getItem('user_profile');
                    if (saved) {
                        this.profile = { ...this.profile, ...JSON.parse(saved) };
                    } else if (currentUser) {
                        this.profile.name = currentUser.displayName || 'Student';
                    }
                } else {
                    throw error;
                }
            } else if (data) {
                // Successfully loaded from Supabase
                this.profile = {
                    name: data.name || 'Student',
                    bio: data.bio || 'Ready to learn!',
                    avatarId: data.avatar_id || 0,
                    studyGoal: data.study_goal || 4,
                    themeColor: data.theme_color || 'blue',
                    joinedDate: data.joined_date || new Date().toLocaleDateString()
                };

                // Also update localStorage for offline access
                localStorage.setItem('user_profile', JSON.stringify(this.profile));
            }
        } catch (error) {
            console.error('Error loading profile from Supabase:', error);
            // Fallback to localStorage
            const saved = localStorage.getItem('user_profile');
            if (saved) {
                this.profile = { ...this.profile, ...JSON.parse(saved) };
            } else if (currentUser) {
                this.profile.name = currentUser.displayName || 'Student';
            }
        }
    },

    async syncToSupabase() {
        if (!currentUser) return;

        try {
            const profileData = {
                user_id: currentUser.uid,
                name: this.profile.name,
                bio: this.profile.bio,
                avatar_id: this.profile.avatarId,
                study_goal: this.profile.studyGoal,
                theme_color: this.profile.themeColor,
                joined_date: this.profile.joinedDate,
                updated_at: new Date().toISOString()
            };

            // Use upsert to insert or update
            const { error } = await supabaseClient
                .from('user_profiles')
                .upsert(profileData, {
                    onConflict: 'user_id'
                });

            if (error) {
                if (error.code === '42P01') {
                    // Table doesn't exist, create it
                    await this.createProfileTable();
                } else {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error syncing profile to Supabase:', error);
            // Don't show error to user, just log it
        }
    },

    async createProfileTable() {
        console.log('User profiles table needs to be created in Supabase');
        showNotification('Please create the user_profiles table in Supabase. Check console for SQL.', 'warning');

        console.log(`
CREATE TABLE user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Student',
    bio TEXT DEFAULT 'Ready to learn!',
    avatar_id INTEGER DEFAULT 0,
    study_goal INTEGER DEFAULT 4,
    theme_color TEXT DEFAULT 'blue',
    joined_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
        `);
    }
};

// Resource Manager Functions
const ResourceManager = {
    resources: [],

    async loadResources() {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('resources')
                .select('*')
                .eq('user_id', currentUser.uid)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.resources = data || [];
            this.renderResources();
        } catch (error) {
            console.error('Error loading resources:', error);
            if (error.code === '42P01') {
                this.createResourcesTable();
            }
        }
    },

    async createResourcesTable() {
        console.log('Resources table needs to be created in Supabase');
        // This logic is mainly for developer notification during dev
    },

    renderResources(resourcesToRender = this.resources) {
        const grid = document.getElementById('resources-grid');
        if (!grid) return;

        if (resourcesToRender.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-20">
                    <i class="fas fa-folder-open text-6xl text-gray-200 dark:text-gray-700 mb-4"></i>
                    <p class="text-gray-500 dark:text-gray-400 text-lg">No resources found.</p>
                    <p class="text-gray-400 text-sm">Add a link to get started!</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = resourcesToRender.map(res => {
            const icon = this.getIconForType(res.type);
            const color = this.getColorForType(res.type);

            return `
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition p-4 border border-gray-100 dark:border-gray-700 flex flex-col relative group">
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                         <button class="delete-resource-btn text-gray-400 hover:text-red-500 p-1" data-id="${res.id}">
                            <i class="fas fa-trash"></i>
                         </button>
                    </div>
                    
                    <div class="flex items-start gap-4 mb-3">
                        <div class="w-12 h-12 rounded-lg ${color} flex items-center justify-center text-xl flex-shrink-0">
                            <i class="${icon}"></i>
                        </div>
                        <div class="overflow-hidden">
                            <h3 class="font-bold text-gray-800 dark:text-white truncate" title="${res.title}">${res.title}</h3>
                            <a href="${res.url}" target="_blank" class="text-xs text-indigo-500 hover:underline truncate block">
                                ${new URL(res.url).hostname.replace('www.', '')}
                            </a>
                        </div>
                    </div>
                    
                    <div class="mt-auto pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                        <span class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md capitalize">${res.subject || res.type}</span>
                        <span>${new Date(res.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <a href="${res.url}" target="_blank" class="absolute inset-0 z-0" style="z-index: 0;"></a>
                    <div class="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition">
                         <button onclick="ResourceManager.deleteResource('${res.id}')" class="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-600 rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 transition">
                            <i class="fas fa-trash-alt text-xs"></i>
                         </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    getIconForType(type) {
        switch (type) {
            case 'video': return 'fab fa-youtube';
            case 'pdf': return 'fas fa-file-pdf';
            case 'document': return 'fas fa-file-alt';
            default: return 'fas fa-link';
        }
    },

    getColorForType(type) {
        switch (type) {
            case 'video': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
            case 'pdf': return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
            case 'document': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
        }
    },

    async addResource(data) {
        if (!currentUser) return;

        const newResource = {
            user_id: currentUser.uid,
            title: data.title,
            url: data.url,
            type: data.type,
            subject: data.subject
        };

        try {
            const { data: result, error } = await supabaseClient
                .from('resources')
                .insert([newResource])
                .select();

            if (error) throw error;

            this.resources.unshift(result[0]);
            this.renderResources();
            showNotification('Resource added successfully', 'success');
            return true;
        } catch (error) {
            console.error('Error adding resource:', error);
            showNotification('Failed to add resource', 'error');
            return false;
        }
    },

    async deleteResource(id) {
        if (!confirm('Are you sure you want to delete this resource?')) return;

        try {
            const { error } = await supabaseClient
                .from('resources')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.resources = this.resources.filter(r => r.id !== id);
            this.renderResources();
            showNotification('Resource deleted', 'success');
        } catch (error) {
            console.error('Error deleting resource:', error);
            showNotification('Failed to delete', 'error');
        }
    },

    filterResources(type, query = '') {
        query = query.toLowerCase();

        const filtered = this.resources.filter(res => {
            const matchesType = type === 'all' || res.type === type;
            const matchesQuery = !query ||
                res.title.toLowerCase().includes(query) ||
                (res.subject && res.subject.toLowerCase().includes(query));
            return matchesType && matchesQuery;
        });

        this.renderResources(filtered);
    },

    setupEventListeners() {
        const modal = document.getElementById('resource-modal');
        const form = document.getElementById('resource-form');
        const addBtn = document.getElementById('add-resource-btn');
        const closeBtn = document.getElementById('close-resource-modal');
        const cancelBtn = document.getElementById('cancel-resource-btn');
        const searchInput = document.getElementById('resource-search');
        const filterBtns = document.querySelectorAll('.resource-filter');

        if (addBtn) addBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            form.reset();
        });

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

        if (form) form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: document.getElementById('resource-title').value,
                url: document.getElementById('resource-url').value,
                type: document.getElementById('resource-type').value,
                subject: document.getElementById('resource-subject').value
            };

            const success = await this.addResource(data);
            if (success) closeModal();
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const activeFilter = document.querySelector('.resource-filter.active').dataset.filter;
                this.filterResources(activeFilter, e.target.value);
            });
        }

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update UI
                filterBtns.forEach(b => {
                    b.classList.remove('active', 'bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900/50', 'dark:text-indigo-300');
                    b.classList.add('text-gray-600', 'hover:bg-gray-200', 'dark:text-gray-400', 'dark:hover:bg-gray-700');
                });
                btn.classList.add('active', 'bg-indigo-100', 'text-indigo-700', 'dark:bg-indigo-900/50', 'dark:text-indigo-300');
                btn.classList.remove('text-gray-600', 'hover:bg-gray-200', 'dark:text-gray-400', 'dark:hover:bg-gray-700');

                // Filter
                const query = searchInput ? searchInput.value : '';
                this.filterResources(btn.dataset.filter, query);
            });
        });
    }
};

// Notes Manager Functions
const NotesManager = {
    notes: [],
    currentNote: null,
    quill: null,
    saveTimeout: null,
    isInitialized: false,
    mode: 'edit',

    async init() {
        if (this.isInitialized) {
            this.loadNotes();
            return;
        }

        // Initialize Quill
        if (typeof Quill !== 'undefined') {
            this.quill = new Quill('#editor', {
                theme: 'snow',
                placeholder: 'Start typing your note...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        ['clean']
                    ]
                }
            });

            // Auto-save on change
            this.quill.on('text-change', () => {
                this.debounceSave();
            });

            // Allow title editing to trigger save
            document.getElementById('note-title').addEventListener('input', () => {
                this.debounceSave();
            });

            // Add listeners for buttons
            this.setupEventListeners();
        }

        await this.loadNotes();
        this.isInitialized = true;
    },

    setupEventListeners() {
        document.getElementById('new-note-btn').addEventListener('click', () => this.createNote());
        document.getElementById('save-note-btn').addEventListener('click', () => this.saveNote(true));
        document.getElementById('delete-note-btn').addEventListener('click', () => this.deleteNote());

        // Search
        document.getElementById('note-search').addEventListener('input', (e) => this.filterNotes(e.target.value));

        // Mode toggle
        document.getElementById('mode-edit').addEventListener('click', () => this.setMode('edit'));
        document.getElementById('mode-read').addEventListener('click', () => this.setMode('read'));
    },

    setMode(newMode) {
        this.mode = newMode;
        const editorContainer = document.getElementById('editor-container');
        const toolbar = document.querySelector('.ql-toolbar');
        const readView = document.getElementById('read-view');
        const editBtn = document.getElementById('mode-edit');
        const readBtn = document.getElementById('mode-read');

        if (newMode === 'read') {
            // Switch UI
            if (editorContainer) editorContainer.classList.add('hidden');
            if (toolbar) toolbar.classList.add('hidden');
            if (readView) {
                readView.classList.remove('hidden');
                // Render content
                if (this.currentNote) {
                    readView.innerHTML = `
                        <h1 class="text-3xl font-bold mb-4 text-gray-800 dark:text-white">${this.currentNote.title}</h1>
                        <div class="prose dark:prose-invert max-w-none">
                            ${this.currentNote.content || '<p class="text-gray-400 italic">No content</p>'}
                        </div>
                    `;
                }
            }

            // Button Styles
            editBtn.classList.replace('bg-white', 'hover:text-gray-700');
            editBtn.classList.replace('text-indigo-600', 'text-gray-500');
            editBtn.classList.remove('shadow-sm');

            readBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm', 'dark:bg-gray-600', 'dark:text-indigo-300');
            readBtn.classList.remove('text-gray-500', 'hover:text-gray-700');

        } else {
            // Edit Mode
            if (editorContainer) editorContainer.classList.remove('hidden');
            if (toolbar) toolbar.classList.remove('hidden');
            if (readView) readView.classList.add('hidden');

            // Button Styles
            readBtn.classList.replace('bg-white', 'hover:text-gray-700');
            readBtn.classList.replace('text-indigo-600', 'text-gray-500');
            readBtn.classList.remove('shadow-sm', 'dark:bg-gray-600', 'dark:text-indigo-300');

            editBtn.classList.add('bg-white', 'text-indigo-600', 'shadow-sm');
            editBtn.classList.remove('text-gray-500', 'hover:text-gray-700');
        }
    },

    async loadNotes() {
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('notes')
                .select('*')
                .eq('user_id', currentUser.uid)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            this.notes = data || [];
            this.renderNotesList();

            // Select first note if available and none selected
            if (this.notes.length > 0 && !this.currentNote) {
                this.selectNote(this.notes[0]);
            } else if (this.notes.length === 0) {
                // Create an initial welcome note locally if DB is empty? 
                // Better to just show empty state or create new.
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            if (error.code === '42P01') {
                this.createNotesTable();
            }
        }
    },

    async createNotesTable() {
        console.log('Notes table needs to be created in Supabase');
        showNotification('Please create the notes table in Supabase.', 'warning');
        // Log SQL for user (omitted for brevity, handled in docs)
    },

    renderNotesList(notesToRender = this.notes) {
        const container = document.getElementById('notes-list');
        if (!container) return;

        if (notesToRender.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 mt-10">
                    <i class="fas fa-sticky-note text-4xl mb-3 opacity-50"></i>
                    <p class="text-sm">No notes found</p>
                </div>`;
            return;
        }

        container.innerHTML = notesToRender.map(note => `
            <div class="note-item p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${this.currentNote && this.currentNote.id === note.id ? 'bg-indigo-50 dark:bg-gray-700 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}" 
                 onclick="NotesManager.selectNoteById('${note.id}')">
                <h4 class="font-bold text-gray-800 dark:text-gray-200 truncate text-sm">${note.title || 'Untitled'}</h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    ${this.stripHtml(note.content) || 'No content...'}
                </p>
                <div class="text-[10px] text-gray-400 mt-1 text-right">
                    ${new Date(note.updated_at).toLocaleDateString()}
                </div>
            </div>
        `).join('');
    },

    selectNoteById(id) {
        const note = this.notes.find(n => n.id === id);
        if (note) this.selectNote(note);
    },

    selectNote(note) {
        this.currentNote = note;
        document.getElementById('note-title').value = note.title;

        // Load content into Quill
        if (this.quill) {
            // Use silent update to avoid triggering auto-save immediately
            this.quill.root.innerHTML = note.content || '';
        }

        this.renderNotesList(); // Re-render to highlight selection

        // If in read mode, update the read view
        if (this.mode === 'read') {
            this.setMode('read'); // Re-trigger content update
        }
    },

    async createNote() {
        if (!currentUser) return;

        const newNote = {
            user_id: currentUser.uid,
            title: 'Untitled Note',
            content: '',
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabaseClient
                .from('notes')
                .insert([newNote])
                .select();

            if (error) throw error;

            const createdNote = data[0];
            this.notes.unshift(createdNote);
            this.selectNote(createdNote);
            this.setMode('edit'); // Always switch to edit for new note
        } catch (error) {
            console.error('Error creating note:', error);
            showNotification('Failed to create note', 'error');
        }
    },

    debounceSave() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveNote(), 1000);
    },

    async saveNote(showToast = false) {
        if (!currentUser || !this.currentNote) return;

        const title = document.getElementById('note-title').value;
        const content = this.quill.root.innerHTML;

        // Skip if nothing changed (optional optimization, but keep simple for now)

        try {
            const { error } = await supabaseClient
                .from('notes')
                .update({
                    title: title,
                    content: content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentNote.id);

            if (error) throw error;

            // Update local state
            this.currentNote.title = title;
            this.currentNote.content = content;
            this.currentNote.updated_at = new Date().toISOString();

            this.renderNotesList();

            if (showToast) showNotification('Note saved', 'success');
        } catch (error) {
            console.error('Error saving note:', error);
            if (showToast) showNotification('Failed to save', 'error');
        }
    },

    async deleteNote() {
        if (!currentUser || !this.currentNote) return;
        if (!confirm('Delete this note?')) return;

        try {
            const { error } = await supabaseClient
                .from('notes')
                .delete()
                .eq('id', this.currentNote.id);

            if (error) throw error;

            this.notes = this.notes.filter(n => n.id !== this.currentNote.id);
            this.currentNote = null;

            // Select next available
            if (this.notes.length > 0) {
                this.selectNote(this.notes[0]);
            } else {
                document.getElementById('note-title').value = '';
                this.quill.setText('');
                this.renderNotesList();
            }

            showNotification('Note deleted', 'success');
        } catch (error) {
            console.error('Error deleting note:', error);
            showNotification('Error deleting note', 'error');
        }
    },

    filterNotes(query) {
        const lowerQuery = query.toLowerCase();
        const filtered = this.notes.filter(n =>
            (n.title && n.title.toLowerCase().includes(lowerQuery)) ||
            (n.content && this.stripHtml(n.content).toLowerCase().includes(lowerQuery))
        );
        this.renderNotesList(filtered);
    },

    stripHtml(html) {
        if (!html) return '';
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    },

    exportPDF(quality) {
        if (!this.currentNote) return;

        const content = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">${this.currentNote.title}</h1>
                <div style="margin-top: 20px; line-height: 1.6; color: #555;">
                    ${this.currentNote.content}
                </div>
                <div style="margin-top: 40px; font-size: 10px; color: #999; border-top: 1px solid #eee; pt-2 text-center">
                    Generated by StudyQuest
                </div>
            </div>
        `;

        const element = document.createElement('div');
        element.innerHTML = content;

        // Config based on quality
        let imageQuality = 0.98;
        let scale = 2; // Default (Medium)

        if (quality === 'low') {
            imageQuality = 0.5;
            scale = 1;
        } else if (quality === 'high') {
            imageQuality = 1.0;
            scale = 4;
        }

        const opt = {
            margin: 0.5,
            filename: `${this.currentNote.title || 'note'}.pdf`,
            image: { type: 'jpeg', quality: imageQuality },
            html2canvas: { scale: scale },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Use html2pdf lib
        if (typeof html2pdf !== 'undefined') {
            showNotification('Generating PDF...', 'info');
            html2pdf().set(opt).from(element).save().then(() => {
                showNotification('PDf Exported!', 'success');
            }).catch(err => {
                console.error(err);
                showNotification('Export failed', 'error');
            });
        } else {
            showNotification('PDF Library not loaded', 'error');
        }
    }
};

// ============================================
// INITIALIZATION
// ============================================

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    if (window.ProfileManager) ProfileManager.init();
    if (window.GamificationManager) GamificationManager.init();
    console.log('StudyQuest initialized successfully!');

    // Task Manager Event Listeners
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const closeTaskModal = document.getElementById('close-task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task-btn');
    const taskForm = document.getElementById('task-form');
    const taskSearch = document.getElementById('task-search');
    const taskPriorityFilter = document.getElementById('task-priority-filter');
    const taskStatusFilter = document.getElementById('task-status-filter');

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => TaskManager.openAddModal());
    }

    if (closeTaskModal) {
        closeTaskModal.addEventListener('click', () => TaskManager.closeModal());
    }

    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', () => TaskManager.closeModal());
    }

    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskId = document.getElementById('task-id').value;
            const taskData = {
                title: document.getElementById('task-title').value,
                description: document.getElementById('task-description').value,
                priority: document.getElementById('task-priority').value,
                dueDate: document.getElementById('task-due-date').value
            };

            if (taskId) {
                // Update existing task
                await TaskManager.updateTask(taskId, {
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority,
                    due_date: taskData.dueDate || null
                });
            } else {
                // Create new task
                await TaskManager.createTask(taskData);
            }

            TaskManager.closeModal();
        });
    }

    // Filter and search event listeners
    if (taskSearch) {
        taskSearch.addEventListener('input', () => TaskManager.applyFilters());
    }

    if (taskPriorityFilter) {
        taskPriorityFilter.addEventListener('change', () => TaskManager.applyFilters());
    }

    if (taskStatusFilter) {
        taskStatusFilter.addEventListener('change', () => TaskManager.applyFilters());
    }

    // ============================================
    // EVENT MANAGER LISTENERS
    // ============================================

    // Open Add Event Modal
    const addEventBtn = document.getElementById('add-event-btn');
    const addEventFromEmpty = document.getElementById('add-event-from-empty');
    const closeEventModalBtn = document.getElementById('close-event-modal');
    const cancelEventBtn = document.getElementById('cancel-event-btn');
    const eventForm = document.getElementById('event-form');

    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => EventManager.openAddModal());
    }

    if (addEventFromEmpty) {
        addEventFromEmpty.addEventListener('click', () => EventManager.openAddModal());
    }

    // Close Modal Handlers
    if (closeEventModalBtn) {
        closeEventModalBtn.addEventListener('click', () => EventManager.closeModal());
    }

    if (cancelEventBtn) {
        cancelEventBtn.addEventListener('click', () => EventManager.closeModal());
    }

    // Form Submission
    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const eventId = document.getElementById('event-id').value;
            const eventData = {
                title: document.getElementById('event-title').value,
                description: document.getElementById('event-description').value,
                date: document.getElementById('event-date').value,
                startTime: document.getElementById('event-start-time').value,
                endTime: document.getElementById('event-end-time').value,
                color: document.getElementById('event-color').value
            };

            if (eventId) {
                await EventManager.updateEvent(eventId, {
                    title: eventData.title,
                    description: eventData.description,
                    event_date: eventData.date,
                    start_time: eventData.startTime,
                    end_time: eventData.endTime || null,
                    color: eventData.color
                });
            } else {
                await EventManager.createEvent(eventData);
            }

            EventManager.closeModal();
        });
    }

    // Calendar Navigation
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const todayBtn = document.getElementById('today-btn');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => EventManager.changeMonth(-1));
    }

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => EventManager.changeMonth(1));
    }

    if (todayBtn) {
        todayBtn.addEventListener('click', () => EventManager.goToToday());
    }

    // Color Picker Sync
    const eventColor = document.getElementById('event-color');
    const eventColorText = document.getElementById('event-color-text');

    if (eventColor && eventColorText) {
        eventColor.addEventListener('input', (e) => {
            eventColorText.value = e.target.value;
        });
    }

    // ============================================
    // TIMETABLE MANAGER LISTENERS
    // ============================================

    // Open Add Class Modal
    const addClassBtn = document.getElementById('add-class-btn');
    const closeClassModalBtn = document.getElementById('close-class-modal');
    const cancelClassBtn = document.getElementById('cancel-class-btn');
    const classForm = document.getElementById('class-form');

    if (addClassBtn) {
        addClassBtn.addEventListener('click', () => TimetableManager.openAddModal());
    }

    // Close Modal Handlers
    if (closeClassModalBtn) {
        closeClassModalBtn.addEventListener('click', () => TimetableManager.closeModal());
    }

    if (cancelClassBtn) {
        cancelClassBtn.addEventListener('click', () => TimetableManager.closeModal());
    }

    // Form Submission
    if (classForm) {
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const classId = document.getElementById('class-id').value;
            const classData = {
                subject: document.getElementById('class-subject').value,
                day: document.getElementById('class-day').value,
                startTime: document.getElementById('class-start-time').value,
                endTime: document.getElementById('class-end-time').value,
                location: document.getElementById('class-location').value,
                professor: document.getElementById('class-professor').value,
                color: document.getElementById('class-color').value
            };

            if (classId) {
                await TimetableManager.updateClass(classId, {
                    subject: classData.subject,
                    day_of_week: classData.day,
                    start_time: classData.startTime,
                    end_time: classData.endTime,
                    location: classData.location,
                    professor: classData.professor,
                    color: classData.color
                });
            } else {
                await TimetableManager.addClass(classData);
            }

            TimetableManager.closeModal();
        });
    }
});

// ============================================
// MOBILE RESPONSIVENESS
// ============================================

// Handle mobile sidebar toggle
let isMobileSidebarOpen = false;

// Create mobile menu button (will be added in future updates)
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    isMobileSidebarOpen = !isMobileSidebarOpen;

    if (isMobileSidebarOpen) {
        sidebar.classList.add('mobile-open');
    } else {
        sidebar.classList.remove('mobile-open');
    }
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const isClickInsideSidebar = sidebar.contains(e.target);

    if (!isClickInsideSidebar && isMobileSidebarOpen && window.innerWidth < 768) {
        toggleMobileSidebar();
    }
});

// ============================================
// CHAT MANAGER (AI ASSISTANT)
// ============================================

const ChatManager = {
    messages: [],
    conversationHistory: [],
    isProcessing: false,
    initialized: false,

    init() {
        // Prevent duplicate initialization
        if (this.initialized) return;
        this.initialized = true;

        const chatForm = document.getElementById('chat-form');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-chat-btn');
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');

        // Enable send button initially (will be controlled by input)
        if (sendBtn) sendBtn.disabled = true;

        // Auto-resize textarea
        if (chatInput) {
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = chatInput.scrollHeight + 'px';
                if (sendBtn) sendBtn.disabled = chatInput.value.trim().length === 0;
            });

            // Submit on Enter (Shift+Enter for new line)
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.value.trim()) {
                        chatForm.dispatchEvent(new Event('submit'));
                    }
                }
            });
        }

        // Form submit
        if (chatForm) {
            chatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message && !this.isProcessing) {
                    await this.sendMessage(message);
                    chatInput.value = '';
                    chatInput.style.height = 'auto';
                    if (sendBtn) sendBtn.disabled = true;
                }
            });
        }

        // Clear chat
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear all messages?')) {
                    this.clearChat();
                }
            });
        }

        // Suggested prompts
        const suggestedPrompts = document.querySelectorAll('.suggested-prompt');
        suggestedPrompts.forEach(btn => {
            btn.addEventListener('click', async () => {
                const prompt = btn.textContent.trim();
                if (prompt && !this.isProcessing) {
                    // Hide suggestions after first use
                    const promptsContainer = document.getElementById('suggested-prompts');
                    if (promptsContainer) {
                        promptsContainer.style.display = 'none';
                    }

                    // Send the message
                    await this.sendMessage(prompt);
                }
            });
        });
    },

    async sendMessage(userMessage, isQuickAction = false) {
        if (this.isProcessing) return;

        this.isProcessing = true;
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) sendBtn.disabled = true;

        try {
            // Add user message to UI
            this.addMessageToUI('user', userMessage);

            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });

            // Show typing indicator
            this.showTypingIndicator();

            // Call OpenRouter API
            const response = await this.callOpenRouterAPI(userMessage);

            // Remove typing indicator
            this.removeTypingIndicator();

            if (response) {
                // Add AI response to UI
                this.addMessageToUI('assistant', response);

                // Add to conversation history
                this.conversationHistory.push({
                    role: 'model',
                    parts: [{ text: response }]
                });

                // Save to Supabase (optional)
                this.saveToSupabase(userMessage, response);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.removeTypingIndicator();
            this.addMessageToUI('assistant', '❌ Sorry, I encountered an error. Please try again.');
            showNotification('Failed to get response from AI', 'error');
        } finally {
            this.isProcessing = false;
            if (sendBtn) sendBtn.disabled = false;
        }
    },

    async callOpenRouterAPI(message) {
        try {
            // Build messages array for OpenRouter
            const messages = [
                {
                    role: 'system',
                    content: 'You are a helpful, encouraging student study assistant. You help with homework, explain complex topics simply, generate quizzes, summarize notes, help with essays, and create study plans. Use markdown for formatting when helpful.'
                }
            ];

            // Add conversation history
            for (const msg of this.conversationHistory) {
                messages.push({
                    role: msg.role === 'model' ? 'assistant' : msg.role,
                    content: msg.parts[0].text
                });
            }

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'StudyQuest AI'
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error Response:', errorData);
                throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            console.log('API Response:', data);

            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('OpenRouter API error:', error);
            throw error;
        }
    },

    addMessageToUI(role, content) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex gap-4 max-w-3xl mx-auto message-fade-in';

        if (role === 'user') {
            messageDiv.innerHTML = `
                <div class="flex-1"></div>
                <div class="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm text-sm max-w-[80%]">
                    ${this.escapeHtml(content)}
                </div>
                <div class="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 flex-shrink-0 text-sm mt-1">
                    <i class="fas fa-user"></i>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 text-sm mt-1">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 max-w-[80%]">
                    <div class="markdown-content">${this.renderMarkdown(content)}</div>
                    <div class="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button onclick="ChatManager.copyMessage(this)" class="text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition" title="Copy">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex gap-4 max-w-3xl mx-auto';
        typingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 text-sm mt-1">
                <i class="fas fa-robot"></i>
            </div>
            <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-200 dark:border-gray-700">
                <div class="flex gap-1">
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
            </div>
        `;

        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    },

    renderMarkdown(text) {
        // Simple markdown rendering
        let html = text;

        // Code blocks
        html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return `<pre class="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm">${this.escapeHtml(code.trim())}</code></pre>`;
        });

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">$1</code>');

        // Bold
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Lists
        html = html.replace(/^\* (.+)$/gm, '<li class="ml-4">$1</li>');
        html = html.replace(/(<li.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1 my-2">$1</ul>');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    copyMessage(button) {
        const messageDiv = button.closest('.markdown-content');
        if (messageDiv) {
            const text = messageDiv.innerText;
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!', 'success');
            });
        }
    },

    clearChat() {
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            // Keep welcome message, remove others
            const messages = messagesContainer.querySelectorAll('.message-fade-in');
            messages.forEach(msg => msg.remove());

            this.conversationHistory = [];
            this.messages = [];

            // Show suggestions again
            const promptsContainer = document.getElementById('suggested-prompts');
            if (promptsContainer) {
                promptsContainer.style.display = 'flex';
            }

            showNotification('Chat cleared', 'success');
        }
    },

    async saveToSupabase(userMessage, aiResponse) {
        if (!currentUser) return;

        try {
            const conversationId = this.currentConversationId || crypto.randomUUID();
            this.currentConversationId = conversationId;

            // Save user message
            await supabaseClient.from('chat_history').insert({
                user_id: currentUser.uid,
                conversation_id: conversationId,
                role: 'user',
                message: userMessage,
                created_at: new Date().toISOString()
            });

            // Save AI response
            await supabaseClient.from('chat_history').insert({
                user_id: currentUser.uid,
                conversation_id: conversationId,
                role: 'assistant',
                message: aiResponse,
                created_at: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving to Supabase:', error);
            // Don't show error to user, just log it
        }
    }
};

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showNotification('An unexpected error occurred', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('An unexpected error occurred', 'error');
});
