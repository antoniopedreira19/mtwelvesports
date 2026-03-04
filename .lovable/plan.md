

## Plan: Create `profiles` Table + Build Athlete Portal MVP

### 1. Database: Create `profiles` table

Create a `profiles` table synced with `auth.users` via a trigger. This table stores user display info (name, email, phone) and is referenced by the portal for the welcome message.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all profiles
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: auto-create profile on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### 2. New Hook: `src/hooks/useProfile.ts`

Fetches the current user's profile from `profiles` table. Returns `{ profile, isLoading }` with `name`, `email`, `phone`.

### 3. Athlete Portal Page: `src/pages/AthletePortal.tsx`

Complete redesign with premium dark + gold UI, organized in tabs:

**Home Tab (default):**
- Welcome banner: "Bem-vindo, {name}" with avatar/initials, date, motivational message
- Educational resources section: grid of cards linking to PDFs/materials (transfer process, visa, leagues, eligibility) — initially with placeholder cards stored in Supabase storage
- Document upload area: drag-and-drop zone for the athlete to submit documents (future feature placeholder)

**Placement Board Tab:**
- Kanban-style read-only board showing schools interested in the athlete
- Columns: Early Interest → Em Contato → Negociação → Fechado
- Data source: the athlete's own client record from `clients` table, filtered by their linked `client_id`
- Initially shows a "coming soon" state since the link between auth user and client record needs admin setup

**Payments Tab:**
- Table showing installment payments from the athlete's contract
- Columns: due date, value, status (badge)
- Read-only view of data from `installments` table linked via contract
- Initially shows "coming soon" placeholder

### 4. Sidebar Update: `src/components/layout/AppSidebar.tsx`

Update client menu to show tabs matching the portal sections (Home, Placement, Pagamentos) or keep single entry since portal handles tabs internally.

### 5. UI/UX Design Approach

- Dark theme with gold (#E8BD27) accents consistent with existing design system
- Animated greeting with time-of-day awareness ("Bom dia/Boa tarde/Boa noite")
- Card-based layout with subtle glass-morphism effects
- Smooth fade-in animations
- Responsive for mobile viewing
- Premium feel: gradients, shadows, clean typography

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration SQL | Create `profiles` table + trigger |
| `src/hooks/useProfile.ts` | Create - fetch profile data |
| `src/pages/AthletePortal.tsx` | Rewrite - full portal with tabs |
| `src/components/layout/AppSidebar.tsx` | Minor - update portal menu items if needed |

