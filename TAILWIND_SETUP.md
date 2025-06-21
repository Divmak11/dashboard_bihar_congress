# Tailwind CSS Setup Documentation

This project has been configured with Tailwind CSS v4 for optimal styling and development experience.

## Configuration Files

### 1. `tailwind.config.js`
- Configured for Tailwind CSS v4
- Includes content paths for all React components
- Custom color variables for background and foreground
- Custom font families using CSS variables

### 2. `app/globals.css`
- Uses `@import "tailwindcss"` for Tailwind CSS v4
- Defines CSS custom properties for theming
- Includes dark mode support
- Uses `@theme` directive for custom theme values

### 3. `postcss.config.js`
- Configured with Tailwind CSS and Autoprefixer plugins

## Features

### Custom Colors
- `bg-background` / `text-background` - Uses CSS variable `--background`
- `bg-foreground` / `text-foreground` - Uses CSS variable `--foreground`

### Custom Fonts
- `font-sans` - Uses Geist Sans font
- `font-mono` - Uses Geist Mono font

### Dark Mode Support
- Automatic dark mode based on system preferences
- Uses `dark:` prefix for dark mode styles
- Example: `bg-gray-100 dark:bg-gray-800`

## Usage Examples

```tsx
// Basic styling
<div className="p-6 bg-background text-foreground">
  <h1 className="text-3xl font-bold">Title</h1>
</div>

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="bg-blue-500 text-white p-4 rounded-lg">Card</div>
</div>

// Dark mode
<div className="bg-gray-100 dark:bg-gray-800 p-4">
  <p className="text-gray-600 dark:text-gray-300">Content</p>
</div>
```

## Test Component

A `TestComponent` has been created in `components/TestComponent.tsx` to demonstrate:
- Custom color usage
- Responsive grid layouts
- Dark mode support
- Various Tailwind utility classes

## Running the Project

```bash
npm run dev
```

The development server will start on `http://localhost:3000` with Tailwind CSS fully configured and working.

## Key Benefits

1. **CSS Variables**: Uses CSS custom properties for consistent theming
2. **Dark Mode**: Automatic dark mode support
3. **Responsive**: Built-in responsive design utilities
4. **Performance**: Tailwind CSS v4 with optimized builds
5. **Type Safety**: Full TypeScript support 