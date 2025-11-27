import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        liveUsers: 0,
        totalConnections: 0,
        activeRooms: 0,
        usersInRooms: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchStats = async () => {
        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL;
            const response = await fetch(`${backendUrl}api/admin/stats`);
            const data = await response.json();
            setStats(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching stats:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-background text-text-primary p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                        Admin Dashboard
                    </h1>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-surface hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors shadow-sm text-text-primary"
                    >
                        Back to Home
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Live Connections"
                            value={stats.liveUsers}
                            icon="🟢"
                            color="text-accent"
                        />
                        <StatCard
                            title="Total Connections"
                            value={stats.totalConnections}
                            icon="📈"
                            color="text-primary"
                            subtitle="(Since Server Start)"
                        />
                        <StatCard
                            title="Active Rooms"
                            value={stats.activeRooms}
                            icon="🚪"
                            color="text-purple-500"
                        />
                        <StatCard
                            title="Users in Rooms"
                            value={stats.usersInRooms}
                            icon="👥"
                            color="text-yellow-500"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-surface rounded-xl p-6 border border-gray-200 shadow-lg hover:shadow-xl hover:border-primary/30 transition-all">
        <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-background rounded-lg text-2xl">
                {icon}
            </div>
            <div className={`text-4xl font-bold ${color}`}>
                {value}
            </div>
        </div>
        <h3 className="text-gray-500 font-medium text-lg">{title}</h3>
        {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
    </div>
);

export default AdminDashboard;
