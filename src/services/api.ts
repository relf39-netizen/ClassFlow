const API_BASE = '/api';

export const api = {
  get: async (entity: string) => {
    const res = await fetch(`${API_BASE}/${entity}`);
    return res.json();
  },
  post: async (entity: string, data: any) => {
    const res = await fetch(`${API_BASE}/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (entity: string, id: string) => {
    const res = await fetch(`${API_BASE}/${entity}/${id}`, {
      method: 'DELETE',
    });
    return res.json();
  },
  // Specialized
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },
  saveSettings: async (id: string, value: any) => {
    return api.post('settings', { id, value });
  },
  getSchedule: async () => {
    const res = await fetch(`${API_BASE}/schedule/latest`);
    return res.json();
  },
  saveSchedule: async (data: any) => {
    return api.post('schedule', data);
  }
};
