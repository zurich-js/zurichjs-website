import { OrganizationSwitcher } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { MessageSquare, BarChart, Users } from 'lucide-react';
import Link from 'next/link';

import Layout from '@/components/layout/Layout';

const adminRoutes = [
    {
        name: 'Feedback Analytics',
        description: 'View and analyze feedback from events, speakers, and talks',
        icon: <BarChart className="w-6 h-6" />,
        href: '/admin/feedback-analytics',
        color: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
    },
    {
        name: 'Feedback Links',
        description: 'Generate and manage feedback links for speakers',
        icon: <MessageSquare className="w-6 h-6" />,
        href: '/admin/feedback-links',
        color: 'bg-green-100 text-green-700 hover:bg-green-200'
    },
    {
        name: 'User Management',
        description: 'View and manage users and their survey information',
        icon: <Users className="w-6 h-6" />,
        href: '/admin/users',
        color: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    },
];

export default function AdminDashboard() {

    return (
        <Layout>

            <div className="container mx-auto px-6 py-20">
                <div className="mb-12">
                    <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
                    <p className="text-gray-600">
                        Welcome to the ZurichJS admin dashboard. Select an organization and choose an admin feature to get started.
                    </p>
                </div>

                {/* Organization List will be rendered here */}
                <div className="mb-12">
                    <h2 className="text-xl font-semibold mb-4">Select Organization</h2>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <OrganizationSwitcher />
                    </div>
                </div>

                {/* Admin Navigation */}
                <div>
                    <h2 className="text-xl font-semibold mb-4">Admin Features</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {adminRoutes.map((route) => (
                            <motion.div
                                key={route.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                            >
                                <Link href={route.href}>
                                    <div className={`p-6 rounded-lg shadow-md ${route.color} transition-all duration-300 hover:shadow-lg`}>
                                        <div className="flex items-center gap-4 mb-4">
                                            {route.icon}
                                            <h3 className="text-lg font-semibold">{route.name}</h3>
                                        </div>
                                        <p className="text-sm opacity-90">{route.description}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}