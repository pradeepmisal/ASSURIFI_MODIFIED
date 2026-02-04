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

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            const user = {
                _id: data._id,
                username: data.username,
                email: data.email
            };
            login(data.token, user);
            navigate('/audit'); // Redirect to Audit page (first feature)
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
                        <CardTitle className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Login to AssureFi</CardTitle>
                        <p className="text-center text-slate-400">Enter your credentials to access your account</p>
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-slate-300">Password</Label>
                                    <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                                        Forgot password?
                                    </Link>
                                </div>
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
                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                                disabled={loading}
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center border-t border-slate-800 pt-6">
                        <p className="text-sm text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
                                Register
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </UnifiedBackground>
    );
};

export default Login;
