const API_BASE = window.location.origin;

const api = {
  getToken() {
    return localStorage.getItem('auth_token');
  },

  setToken(token) {
    localStorage.setItem('auth_token', token);
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('auth_user'));
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = 'index.html';
  },

  async request(method, url, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(`${API_BASE}${url}`, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error en la solicitud');
      }
      return data;
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Error de conexión con el servidor');
      }
      throw err;
    }
  },

  get(url) { return this.request('GET', url); },
  post(url, body) { return this.request('POST', url, body); },
  put(url, body) { return this.request('PUT', url, body); },
  patch(url, body) { return this.request('PATCH', url, body); },
  del(url) { return this.request('DELETE', url); },

  auth: {
    login(email, password) {
      return api.post('/api/auth/login', { email, password });
    },
    me() {
      return api.get('/api/auth/me');
    }
  },

  menu: {
    getAll() { return api.get('/api/menu'); },
    getByCategory(category) { return api.get(`/api/menu/${category}`); },
    create(item) { return api.post('/api/menu', item); },
    update(id, item) { return api.put(`/api/menu/${id}`, item); },
    delete(id) { return api.del(`/api/menu/${id}`); }
  },

  tables: {
    getAll() { return api.get('/api/tables'); },
    create(table) { return api.post('/api/tables', table); },
    update(id, table) { return api.put(`/api/tables/${id}`, table); },
    delete(id) { return api.del(`/api/tables/${id}`); }
  },

  orders: {
    getAll() { return api.get('/api/orders'); },
    create(order) { return api.post('/api/orders', order); },
    updateStatus(id, status) { return api.patch(`/api/orders/${id}/status`, { status }); },
    getStats() { return api.get('/api/orders/stats'); }
  },

  billing: {
    getTablesWithBills() { return api.get('/api/billing/tables'); },
    getTableOrders(table) { return api.get(`/api/billing/table/${table}`); },
    pay(table_number) { return api.post('/api/billing/pay', { table_number }); },
    getHistory(params) {
      const qs = new URLSearchParams(params).toString();
      return api.get(`/api/billing/history?${qs}`);
    },
    getHistoryFilters() { return api.get('/api/billing/history/filters'); }
  }
};
