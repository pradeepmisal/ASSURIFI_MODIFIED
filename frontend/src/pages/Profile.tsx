import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  User,
  Mail,
  Shield,
  Bell,
  Wallet,
  UploadCloud,
  Camera,
  CheckCircle,
  LogOut
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Profile = () => {
  const { user } = useAuth();

  const [formState, setFormState] = useState({
    name: user?.username || "Alex Johnson",
    email: user?.email || "alex.johnson@example.com",
    bio: "Blockchain developer and DeFi security researcher with 5+ years of experience in smart contract auditing.",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    notifySecurityAlerts: true,
    notifyPortfolioChanges: true,
    notifyMarketUpdates: false,
    notifyNewFeatures: true,
    address: "0xDe34...8b24"
  });

  useEffect(() => {
    if (user) {
      setFormState(prev => ({
        ...prev,
        name: user.username || prev.name,
        email: user.email || prev.email
      }));
    }
  }, [user]);


  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "User Profile - AssureFi Guardian";
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved successfully.",
      });
    }, 1000);
  };

  const handlePasswordChange = () => {
    if (!formState.currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }
    if (formState.newPassword !== formState.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (formState.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setFormState(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
    }, 1000);
  };

  return (
    <DashboardLayout title="Profile Settings" description="Manage your account settings and preferences">
      <motion.div
        className="grid gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1 mb-6">
            <TabsTrigger value="profile" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Profile</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Security</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Notifications</TabsTrigger>
            <TabsTrigger value="wallets" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400">Wallets</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="glass-card">
              <div className="border-b border-white/10 px-6 pt-6 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-400" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Personal Information</h2>
                    <p className="text-sm text-gray-400">Manage your personal details and account information</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  disabled={isSaving}
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </div>

              <div className="px-6 pb-8 pt-6">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="md:w-1/3 flex flex-col items-center gap-4">
                    <div className="relative group">
                      <div className="h-32 w-32 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center">
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-16 w-16 text-slate-500" />
                        )}
                      </div>
                      {isEditing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <label htmlFor="profile-image" className="cursor-pointer flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors">
                            <Camera className="h-5 w-5 text-white" />
                            <input
                              type="file"
                              id="profile-image"
                              className="hidden"
                              accept="image/*"
                              onChange={handleProfileImageChange}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-white">{formState.name}</h3>
                      <p className="text-sm text-gray-400">{formState.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/20">Premium User</Badge>
                      <Badge variant="outline" className="text-green-400 border-green-400/30 bg-green-400/10 hover:bg-green-400/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                  </div>

                  <div className="md:w-2/3 space-y-5">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-200">Full Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formState.name}
                          onChange={handleChange}
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-white/5 border-transparent text-gray-300 pointer-events-none" : "bg-white/5 border-white/10 text-white focus:border-blue-500"}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-200">Email Address</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formState.email}
                          onChange={handleChange}
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-white/5 border-transparent text-gray-300 pointer-events-none" : "bg-white/5 border-white/10 text-white focus:border-blue-500"}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio" className="text-gray-200">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formState.bio}
                          onChange={handleChange}
                          readOnly={!isEditing}
                          className={!isEditing ? "bg-white/5 border-transparent text-gray-300 resize-none h-24 pointer-events-none" : "bg-white/5 border-white/10 text-white focus:border-blue-500 resize-none h-24"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {isEditing && (
                <div className="justify-end border-t border-white/10 p-4 flex">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSaving ? "Saving Changes..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="glass-card">
              <div className="border-b border-white/10 px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Security Settings</h2>
                </div>
                <p className="text-sm text-gray-400 mt-1">Manage your password and account security options</p>
              </div>
              <div className="px-6 pb-8 pt-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Change Password</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type="password"
                        value={formState.currentPassword}
                        onChange={handleChange}
                        placeholder="Enter your current password"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          value={formState.newPassword}
                          onChange={handleChange}
                          placeholder="Enter new password"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={formState.confirmPassword}
                          onChange={handleChange}
                          placeholder="Confirm new password"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      className="w-full md:w-auto md:self-end bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isSaving}
                    >
                      {isSaving ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <div className="font-medium text-white">Protect your account with 2FA</div>
                      <div className="text-sm text-gray-400">
                        Add an extra layer of security to your account
                      </div>
                    </div>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 bg-transparent">Enable 2FA</Button>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Session Management</h3>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-white">Current Session</div>
                        <div className="text-sm text-gray-400">
                          Chrome on Windows • IP: 192.168.1.1
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Last active: {new Date().toLocaleString()}
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Active Now</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 bg-transparent">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out All Other Sessions
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="glass-card">
              <div className="border-b border-white/10 px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                </div>
                <p className="text-sm text-gray-400 mt-1">Choose what updates you want to receive and how</p>
              </div>
              <div className="px-6 pb-8 pt-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Security Notifications</h3>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <div className="font-medium text-white">Security Alerts</div>
                      <div className="text-sm text-gray-400">
                        Get notified about important security issues
                      </div>
                    </div>
                    <Switch
                      checked={formState.notifySecurityAlerts}
                      onCheckedChange={(checked) => handleSwitchChange('notifySecurityAlerts', checked)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Portfolio & Market Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <div className="font-medium text-white">Portfolio Changes</div>
                        <div className="text-sm text-gray-400">
                          Notify when wallet value changes significantly
                        </div>
                      </div>
                      <Switch
                        checked={formState.notifyPortfolioChanges}
                        onCheckedChange={(checked) => handleSwitchChange('notifyPortfolioChanges', checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                      <div>
                        <div className="font-medium text-white">Market Updates</div>
                        <div className="text-sm text-gray-400">
                          Receive major market movement alerts
                        </div>
                      </div>
                      <Switch
                        checked={formState.notifyMarketUpdates}
                        onCheckedChange={(checked) => handleSwitchChange('notifyMarketUpdates', checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/10 my-4" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Platform Updates</h3>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <div className="font-medium text-white">New Features</div>
                      <div className="text-sm text-gray-400">
                        Be the first to know about new platform features
                      </div>
                    </div>
                    <Switch
                      checked={formState.notifyNewFeatures}
                      onCheckedChange={(checked) => handleSwitchChange('notifyNewFeatures', checked)}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                </div>
              </div>
              <div className="justify-end border-t border-white/10 p-4 flex">
                <Button
                  onClick={() => {
                    toast({
                      title: "Preferences Saved",
                      description: "Your notification preferences have been updated.",
                    });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save Preferences
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets">
            <div className="glass-card">
              <div className="border-b border-white/10 px-6 pt-6 pb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Connected Wallets</h2>
                </div>
                <p className="text-sm text-gray-400 mt-1">Manage wallets connected to your AssureFi account</p>
              </div>
              <div className="px-6 pb-8 pt-6 space-y-6">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">MetaMask</div>
                        <div className="text-sm font-mono text-gray-400">{formState.address}</div>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Primary</Badge>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 bg-transparent">Disconnect</Button>
                    <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 bg-transparent">View on Etherscan</Button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/20 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <UploadCloud className="h-10 w-10 text-gray-500 mb-4" />
                  <h3 className="font-medium mb-2 text-white">Connect Another Wallet</h3>
                  <p className="text-sm text-gray-400 text-center mb-4 max-w-sm">
                    Add more wallets to monitor and protect your assets across multiple addresses
                  </p>
                  <Button className="bg-white text-black hover:bg-gray-200">Connect Wallet</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
