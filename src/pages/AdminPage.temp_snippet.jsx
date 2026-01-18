
function openCreateModal() {
    // Set date to Now + 5 min
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setNewDate(localIso);

    setIsCreating(true);
}
