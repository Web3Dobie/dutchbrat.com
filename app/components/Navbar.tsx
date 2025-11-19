// app/components/Navbar.tsx - Updated with domain detection
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useClientDomainDetection } from '@/lib/clientDomainDetection'

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const domainType = useClientDomainDetection()

    const closeMobileMenu = () => {
        setMobileMenuOpen(false)
    }

    // Hunter's Hounds Navigation
    if (domainType === 'hunters-hounds') {
        return (
            <nav className="bg-gray-900 shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center">
                            <span className="text-2xl font-bold text-white">
                                🐕 Hunter's Hounds
                            </span>
                        </Link>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex space-x-8">
                            <Link
                                href="/"
                                className="text-gray-200 hover:text-white transition-colors duration-300"
                            >
                                Home
                            </Link>
                            <Link
                                href="/services"
                                className="text-gray-200 hover:text-white transition-colors duration-300"
                            >
                                Services & Pricing
                            </Link>
                            <Link
                                href="/book-now"
                                className="text-gray-200 hover:text-white transition-colors duration-300"
                            >
                                Book Now
                            </Link>
                            <Link
                                href="/my-account"
                                className="text-gray-200 hover:text-white transition-colors duration-300"
                            >
                                My Account
                            </Link>
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
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    ) : (
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
                        <div className="md:hidden">
                            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
                                <Link
                                    href="/"
                                    className="block text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                    onClick={closeMobileMenu}
                                >
                                    Home
                                </Link>
                                <Link
                                    href="/services"
                                    className="block text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                    onClick={closeMobileMenu}
                                >
                                    Services & Pricing
                                </Link>
                                <Link
                                    href="/book-now"
                                    className="block text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                    onClick={closeMobileMenu}
                                >
                                    Book Now
                                </Link>
                                <Link
                                    href="/my-account"
                                    className="block text-gray-200 hover:text-white transition-colors duration-300 py-2"
                                    onClick={closeMobileMenu}
                                >
                                    My Account
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>
        )
    }

    // DutchBrat Navigation (UNCHANGED - preserves existing functionality)
    return (
        <nav className="bg-gray-900 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center">
                        <span className="text-2xl font-bold text-white">DutchBrat</span>
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8">
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
                        <Link
                            href="/hunter"
                            className="text-gray-200 hover:text-white transition-colors duration-300"
                        >
                            Hunter 🐾
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
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
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

                {/* Mobile Menu - DutchBrat */}
                {mobileMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800">
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
                            <Link
                                href="/hunter"
                                className="text-gray-200 hover:text-white transition-colors duration-300"
                            >
                                Hunter 🐾
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