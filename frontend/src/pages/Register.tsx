import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UnifiedBackground from '@/components/UnifiedBackground';

import { API_BASE_URL } from '@/config';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Auto-login after register
            const user = {
                _id: data._id,
                username: data.username,
                email: data.email
            };
            login(data.token, user);
            navigate('/audit');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <UnifiedBackground>
            <div className="flex items-center justify-center min-h-screen px-4">
                <Card className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border-slate-800 text-slate-100 shadow-2xl shadow-blue-900/10">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Create an Account</CardTitle>
                        <p className="text-center text-slate-400">Join AssureFi to protect your investments</p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="bg-red-900/20 border-red-900/50 text-red-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-300">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="CryptoKing"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="bg-slate-950/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                                disabled={loading}
                            >
                                {loading ? 'Creating Account...' : 'Register'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t border-slate-800 pt-6">
                        <p className="text-sm text-slate-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                                Login
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </UnifiedBackground>
    );
};

export default Register;
