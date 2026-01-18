import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, Edit, Search, Phone, User
} from 'lucide-react';

export default function MembersPage() {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        role: 'SERVITEUR',
        phone: '',
        matricule: ''
    });

    useEffect(() => {
        fetchMembers();
    }, []);

    async function fetchMembers() {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('full_name', { ascending: true });

        if (data) setMembers(data);
        if (error) console.error('Error fetching members:', error);
        setLoading(false);
    }

    async function createMember(e) {
        e.preventDefault();
        if (!formData.full_name.trim()) return;

        // Auto-generate matricule if empty
        let memberData = { ...formData };
        if (!memberData.matricule) {
            const prefix = ROLES[memberData.role]?.prefix || 'MEM';
            const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digits
            memberData.matricule = `${prefix}-${randomSuffix}`;
        }

        const { error } = await supabase
            .from('members')
            .insert([memberData]);

        if (!error) {
            fetchMembers();
            setIsCreating(false);
            setFormData({ full_name: '', role: 'SERVITEUR', phone: '', matricule: '' });
        } else {
            alert('Erreur: ' + error.message);
        }
    }

    async function deleteMember(id) {
        if (!confirm('Supprimer cet intervenant ?')) return;
        await supabase.from('members').delete().eq('id', id);
        fetchMembers();
    }

    const ROLES = {
        'PASTEUR': { label: 'Pasteur', color: 'bg-purple-100 text-purple-700', prefix: 'PAS' },
        'CHANTRE': { label: 'Chantre', color: 'bg-pink-100 text-pink-700', prefix: 'CHA' },
        'MODERATEUR': { label: 'Modérateur', color: 'bg-blue-100 text-blue-700', prefix: 'MOD' },
        'RESPONSABLE': { label: 'Responsable', color: 'bg-blue-100 text-blue-700', prefix: 'RES' },
        'LEADER': { label: 'Leader', color: 'bg-green-100 text-green-700', prefix: 'LEA' },
        'SERVITEUR': { label: 'Serviteur', color: 'bg-gray-100 text-gray-700', prefix: 'SER' },
        'MEDIA': { label: 'Média/Tech', color: 'bg-yellow-100 text-yellow-700', prefix: 'MED' }
    };

    const filteredMembers = members.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.matricule && m.matricule.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-8">
            {/* Top Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-30">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2 text-[#4F46E5] font-bold text-xl">
                        <div className="bg-[#4F46E5] text-white p-1 rounded-md">C</div>
                        Church Event Manager
                    </Link>
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
                        <Link to="/admin" className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">
                            Accueil
                        </Link>
                        <span className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">Modèles</span>
                        <span className="flex items-center gap-2 hover:text-gray-900 cursor-pointer">Activités</span>
                        <span className="flex items-center gap-2 text-gray-900 bg-gray-100 px-3 py-1.5 rounded-full cursor-pointer">
                            <User size={16} /> Intervenants
                        </span>
                    </div>
                </div>
                <button className="flex items-center gap-2 text-gray-600 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                    Mode Tablette
                </button>
            </nav>

            <div className="max-w-7xl mx-auto space-y-8 mt-24">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="text-gray-400 hover:text-gray-600 flex items-center gap-2 transition font-medium">
                            <ArrowLeft size={20} /> Retour Accueil
                        </Link>
                    </div>

                </div>

                <div className="flex justify-between items-end">
                    <h1 className="text-3xl font-extrabold text-gray-900">Gestion des Intervenants</h1>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-200"
                    >
                        <Plus size={20} />
                        <span>Nouveau</span>
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par nom ou matricule..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-4 pl-12 pr-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] shadow-sm"
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Chargement...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredMembers.map(member => (
                            <div key={member.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-gray-200 transition group relative">
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-gray-300 hover:text-[#4F46E5] transition"><Edit size={18} /></button>
                                    <button onClick={() => deleteMember(member.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={18} /></button>
                                </div>

                                <div className="mb-4">
                                    <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${ROLES[member.role]?.color || ROLES['SERVITEUR'].color}`}>
                                        {ROLES[member.role]?.label || member.role}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1">{member.full_name}</h3>
                                <div className="text-xs font-mono text-gray-400 mb-4">{member.matricule || 'N/A'}</div>

                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <Phone size={14} />
                                    <span>{member.phone || 'Non renseigné'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-bold text-gray-900">Nouvel Intervenant</h3>
                            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" size={24} /></button>
                        </div>
                        <form onSubmit={createMember} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nom complet</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none"
                                        placeholder="ex: Jean Dupont"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        autoFocus
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Rôle</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(ROLES).map(([key, val]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: key })}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition text-left
                                                    ${formData.role === key
                                                        ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5]'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                            >
                                                {val.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Téléphone</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none"
                                        placeholder="+225..."
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Matricule (Optionnel)</label>
                                    <input
                                        className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-[#4F46E5] outline-none bg-gray-50 text-gray-500"
                                        placeholder="Généré auto si vide"
                                        value={formData.matricule}
                                        onChange={e => setFormData({ ...formData, matricule: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition">Annuler</button>
                                <button type="submit" className="px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-indigo-700 font-bold transition shadow-lg shadow-indigo-200">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
