"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Droplets, Calculator, Utensils, Dumbbell, Home } from 'lucide-react';

const navItems = [
  { href: '/', icon: Home, label: '홈' },
  { href: '/blood-pressure', icon: Heart, label: '혈압' },
  { href: '/blood-sugar', icon: Droplets, label: '혈당' },
  { href: '/bmi', icon: Calculator, label: 'BMI' },
  { href: '/diet', icon: Utensils, label: '식단' },
  { href: '/exercise', icon: Dumbbell, label: '운동' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-slate-200 top-14 z-40">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-center gap-1 py-2 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}