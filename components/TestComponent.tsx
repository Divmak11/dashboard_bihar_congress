import React from 'react';

export default function TestComponent() {
  return (
    <div className="p-6 bg-background text-foreground">
      <h1 className="text-3xl font-bold mb-4">Tailwind CSS Test</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Card 1</h2>
          <p className="text-blue-100">This card uses Tailwind utility classes.</p>
        </div>
        <div className="bg-green-500 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Card 2</h2>
          <p className="text-green-100">Responsive grid layout working.</p>
        </div>
        <div className="bg-purple-500 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Card 3</h2>
          <p className="text-purple-100">Custom colors from CSS variables.</p>
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This text adapts to light/dark mode preferences.
        </p>
      </div>
    </div>
  );
} 