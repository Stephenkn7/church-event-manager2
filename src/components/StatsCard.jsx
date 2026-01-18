import React from 'react';

export default function StatsCard({ icon: Icon, value, label, subtext, color = "text-blue-600", bgColor = "bg-blue-50" }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start justify-between min-h-[160px]">
            <div>
                <div className={`p-3 rounded-xl w-fit mb-4 ${bgColor} ${color}`}>
                    <Icon size={24} />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-1">{value}</div>
                <div className="text-sm font-medium text-gray-600">{label}</div>
                {subtext && <div className="text-xs text-gray-400 mt-2">{subtext}</div>}
            </div>
        </div>
    );
}
