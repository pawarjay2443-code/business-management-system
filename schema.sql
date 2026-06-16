-- Supabase Database Schema for AI Business Management Platform
-- Includes Authentication, User Roles, Departments, Teams, Projects, Tasks, Activity Logs, Reports, Performance Metrics, and AI Insights.

BEGIN;

-- =========================================================================
-- 1. EXTENSIONS & CUSTOM TYPES/ENUMS
-- =========================================================================

-- Enable uuid-ossp extension for gen_random_uuid() if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Roles
CREATE TYPE user_role AS ENUM ('Admin', 'Manager', 'Team Lead', 'Employee', 'HR');

-- Project Statuses
CREATE TYPE project_status AS ENUM ('Planned', 'In Progress', 'Completed', 'On Hold');

-- Task Statuses
CREATE TYPE task_status AS ENUM ('Todo', 'In Progress', 'In Review', 'Done');

-- Task Priorities
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');

-- Report Types
CREATE TYPE report_type AS ENUM ('Financial', 'Performance', 'Operational', 'AI Insight');

-- AI Insight Types
CREATE TYPE insight_type AS ENUM ('Task Bottleneck', 'Team Performance', 'Financial Forecast', 'General');


-- =========================================================================
-- 2. CORE TABLES
-- =========================================================================

-- Departments Table
CREATE TABLE public.departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_id UUID, -- References profiles(id) added via foreign key constraint later
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Profiles Table (Linked to auth.users in Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    role user_role DEFAULT 'Employee'::user_role NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Complete circular dependency for departments manager reference
ALTER TABLE public.departments 
    ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Teams Table
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Team Members Join Table
CREATE TABLE public.team_members (
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (team_id, user_id)
);

-- Projects Table
CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
    status project_status DEFAULT 'Planned'::project_status NOT NULL,
    start_date DATE,
    end_date DATE,
    milestones JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tasks Table
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status task_status DEFAULT 'Todo'::task_status NOT NULL,
    priority task_priority DEFAULT 'Medium'::task_priority NOT NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Reports Table
CREATE TABLE public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    type report_type NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    file_url TEXT,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance Metrics Table
CREATE TABLE public.performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    score NUMERIC(3,2) CHECK (score >= 0.00 AND score <= 5.00) NOT NULL,
    comments TEXT,
    metrics JSONB DEFAULT '{}'::jsonb NOT NULL, -- Format: { "productivity": 4.2, "cooperation": 4.5 }
    evaluator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AI Insights Table
CREATE TABLE public.ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    insight_type insight_type NOT NULL,
    content TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);


-- =========================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- =========================================================================

-- Trigger function to update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER trigger_update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_performance_metrics_updated_at BEFORE UPDATE ON public.performance_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-profile creation on auth user creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_role public.user_role := 'Employee'::public.user_role;
BEGIN
    -- If role metadata is supplied during signup, map it. Otherwise fallback to 'Employee'.
    IF (NEW.raw_app_metadata ->> 'role') IS NOT NULL THEN
        default_role := (NEW.raw_app_metadata ->> 'role')::public.user_role;
    ELSIF (NEW.raw_user_meta_data ->> 'role') IS NOT NULL THEN
        default_role := (NEW.raw_user_meta_data ->> 'role')::public.user_role;
    END IF;

    INSERT INTO public.profiles (id, first_name, last_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email,
        default_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Helper function to fetch the current user's role from raw application metadata (JWT)
-- Avoids database recursion during table policy validation
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        'Employee'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- --- profiles policies ---
CREATE POLICY "Profiles read access for authenticated users" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Profiles update access for own profile or Admins/HR" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id OR public.get_my_role() IN ('Admin', 'HR'))
    WITH CHECK (auth.uid() = id OR public.get_my_role() IN ('Admin', 'HR'));

-- --- departments policies ---
CREATE POLICY "Departments read access for authenticated users" 
    ON public.departments FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Departments modify access for Admins/HR" 
    ON public.departments FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR'));

-- --- teams policies ---
CREATE POLICY "Teams read access for authenticated users" 
    ON public.teams FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Teams modify access for Admins, HR and Managers" 
    ON public.teams FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR', 'Manager'));

-- --- team_members policies ---
CREATE POLICY "Team members read access for authenticated users" 
    ON public.team_members FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Team members modify access for Admins, Managers and Team Leads" 
    ON public.team_members FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'Manager', 'Team Lead'));

-- --- projects policies ---
CREATE POLICY "Projects read access for authenticated users" 
    ON public.projects FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Projects modify access for Admins, Managers and Team Leads" 
    ON public.projects FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'Manager', 'Team Lead'));

-- --- tasks policies ---
CREATE POLICY "Tasks read access for authenticated users" 
    ON public.tasks FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY "Tasks modify access for Admins, Managers and Team Leads" 
    ON public.tasks FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'Manager', 'Team Lead'));

CREATE POLICY "Tasks assignee update access for own tasks" 
    ON public.tasks FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = assignee_id)
    WITH CHECK (auth.uid() = assignee_id);

-- --- activity_logs policies ---
CREATE POLICY "Activity logs read access for Admins, HR or own logs" 
    ON public.activity_logs FOR SELECT 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR') OR auth.uid() = user_id);

CREATE POLICY "Activity logs insert access for authenticated users" 
    ON public.activity_logs FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- --- reports policies ---
CREATE POLICY "Reports read access for Admins, HR, Managers or creator" 
    ON public.reports FOR SELECT 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR', 'Manager') OR auth.uid() = created_by);

CREATE POLICY "Reports modify access for Admins, HR and Managers" 
    ON public.reports FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR', 'Manager'));

-- --- performance_metrics policies ---
CREATE POLICY "Performance metrics read access for Admins, HR, Managers or own metrics" 
    ON public.performance_metrics FOR SELECT 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR', 'Manager') OR auth.uid() = user_id);

CREATE POLICY "Performance metrics modify access for Admins, HR and Managers" 
    ON public.performance_metrics FOR ALL 
    TO authenticated 
    USING (public.get_my_role() IN ('Admin', 'HR', 'Manager'));

-- --- ai_insights policies ---
CREATE POLICY "AI insights read access for Admins, HR, Managers, or department/team members" 
    ON public.ai_insights FOR SELECT 
    TO authenticated 
    USING (
        public.get_my_role() IN ('Admin', 'HR', 'Manager') OR 
        EXISTS (
            SELECT 1 FROM public.team_members 
            WHERE team_members.user_id = auth.uid() 
            AND team_members.team_id = ai_insights.team_id
        ) OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.department_id = ai_insights.department_id
        )
    );

CREATE POLICY "AI insights modify access for Admins" 
    ON public.ai_insights FOR ALL 
    TO authenticated 
    USING (public.get_my_role() = 'Admin');

COMMIT;
