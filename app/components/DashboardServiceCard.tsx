'use client';

import React from 'react';
import Link from 'next/link';

export function DashboardServiceCard() {
  return (
    <Link href="/dog-walking/dashboard" className="block h-full">
      <div className="bg-emerald-900 p-6 rounded-lg border border-emerald-600 h-full flex flex-col hover:bg-emerald-800 transition-colors duration-200 cursor-pointer">
        <h3 className="text-2xl font-bold text-white mb-2">View Bookings</h3>
        <p className="text-emerald-100 mb-4 flex-grow">
          Manage your bookings and view history. Access your upcoming walks and past appointments.
        </p>
        <p className="text-xl font-semibold text-emerald-300">Existing Customers</p>
      </div>
    </Link>
  );
}

export default DashboardServiceCard;