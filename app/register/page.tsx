'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isHuntersHoundsClient } from '@/lib/clientDomainDetection';

interface RegisterData {
    ownerName: string;
    phone: string;
    email: string;
    address: string;
    dogName: string;
    dogBreed: string;
    dogAge: string;
    photoConsent: boolean;
}

interface User {
    owner_id: number;
    owner_name: string;
    phone: string;
    email: string;
    address: string;
    dogs: Array<{
        id: number;
        dog_name: string;
        dog_breed: string;
        dog_age: number;
    }>;
}

export default function RegisterPage() {
    const router = useRouter();
    const [isHuntersHounds, setIsHuntersHounds] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [registeredUser, setRegisteredUser] = useState<User | null>(null);
    const [countdown, setCountdown] = useState(3);

    const [formData, setFormData] = useState<RegisterData>({
        ownerName: '',
        phone: '',
        email: '',
        address: '',
        dogName: '',
        dogBreed: '',
        dogAge: '',
        photoConsent: false,
    });

    // Check domain on client side
    useEffect(() => {
        setIsHuntersHounds(isHuntersHoundsClient());
    }, []);

    // Countdown and redirect after registration
    useEffect(() => {
        if (registeredUser && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (registeredUser && countdown === 0) {
            router.push(`/book-now?phone=${encodeURIComponent(registeredUser.phone)}`);
        }
    }, [registeredUser, countdown, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const registrationData = {
                ownerName: formData.ownerName,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                dogName: formData.dogName,
                dogBreed: formData.dogBreed,
                dogAge: parseInt(formData.dogAge, 10),
                photoSharingConsent: formData.photoConsent,
            };

            const res = await fetch('/api/dog-walking/user-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Registration failed.');
            }

            const data = await res.json();
            setRegisteredUser(data.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Non-Hunter's Hounds domain - show not found
    if (!isHuntersHounds) {
        return (
            <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                    <Link href="/" className="text-blue-400 hover:text-blue-300 underline">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    // Success state - show welcome message with countdown
    if (registeredUser) {
        const dogName = registeredUser.dogs[0]?.dog_name || 'your dog';
        return (
            <div className="min-h-screen bg-gray-950 text-white">
                <div className="container mx-auto px-4 py-16 max-w-xl">
                    <div className="bg-gray-800/50 rounded-2xl p-8 border border-green-500/50 text-center">
                        <div className="text-6xl mb-6">🎉</div>
                        <h1 className="text-3xl font-bold mb-4 text-green-400">
                            Welcome to Hunter's Hounds!
                        </h1>
                        <p className="text-xl text-gray-300 mb-6">
                            Hi {registeredUser.owner_name.split(' ')[0]}, your account has been created successfully!
                        </p>
                        <p className="text-lg text-gray-400 mb-8">
                            We can't wait to meet {dogName}! 🐕
                        </p>
                        <p className="text-gray-400 mb-4">
                            Redirecting to booking in {countdown} seconds...
                        </p>
                        <Link
                            href={`/book-now?phone=${encodeURIComponent(registeredUser.phone)}`}
                            className="inline-block bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg"
                        >
                            Book Your First Walk →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Form styles matching BookingForm.tsx
    const styles = {
        input: {
            width: '100%',
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '4px',
            border: '1px solid #444',
            backgroundColor: '#1f2937',
            color: '#fff',
            fontSize: '1rem',
        } as React.CSSProperties,
        label: {
            display: 'block',
            marginBottom: '4px',
            fontSize: '0.9rem',
            color: '#d1d5db',
        } as React.CSSProperties,
    };

    // Registration form
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="container mx-auto px-4 py-12 max-w-xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
                        Join Hunter's Hounds
                    </h1>
                    <p className="text-lg text-gray-400 mb-4">
                        Create your account to start booking walks for your furry friend
                    </p>
                    <p className="text-gray-500">
                        Already registered?{' '}
                        <Link href="/my-account" className="text-blue-400 hover:text-blue-300 underline">
                            Log in here
                        </Link>
                    </p>
                </div>

                {/* Registration Form */}
                <form onSubmit={handleSubmit} className="bg-gray-800/50 rounded-2xl p-6 sm:p-8 border border-gray-700/50">
                    {/* Your Details Section */}
                    <h2 className="text-xl font-semibold mb-4 text-blue-400">Your Details</h2>

                    <label style={styles.label}>Full Name *</label>
                    <input
                        style={styles.input}
                        type="text"
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        placeholder="John Smith"
                        required
                    />

                    <label style={styles.label}>Email Address *</label>
                    <input
                        style={styles.input}
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        required
                    />

                    <label style={styles.label}>Phone Number *</label>
                    <input
                        style={styles.input}
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="07123456789"
                        required
                    />

                    <label style={styles.label}>Full Address *</label>
                    <input
                        style={styles.input}
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Full address including postcode"
                        required
                    />

                    {/* Dog Details Section */}
                    <h2 className="text-xl font-semibold mb-4 mt-6 text-purple-400">Your Dog's Details</h2>

                    <label style={styles.label}>Dog's Name *</label>
                    <input
                        style={styles.input}
                        type="text"
                        value={formData.dogName}
                        onChange={(e) => setFormData({ ...formData, dogName: e.target.value })}
                        placeholder="Buddy"
                        required
                    />

                    <label style={styles.label}>Dog's Breed *</label>
                    <input
                        style={styles.input}
                        type="text"
                        value={formData.dogBreed}
                        onChange={(e) => setFormData({ ...formData, dogBreed: e.target.value })}
                        placeholder="e.g., Labrador, Golden Retriever, Mixed"
                        required
                    />

                    <label style={styles.label}>Dog's Age (years) *</label>
                    <input
                        style={styles.input}
                        type="number"
                        min="0"
                        max="30"
                        value={formData.dogAge}
                        onChange={(e) => setFormData({ ...formData, dogAge: e.target.value })}
                        placeholder="e.g., 3"
                        required
                    />

                    {/* Photo Sharing Consent */}
                    <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                        <label className="flex items-start gap-3 cursor-pointer text-gray-300">
                            <input
                                type="checkbox"
                                checked={formData.photoConsent}
                                onChange={(e) => setFormData({ ...formData, photoConsent: e.target.checked })}
                                className="mt-1 w-5 h-5 cursor-pointer"
                            />
                            <span className="text-sm leading-relaxed">
                                I give permission for Hunter's Hounds to share photos of my dog on their website and social media
                            </span>
                        </label>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg"
                    >
                        {isLoading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    {/* Back to Home */}
                    <div className="text-center mt-4">
                        <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm">
                            ← Back to Home
                        </Link>
                    </div>
                </form>

                {/* Benefits Section */}
                <div className="mt-8 text-center">
                    <h3 className="text-lg font-semibold mb-4 text-gray-300">Why Register?</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-400">
                        <div className="p-4 bg-gray-800/30 rounded-lg">
                            <div className="text-2xl mb-2">📅</div>
                            <p>Easy booking for walks</p>
                        </div>
                        <div className="p-4 bg-gray-800/30 rounded-lg">
                            <div className="text-2xl mb-2">🐕</div>
                            <p>Manage multiple dogs</p>
                        </div>
                        <div className="p-4 bg-gray-800/30 rounded-lg">
                            <div className="text-2xl mb-2">📍</div>
                            <p>Save multiple addresses</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
