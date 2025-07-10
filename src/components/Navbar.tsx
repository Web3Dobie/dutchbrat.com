// components/Navbar.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
    const [darkMode, setDarkMode] = useState(true)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode)
    }, [darkMode])

    return (
        <nav className="w-full bg-gray-900 dark:bg-black border-b border-gray-800 p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">DutchBrat</h1>
            <div className="flex items-center gap-4 text-gray-200 text-sm">
                <Link href="/">Home</Link>
                <a href="#briefings">Briefings</a>
                <a href="#articles">Articles</a>
                <a href="https://x.com/Web3_Dobie" target="_blank">X</a>
                <a href="https://web3dobie.substack.com" target="_blank">Newsletter</a>
                <a href="https://github.com/Web3Dobie/dutchbrat.com" target="_blank">GitHub</a>
                <button onClick={() => setDarkMode(!darkMode)} className="ml-2">
                    {darkMode ? '☀️' : '🌙'}
                </button>
            </div>
        </nav>
    )
}
