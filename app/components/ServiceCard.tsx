// file: frontend/app/components/ServiceCard.tsx
import React from 'react';

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
}

// The "export" keyword here makes this a named export.
export function ServiceCard({ title, description, price }: ServiceCardProps) {
  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 h-full flex flex-col">
      <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-300 mb-4 flex-grow">{description}</p>
      <p className="text-xl font-semibold text-blue-400">{price}</p>
    </div>
  );
}