// components/Navbar.tsx - Mobile responsive version with working dark mode
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
    const [darkMode, setDarkMode] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        // Apply dark mode class to html element and update body styles
        if (darkMode) {
            document.documentElement.classList.add('dark')
            document.body.style.backgroundColor = '#030712' // gray-950
            document.body.style.color = '#ffffff'
        } else {
            document.documentElement.classList.remove('dark')
            document.body.style.backgroundColor = '#ffffff'
            document.body.style.color = '#000000'
        }
    }, [darkMode])

    const closeMobileMenu = () => {
        setMobileMenuOpen(false)
    }

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
    }

    return (
        <nav className={`w-full border-b transition-colors duration-300 ${darkMode
                ? 'bg-gray-900 border-gray-800'
                : 'bg-white border-gray-200'
            }`}>
            <div className="px-4 py-4">
                {/* Desktop Layout */}
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <h1 className={`text-xl font-bold transition-colors duration-300 ${darkMode ? 'text-gray-900 dark:text-white' : 'text-gray-900'
                        }`}>
                        DutchBrat
                    </h1>

                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-4 text-sm">
                        <Link
                            href="/"
                            className={`transition-colors duration-300 ${darkMode
                                    ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Home
                        </Link>
                        <Link
                            href="/briefings"
                            className={`transition-colors duration-300 ${darkMode
                                    ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Briefings
                        </Link>
                        <Link
                            href="/articles"
                            className={`transition-colors duration-300 ${darkMode
                                    ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Articles
                        </Link>
                        <a
                            href="https://x.com/@Web3_Dobie"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`transition-colors duration-300 ${darkMode
                                    ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Hunter-X
                        </a>
                        <a
                            href="https://web3dobie.substack.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`transition-colors duration-300 ${darkMode
                                    ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Newsletter
                        </a>
                        <a
                            href="https://github.com/Web3Dobie/X-AI-Agent"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`transition-colors duration-300 ${darkMode
                                    ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            GitHub
                        </a>
                        <button
                            onClick={toggleDarkMode}
                            className="ml-2 hover:scale-110 transition-transform text-xl"
                            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center gap-3">
                        {/* Dark mode toggle for mobile */}
                        <button
                            onClick={toggleDarkMode}
                            className="hover:scale-110 transition-transform text-xl"
                            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>

                        {/* Hamburger Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className={`focus:outline-none transition-colors duration-300 ${darkMode ? 'text-gray-900 dark:text-white' : 'text-gray-900'
                                }`}
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {mobileMenuOpen ? (
                                    // X icon when menu is open
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    // Hamburger icon when menu is closed
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                )}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className={`md:hidden mt-4 pb-4 border-t transition-colors duration-300 ${darkMode ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                        <div className="flex flex-col space-y-3 pt-4">
                            <Link
                                href="/"
                                className={`transition-colors duration-300 py-2 ${darkMode
                                        ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                onClick={closeMobileMenu}
                            >
                                Home
                            </Link>
                            <Link
                                href="/briefings"
                                className={`transition-colors duration-300 py-2 ${darkMode
                                        ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                onClick={closeMobileMenu}
                            >
                                Briefings
                            </Link>
                            <Link
                                href="/articles"
                                className={`transition-colors duration-300 py-2 ${darkMode
                                        ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                onClick={closeMobileMenu}
                            >
                                Articles
                            </Link>
                            <a
                                href="https://x.com/@Web3_Dobie"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`transition-colors duration-300 py-2 ${darkMode
                                        ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                onClick={closeMobileMenu}
                            >
                                Hunter-X
                            </a>
                            <a
                                href="https://web3dobie.substack.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`transition-colors duration-300 py-2 ${darkMode
                                        ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                onClick={closeMobileMenu}
                            >
                                Newsletter
                            </a>
                            <a
                                href="https://github.com/Web3Dobie/X-AI-Agent"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`transition-colors duration-300 py-2 ${darkMode
                                        ? 'text-gray-200 hover:text-gray-900 dark:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                onClick={closeMobileMenu}
                            >
                                GitHub
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    )
}