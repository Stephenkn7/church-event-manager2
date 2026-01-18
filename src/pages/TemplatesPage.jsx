import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, LayoutTemplate, Clock, ChevronRight, Edit
} from 'lucide-react';
import TemplateBuilder from '../components/TemplateBuilder';

export default function TemplatesPage() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');

    useEffect(() => {
        if (!editingTemplateId) fetchTemplates();
    }, [editingTemplateId]);

    async function fetchTemplates() {
        setLoading(true);
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('name', { ascending: true });

        if (data) setTemplates(data);
        if (error) console.error('Error fetching templates:', error);
        setLoading(false);
    }

    async function createTemplate(e) {
        e.preventDefault();
        if (!newTemplateName.trim()) return;

        const { data, error } = await supabase
            .from('templates')
            .insert([{ name: newTemplateName, description: newTemplateDesc }])
            .select()
            .single();

        if (!error && data) {
            const defaultItems = [
                { template_id: data.id, title: 'Louange', duration: 1200, type: 'SONG', order_index: 0 },
                { template_id: data.id, title: 'Annonces', duration: 300, type: 'SPEECH', order_index: 1 },
                { template_id: data.id, title: 'Message', duration: 1800, type: 'SPEECH', order_index: 2 }
            ];
            await supabase.from('template_items').insert(defaultItems);

            setIsCreating(false);
            setEditingTemplateId(data.id); // Go directly to edit mode
            setNewTemplateName('');
            setNewTemplateDesc('');
        } else {
            alert('Erreur: ' + error?.message);
        }
    }

    async function deleteTemplate(id) {
        if (!confirm('Supprimer ce modèle ?')) return;
        await supabase.from('templates').delete().eq('id', id);
        fetchTemplates();
    }

    if (editingTemplateId) {
        return <TemplateBuilder templateId={editingTemplateId} onClose={() => setEditingTemplateId(null)} />;
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/admin" className="p-2 hover:bg-white rounded-full transition text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Modèles</h1>
                            <p className="text-gray-500">Gérez les structures types de vos cultes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706] transition shadow-lg shadow-amber-200"
                    >
                        <Plus size={20} />
                        <span>Nouveau Modèle</span>
                    </button>
                </div>

                {/* List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full text-center py-12 text-gray-500">Chargement...</div>
                    ) : templates.map(template => (
                        <div key={template.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full group hover:shadow-md transition relative">
                            <div>
                                <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                                    <LayoutTemplate size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                                <p className="text-gray-500 text-sm line-clamp-2 mb-4">{template.description || "Aucune description"}</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">ACTIONS</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingTemplateId(template.id)}
                                        className="p-2 text-gray-300 hover:text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition"
                                        title="Éditer"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => deleteTemplate(template.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && templates.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                            Aucun modèle créé.
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Nouveau Modèle</h3>
                            <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600"><Plus className="rotate-45" /></button>
                        </div>
                        <form onSubmit={createTemplate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du modèle</label>
                                <input
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                    placeholder="ex: Culte Spécial"
                                    value={newTemplateName}
                                    onChange={e => setNewTemplateName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                    rows="3"
                                    placeholder="Description courte..."
                                    value={newTemplateDesc}
                                    onChange={e => setNewTemplateDesc(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
                                <button type="submit" className="px-4 py-2 bg-[#F59E0B] text-white rounded-lg hover:bg-[#D97706]">Créer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

