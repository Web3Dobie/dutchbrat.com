// components/Navbar.tsx - Dark theme only, mobile responsive
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        // Set dark theme permanently
        document.documentElement.classList.add('dark')
        document.body.style.backgroundColor = '#030712' // gray-950
        document.body.style.color = '#ffffff'
    }, [])

    const closeMobileMenu = () => {
        setMobileMenuOpen(false)
    }

    return (
        <nav className="w-full bg-gray-900 border-b border-gray-800">
            <div className="px-4 py-4">
                {/* Desktop Layout */}
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <h1 className="text-xl font-bold text-white">
                        DutchBrat
                    </h1>
                    
                    {/* Desktop Navigation Links */}
                    <div className="hidden md:flex items-center gap-4 text-sm">
                        <Link 
                            href="/" 
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            Home
                        </Link>
                        <Link 
                            href="/briefings" 
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            Briefings
                        </Link>
                        <Link 
                            href="/articles" 
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            Articles
                        </Link>
                        <a 
                            href="https://x.com/@Web3_Dobie" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            Hunter-X
                        </a>
                        <a 
                            href="https://web3dobie.substack.com" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            Newsletter
                        </a>
                        <a 
                            href="https://github.com/Web3Dobie/X-AI-Agent" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            GitHub
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="text-white focus:outline-none"
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
                    <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
                        <div className="flex flex-col space-y-3 pt-4">
                            <Link 
                                href="/" 
                                className="text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                onClick={closeMobileMenu}
                            >
                                Home
                            </Link>
                            <Link 
                                href="/briefings" 
                                className="text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                onClick={closeMobileMenu}
                            >
                                Briefings
                            </Link>
                            <Link 
                                href="/articles" 
                                className="text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                onClick={closeMobileMenu}
                            >
                                Articles
                            </Link>
                            <a 
                                href="https://x.com/@Web3_Dobie" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                onClick={closeMobileMenu}
                            >
                                Hunter-X
                            </a>
                            <a 
                                href="https://web3dobie.substack.com" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                onClick={closeMobileMenu}
                            >
                                Newsletter
                            </a>
                            <a 
                                href="https://github.com/Web3Dobie/X-AI-Agent" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-gray-200 hover:text-white transition-colors duration-300 py-2"
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