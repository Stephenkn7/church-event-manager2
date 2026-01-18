import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Plus, Search, List, Trash2
} from 'lucide-react';

export default function ActivitiesPage() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'GENERIC',
        default_duration: 300
    });

    useEffect(() => {
        fetchActivities();
    }, []);

    async function fetchActivities() {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('title', { ascending: true });

        if (data) setActivities(data);
        setLoading(false);
    }

    async function createActivity(e) {
        e.preventDefault();
        if (!formData.title.trim()) return;

        const { error } = await supabase
            .from('activities')
            .insert([formData]);

        if (!error) {
            fetchActivities();
            setIsCreating(false);
            setFormData({ title: '', type: 'GENERIC', default_duration: 300 });
        } else {
            alert('Erreur: ' + error.message);
        }
    }

    async function deleteActivity(id) {
        if (!confirm('Supprimer cette activité ?')) return;
        await supabase.from('activities').delete().eq('id', id);
        fetchActivities();
    }

    const filteredActivities = activities.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-8">
            {/* Nav */}
            <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-30">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 text-[#4F46E5] font-bold text-xl">
                        <div className="bg-[#4F46E5] text-white p-1 rounded-md">C</div>
                        Church Event Manager
                    </Link>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
                        <Link to="/admin" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">Accueil</Link>
                        <Link to="/templates" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">Modèles</Link>
                        <span className="flex items-center gap-2 text-gray-900 bg-gray-100 px-3 py-1.5 rounded-full cursor-pointer">
                            <List size={16} /> Activités
                        </span>
                        <Link to="/members" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">Intervenants</Link>
                    </div>
                </div>
                <button className="flex items-center gap-2 text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                    Mode Tablette
                </button>
            </nav>

            <div className="max-w-4xl mx-auto space-y-8 mt-24">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/admin" className="text-gray-400 hover:text-gray-600 flex items-center gap-2 transition font-medium">
                        <ArrowLeft size={20} /> Retour Accueil
                    </Link>
                </div>

                <div className="flex justify-between items-end">
                    <h1 className="text-3xl font-extrabold text-gray-900">Section d'Événement</h1>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} />
                        <span>Nouvelle Activité</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher une activité..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] shadow-sm"
                    />
                </div>

                {/* List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Chargement...</div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredActivities.map(activity => (
                                <div key={activity.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 text-[#4F46E5] rounded-xl flex items-center justify-center">
                                            <List size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{activity.title}</h3>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                                                <span>{Math.round(activity.default_duration / 60)} MIN</span>
                                                <span>•</span>
                                                <span>{activity.type === 'SONG' ? 'CHANT' : activity.type === 'SPEECH' ? 'PAROLE' : 'GÉNÉRIQUE'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteActivity(activity.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                            {filteredActivities.length === 0 && (
                                <div className="p-12 text-center text-gray-400">Aucune activité trouvée.</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Nouvelle Activité</h3>
                            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24} /></button>
                        </div>
                        <form onSubmit={createActivity} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Titre</label>
                                <input
                                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none"
                                    placeholder="ex: Méditation"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Durée (min)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none"
                                        value={formData.default_duration / 60}
                                        onChange={e => setFormData({ ...formData, default_duration: e.target.value * 60 })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                                    <select
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none bg-white"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="GENERIC">Générique</option>
                                        <option value="SONG">Chant</option>
                                        <option value="SPEECH">Parole</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">Annuler</button>
                                <button type="submit" className="px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-200">Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
