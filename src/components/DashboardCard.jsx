import React from 'react';
import { Link } from 'react-router-dom';

export default function DashboardCard({
    icon: Icon,
    title,
    description,
    accentColor = "bg-blue-600",
    onClick,
    to,
    className = ""
}) {
    const CardContent = () => (
        <div className={`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full transition-all hover:shadow-md ${className}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 ${accentColor}`}>
                <Icon size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
        </div>
    );

    if (to) {
        return <Link to={to} className="block h-full"><CardContent /></Link>;
    }

    return (
        <button onClick={onClick} className="w-full text-left h-full block">
            <CardContent />
        </button>
    );
}
