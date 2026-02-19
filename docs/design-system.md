# SignalFlow Design System - Dark Neumorphic
**Version:** 1.0  
**Date:** February 19, 2026  
**Source:** HTML mockups (sf-neu-page-*.html)

---

## 🎨 Design Philosophy

**Neumorphism** - Soft, tactile UI with depth created through shadows  
**Dark Theme** - Optimized for long coding sessions  
**Professional** - Portfolio-quality presentation

---

## 📐 Core Design Tokens

### Color Palette

#### Base Colors
```javascript
'neu-bg': '#1e2028',           // Main background
'neu-dark': '#f0f0f4',          // Lightest (rare use)
'neu-text': '#d8d8e0',          // Primary text
'neu-text-muted': '#9a9eb0',   // Secondary text
```

#### Shadow Colors (Neumorphic Depth)
```javascript
'neu-shadow-dark': '#14161c',   // Dark shadow (depth)
'neu-shadow-light': '#282c38',  // Light shadow (highlight)
```

#### Accent Colors
```javascript
'neu-accent': '#a89be0',        // Primary purple
'neu-accent-light': '#c4b8f0',  // Light purple
'neu-teal': '#4dc9b0',          // Success/accent
'neu-orange': '#f0956a',        // Warning/highlight
'neu-green': '#5ed4a0',         // Success states
'neu-coral': '#f08b7a',         // Error/alert
```

#### Usage Guide
- **neu-bg** - All backgrounds, cards, containers
- **neu-accent** - Primary actions, links, highlights
- **neu-teal** - Success badges, positive metrics
- **neu-orange** - Warnings, medium priority
- **neu-coral** - Errors, high severity
- **neu-green** - Completion, optimization success

---

### Typography

#### Font Families
```javascript
fontFamily: {
  'display': ['Outfit', 'sans-serif'],  // Headers, titles
  'body': ['DM Sans', 'sans-serif'],    // Body text, UI
}
```

#### Font Weights (Outfit - Display)
- 300 - Light
- 400 - Regular
- 500 - Medium
- 600 - Semibold
- 700 - Bold
- 800 - Extrabold

#### Font Weights (DM Sans - Body)
- 100-1000 - Variable weight

#### Usage
```css
.heading-primary { 
  font-family: 'Outfit';
  font-weight: 700;
}

.heading-secondary { 
  font-family: 'Outfit';
  font-weight: 600;
}

.body-text { 
  font-family: 'DM Sans';
  font-weight: 400;
}

.label-text { 
  font-family: 'DM Sans';
  font-weight: 500;
}
```

---

## 🪄 Neumorphic Shadow System

### Shadow Variants

#### 1. Raised (Buttons, Cards)
**Effect:** Element appears to lift off the surface
```css
.neu-raised {
  background: #1e2028;
  box-shadow: 
    8px 8px 16px #14161c,     /* Dark shadow bottom-right */
    -8px -8px 16px #282c38;   /* Light shadow top-left */
  border-radius: 20px;
}
```

**Use for:**
- Primary cards
- Workflow execution cards
- Major sections
- Modal containers

---

#### 2. Raised Small (Compact Elements)
**Effect:** Subtle lift for smaller components
```css
.neu-raised-sm {
  background: #1e2028;
  box-shadow: 
    5px 5px 10px #14161c,
    -5px -5px 10px #282c38;
  border-radius: 12px;
}
```

**Use for:**
- Buttons
- Badges
- Small cards
- List items

---

#### 3. Inset (Input Fields, Pressed States)
**Effect:** Element appears pressed into surface
```css
.neu-inset {
  background: #1e2028;
  box-shadow: 
    inset 5px 5px 10px #14161c,
    inset -5px -5px 10px #282c38;
  border-radius: 12px;
}
```

**Use for:**
- Text inputs
- Search bars
- Dropdowns
- Active/pressed button states

---

#### 4. Flat (Subtle Depth)
**Effect:** Minimal shadow with gradient
```css
.neu-flat {
  background: linear-gradient(145deg, #242830, #1a1c22);
  box-shadow: 
    6px 6px 12px #14161c,
    -6px -6px 12px #282c38;
  border-radius: 16px;
}
```

**Use for:**
- Secondary cards
- Background panels
- Dividers with depth

---

#### 5. Sidebar (Vertical Shadow)
**Effect:** Soft vertical shadow for navigation
```css
.neu-sidebar {
  background: #1e2028;
  box-shadow: 4px 0 15px rgba(0, 0, 0, 0.3);
}
```

**Use for:**
- Left navigation panel
- Drawer components
- Slide-out menus

---

## 🎭 Animation System

### Fade Animations

#### Fade In Up
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}
```

**Use for:** Page content reveals, card entrances

---

#### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}
```

**Use for:** Simple content reveals, overlays

---

#### Slide In Left
```css
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slide-in-left {
  animation: slideInLeft 0.5s ease-out forwards;
}
```

**Use for:** Sidebar navigation, drawer reveals

---

#### Float (Subtle Hover)
```css
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}
```

**Use for:** Accent elements, decorative icons

---

### Stagger Delays
```css
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
.stagger-5 { animation-delay: 0.5s; }
```

**Use for:** Sequential card reveals, list animations

---

### Card Hover Effects
```css
.step-card {
  background: #1e2028;
  box-shadow: 8px 8px 16px #14161c, -8px -8px 16px #282c38;
  border-radius: 20px;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.step-card:hover {
  transform: translateY(-4px);
  box-shadow: 12px 12px 24px #14161c, -12px -12px 24px #282c38;
}
```

**Effect:** Card lifts on hover with enhanced shadow

---

## 🧩 Component Patterns

### Button Styles

#### Primary Button (Accent)
```css
.btn-primary {
  background: linear-gradient(145deg, #b5a8e8, #9b8bd8);
  color: #1e2028;
  font-family: 'DM Sans', sans-serif;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  box-shadow: 5px 5px 10px #14161c, -5px -5px 10px #282c38;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 7px 7px 14px #14161c, -7px -7px 14px #282c38;
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: inset 3px 3px 6px #14161c, inset -3px -3px 6px #282c38;
}
```

---

#### Secondary Button (Neutral)
```css
.btn-secondary {
  background: #1e2028;
  color: #d8d8e0;
  font-family: 'DM Sans', sans-serif;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 12px;
  box-shadow: 5px 5px 10px #14161c, -5px -5px 10px #282c38;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  color: #a89be0;
  transform: translateY(-2px);
}
```

---

#### Icon Button (Small)
```css
.btn-icon {
  background: #1e2028;
  color: #9a9eb0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  box-shadow: 4px 4px 8px #14161c, -4px -4px 8px #282c38;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  color: #a89be0;
  transform: scale(1.05);
}
```

---

### Card Styles

#### Execution Card
```css
.execution-card {
  background: #1e2028;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 8px 8px 16px #14161c, -8px -8px 16px #282c38;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.execution-card:hover {
  transform: translateY(-4px);
  box-shadow: 12px 12px 24px #14161c, -12px -12px 24px #282c38;
}
```

---

#### Metric Card (Small)
```css
.metric-card {
  background: #1e2028;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 6px 6px 12px #14161c, -6px -6px 12px #282c38;
}
```

---

### Badge Styles

#### Status Badge
```css
.badge-success {
  background: rgba(94, 212, 160, 0.15);
  color: #5ed4a0;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.badge-warning {
  background: rgba(240, 149, 106, 0.15);
  color: #f0956a;
}

.badge-error {
  background: rgba(240, 139, 122, 0.15);
  color: #f08b7a;
}
```

---

### Input Fields

#### Text Input
```css
.input-neu {
  background: #1e2028;
  color: #d8d8e0;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  box-shadow: inset 5px 5px 10px #14161c, inset -5px -5px 10px #282c38;
  transition: all 0.3s ease;
}

.input-neu:focus {
  border-color: #a89be0;
  box-shadow: 
    inset 5px 5px 10px #14161c, 
    inset -5px -5px 10px #282c38,
    0 0 0 3px rgba(168, 155, 224, 0.1);
}

.input-neu::placeholder {
  color: #9a9eb0;
}
```

---

## 📏 Spacing Scale

### Border Radius
```javascript
borderRadius: {
  'sm': '8px',
  'DEFAULT': '12px',
  'md': '16px',
  'lg': '20px',
  'xl': '24px',
}
```

### Padding Scale (Consistent with Tailwind)
- **xs**: 4px (p-1)
- **sm**: 8px (p-2)
- **md**: 12px (p-3)
- **lg**: 16px (p-4)
- **xl**: 20px (p-5)
- **2xl**: 24px (p-6)

---

## 🎯 Usage Examples

### Dashboard Execution Card
```jsx
<div className="neu-raised p-6 hover:shadow-xl transition-all duration-400">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-display font-semibold text-lg text-neu-text">
      Executive Pulse
    </h3>
    <span className="badge-success">Success</span>
  </div>
  
  <div className="grid grid-cols-3 gap-4 text-center">
    <div>
      <p className="text-2xl font-bold text-neu-accent">13.1s</p>
      <p className="text-sm text-neu-text-muted">Duration</p>
    </div>
    <div>
      <p className="text-2xl font-bold text-neu-text">11</p>
      <p className="text-sm text-neu-text-muted">Nodes</p>
    </div>
    <div>
      <p className="text-2xl font-bold text-neu-text">4639</p>
      <p className="text-sm text-neu-text-muted">n8n ID</p>
    </div>
  </div>
  
  <button className="btn-primary w-full mt-4">
    View Analysis
  </button>
</div>
```

---

### Metric Summary Card
```jsx
<div className="neu-flat p-5">
  <div className="flex items-center gap-3 mb-2">
    <div className="w-10 h-10 rounded-lg bg-neu-accent/10 flex items-center justify-center">
      <svg className="w-5 h-5 text-neu-accent">...</svg>
    </div>
    <h4 className="font-display font-semibold text-neu-text">
      Critical Path
    </h4>
  </div>
  
  <p className="text-3xl font-display font-bold text-neu-accent mb-1">
    100%
  </p>
  <p className="text-sm text-neu-text-muted">
    of total execution
  </p>
</div>
```

---

### Input with Search
```jsx
<div className="relative">
  <input 
    type="text"
    placeholder="Search executions..."
    className="input-neu w-full pl-10"
  />
  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neu-text-muted">
    {/* search icon */}
  </svg>
</div>
```

---

## 🔧 Tailwind Configuration

**File:** `frontend/tailwind.config.js`

```javascript
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'neu-bg': '#1e2028',
        'neu-accent': '#a89be0',
        'neu-accent-light': '#c4b8f0',
        'neu-dark': '#f0f0f4',
        'neu-text': '#d8d8e0',
        'neu-text-muted': '#9a9eb0',
        'neu-shadow-dark': '#14161c',
        'neu-shadow-light': '#282c38',
        'neu-teal': '#4dc9b0',
        'neu-orange': '#f0956a',
        'neu-green': '#5ed4a0',
        'neu-coral': '#f08b7a',
      },
      fontFamily: {
        'display': ['Outfit', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
        'sans': ['DM Sans', 'sans-serif'], // Default
      },
      boxShadow: {
        'neu-raised': '8px 8px 16px #14161c, -8px -8px 16px #282c38',
        'neu-raised-sm': '5px 5px 10px #14161c, -5px -5px 10px #282c38',
        'neu-inset': 'inset 5px 5px 10px #14161c, inset -5px -5px 10px #282c38',
        'neu-flat': '6px 6px 12px #14161c, -6px -6px 12px #282c38',
      },
      borderRadius: {
        'neu-sm': '8px',
        'neu': '12px',
        'neu-md': '16px',
        'neu-lg': '20px',
        'neu-xl': '24px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'slide-in-left': 'slideInLeft 0.5s ease-out forwards',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideInLeft: {
          'from': {
            opacity: '0',
            transform: 'translateX(-20px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
```

---

## 📦 Global CSS

**File:** `frontend/app/globals.css`

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Outfit:wght@300;400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  
  body {
    @apply bg-neu-bg text-neu-text font-body;
  }
}

@layer components {
  /* Neumorphic Utilities */
  .neu-raised {
    @apply bg-neu-bg shadow-neu-raised rounded-neu-lg;
  }
  
  .neu-raised-sm {
    @apply bg-neu-bg shadow-neu-raised-sm rounded-neu;
  }
  
  .neu-inset {
    @apply bg-neu-bg shadow-neu-inset rounded-neu;
  }
  
  .neu-flat {
    @apply shadow-neu-flat rounded-neu-md;
    background: linear-gradient(145deg, #242830, #1a1c22);
  }
  
  /* Button Components */
  .btn-primary {
    @apply px-6 py-3 rounded-neu font-semibold shadow-neu-raised-sm;
    @apply transition-all duration-300 ease-out;
    @apply hover:-translate-y-0.5 hover:shadow-neu-raised;
    @apply active:translate-y-0 active:shadow-neu-inset;
    background: linear-gradient(145deg, #b5a8e8, #9b8bd8);
    color: #1e2028;
  }
  
  .btn-secondary {
    @apply px-6 py-3 rounded-neu font-medium shadow-neu-raised-sm;
    @apply bg-neu-bg text-neu-text transition-all duration-300;
    @apply hover:-translate-y-0.5 hover:text-neu-accent;
  }
  
  .btn-icon {
    @apply w-10 h-10 rounded-lg shadow-neu-raised-sm;
    @apply bg-neu-bg text-neu-text-muted transition-all duration-300;
    @apply hover:text-neu-accent hover:scale-105;
  }
  
  /* Badge Components */
  .badge-success {
    @apply px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide;
    background: rgba(94, 212, 160, 0.15);
    color: #5ed4a0;
  }
  
  .badge-warning {
    @apply px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide;
    background: rgba(240, 149, 106, 0.15);
    color: #f0956a;
  }
  
  .badge-error {
    @apply px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide;
    background: rgba(240, 139, 122, 0.15);
    color: #f08b7a;
  }
  
  /* Input Components */
  .input-neu {
    @apply bg-neu-bg text-neu-text px-4 py-3 rounded-neu;
    @apply border border-transparent shadow-neu-inset;
    @apply transition-all duration-300;
    @apply focus:border-neu-accent focus:ring-2 focus:ring-neu-accent/10;
    @apply placeholder:text-neu-text-muted;
  }
  
  /* Card Components */
  .card-neu {
    @apply neu-raised p-6 transition-all duration-400;
    @apply hover:-translate-y-1 hover:shadow-xl;
  }
}
```

---

## ✅ Implementation Checklist

### Phase 1: Setup
- [ ] Update `tailwind.config.js` with design tokens
- [ ] Update `globals.css` with component classes
- [ ] Add Google Fonts link to layout
- [ ] Test hot reload works

### Phase 2: Component Library
- [ ] Create `Button` component with variants
- [ ] Create `Badge` component with variants
- [ ] Create `Card` component with neumorphic styles
- [ ] Create `Input` component
- [ ] Test components in isolation

### Phase 3: Verification
- [ ] Colors match mockups
- [ ] Shadows render correctly
- [ ] Fonts load properly
- [ ] Animations work
- [ ] Hover states functional

---

## 🎨 Design Principles Summary

1. **Consistency** - Use design tokens, never hard-code colors
2. **Depth** - Every element has tactile depth through shadows
3. **Transitions** - Smooth 300-400ms transitions on interactions
4. **Accessibility** - Maintain 4.5:1 contrast ratios
5. **Performance** - Use CSS custom properties for theme switching

---

**Next Steps:** Apply to Dashboard page, then expand to all pages.

