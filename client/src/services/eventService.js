import api from './api';

/**
 * Fetch all approved events.
 * @returns {Promise<object>} List of events.
 */
const getApprovedEvents = async (params = {}) => {
  const response = await api.get('/events', { params });
  return response.data;
};

/**
 * Fetch upcoming approved events.
 * @param {number} limit - Maximum number of upcoming events.
 * @returns {Promise<object>} Upcoming events list.
 */
const getUpcomingEvents = async (limit = 3) => {
  const response = await api.get('/events/upcoming', {
    params: { limit },
  });
  return response.data;
};

/**
 * Fetch a single event by ID.
 * @param {string} id - Event ID.
 * @returns {Promise<object>} Event details.
 */
const getEventById = async (id) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

/**
 * Create a new event (Teacher only).
 * @param {object} eventData - Details of the event.
 * @returns {Promise<object>} Created event.
 */
const createEvent = async (eventData) => {
  const config = {};
  if (eventData instanceof FormData) {
    config.headers = { 'Content-Type': 'multipart/form-data' };
  }
  const response = await api.post('/events', eventData, config);
  return response.data;
};

/**
 * Update an existing event (Teacher owner only).
 * @param {string} id - Event ID.
 * @param {object} eventData - New details of the event.
 * @returns {Promise<object>} Updated event.
 */
const updateEvent = async (id, eventData) => {
  const config = {};
  if (eventData instanceof FormData) {
    config.headers = { 'Content-Type': 'multipart/form-data' };
  }
  const response = await api.put(`/events/${id}`, eventData, config);
  return response.data;
};

/**
 * Delete an event (Teacher owner only).
 * @param {string} id - Event ID.
 * @returns {Promise<object>} Action result.
 */
const deleteEvent = async (id) => {
  const response = await api.delete(`/events/${id}`);
  return response.data;
};

/**
 * Approve an event (HOD only).
 * @param {string} id - Event ID.
 * @returns {Promise<object>} Action result.
 */
const approveEvent = async (id) => {
  const response = await api.patch(`/events/${id}/approve`);
  return response.data;
};

/**
 * Reject an event (HOD only).
 * @param {string} id - Event ID.
 * @param {string} rejectionReason - Reason for rejection.
 * @returns {Promise<object>} Action result.
 */
const rejectEvent = async (id, rejectionReason) => {
  const response = await api.patch(`/events/${id}/reject`, { rejectionReason });
  return response.data;
};

/**
 * Get events created by logged-in teacher.
 * @returns {Promise<object>} List of teacher's events.
 */
const getTeacherEvents = async () => {
  const response = await api.get('/events/my');
  return response.data;
};

/**
 * Get events pending HOD approval.
 * @returns {Promise<object>} List of pending events.
 */
const getPendingEvents = async () => {
  const response = await api.get('/events/pending');
  return response.data;
};

const getHODDashboardStats = async () => {
  const response = await api.get('/events/dashboard');
  return response.data;
};

/**
 * Fetch events grouped by department.
 * @param {object} params - Optional query params (status, department).
 * @returns {Promise<object>} Department-wise events.
 */
const getDepartmentWiseEvents = async (params = {}) => {
  const response = await api.get('/events/department-wise', { params });
  return response.data;
};

const getEventRegistrations = async (eventId) => {
  const response = await api.get(`/events/${eventId}/registrations`);
  return response.data;
};

/**
 * Fetch events by category.
 */
const getEventsByCategory = async (category, limit = 3) => {
  const response = await api.get('/events', {
    params: { category, limit, status: 'approved' },
  });
  return response.data;
};

/**
 * Fetch all gallery items.
 */
const getGallery = async (category) => {
  const params = category && category !== 'All' ? { category } : {};
  const response = await api.get('/gallery', { params });
  return response.data;
};

const eventService = {
  getApprovedEvents,
  getUpcomingEvents,
  getEventsByCategory,
  getEventById,
  getEventRegistrations,
  getGallery,
  createEvent,
  updateEvent,
  deleteEvent,
  approveEvent,
  rejectEvent,
  getTeacherEvents,
  getPendingEvents,
  getDepartmentWiseEvents,
  getHODDashboardStats,
};

export default eventService;

