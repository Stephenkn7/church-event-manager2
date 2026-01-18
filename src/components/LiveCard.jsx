import React, { useState, useEffect } from 'react';
import { Play, Clock, Calendar } from 'lucide-react';
import { format, differenceInSeconds, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function LiveCard({ nextEvent }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!nextEvent) return;

        const interval = setInterval(() => {
            const now = new Date();
            const eventDate = new Date(nextEvent.date);
            const diff = differenceInSeconds(eventDate, now);

            if (diff <= 0) {
                setTimeLeft("C'est l'heure !");
                clearInterval(interval);
                // Auto-open Tablet Mode
                navigate(`/tablet?eventId=${nextEvent.id}`);
            } else {
                const days = Math.floor(diff / (3600 * 24));
                const hours = Math.floor((diff % (3600 * 24)) / 3600);
                const minutes = Math.floor((diff % 3600) / 60);
                const seconds = diff % 60;

                let timeString = "";
                if (days > 0) timeString += `${days}j `;
                timeString += `${hours}h ${minutes}m ${seconds}s`;
                setTimeLeft(timeString);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nextEvent, navigate]);

    if (!nextEvent) {
        return (
            <div className="bg-[#0F172A] rounded-3xl p-8 text-white relative overflow-hidden group cursor-pointer h-full" onClick={() => navigate('/stage')}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 mb-6">
                        <Play size={24} fill="currentColor" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Lancement Live</h3>
                    <p className="text-gray-400 text-sm mb-8">Aucun événement à venir</p>
                    <div className="bg-white/10 rounded-xl p-4 flex items-center gap-4 backdrop-blur-sm border border-white/5">
                        <Clock size={20} className="text-gray-400" />
                        <span className="text-sm text-gray-300">En attente de programmation...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0F172A] rounded-3xl p-8 text-white relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01] h-full" onClick={() => navigate(`/tablet?eventId=${nextEvent.id}`)}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#EF4444]/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center text-white shadow-lg shadow-red-900/20 animate-pulse">
                            <Play size={24} fill="currentColor" />
                        </div>
                        <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-red-200 border border-white/5">
                            Prochain Live
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold mb-1 truncate">{nextEvent.title}</h3>
                    <p className="text-red-200 text-sm mb-6 flex items-center gap-2">
                        <Calendar size={14} />
                        {format(new Date(nextEvent.date), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </p>
                </div>

                <div className="bg-white/10 rounded-xl p-4 flex items-center gap-4 backdrop-blur-sm border border-white/5 mt-auto">
                    <Clock size={20} className="text-[#EF4444]" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Compte à rebours</span>
                        <span className="text-lg font-mono font-bold text-white tabular-nums">{timeLeft || "Calcul..."}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
