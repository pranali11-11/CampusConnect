import api from './api';

/**
 * Register student for an event.
 * @param {string} eventId - Event ID.
 * @returns {Promise<object>} Created registration.
 */
const registerForEvent = async (eventId) => {
  const response = await api.post('/registrations', { eventId });
  return response.data;
};

/**
 * Fetch registrations of the logged-in student.
 * @returns {Promise<object>} List of registrations.
 */
const getStudentRegistrations = async () => {
  const response = await api.get('/registrations/my');
  return response.data;
};

/**
 * Get registered participant list for an event (Teacher/HOD).
 * @param {string} eventId - Event ID.
 * @returns {Promise<object>} List of participants.
 */
const getEventParticipants = async (eventId) => {
  const response = await api.get(`/registrations/${eventId}/list`);
  return response.data;
};

/**
 * Mark student attendance (Teacher/HOD).
 * @param {string} registrationId - Registration ID.
 * @param {string} status - 'present' or 'absent'.
 * @returns {Promise<object>} Attendance result.
 */
const markAttendance = async (registrationId, status) => {
  const response = await api.post('/attendance/mark', { registrationId, status });
  return response.data;
};

/**
 * Bulk mark attendance
 * @param {Array} attendanceList - [{ registrationId, status }]
 */
const markAttendanceBulk = async (attendanceList) => {
  const response = await api.post('/attendance/mark', { attendanceList });
  return response.data;
};

/**
 * Get attendance records for an event (Teacher/HOD).
 * @param {string} eventId - Event ID.
 * @returns {Promise<object>} Attendance log.
 */
const getEventAttendance = async (eventId) => {
  const response = await api.get(`/attendance/${eventId}`);
  return response.data;
};

/**
 * Get current user notifications.
 * @returns {Promise<object>} List of notifications.
 */
const getMyNotifications = async () => {
  const response = await api.get('/notifications/my');
  return response.data;
};

/**
 * Mark all notifications as read.
 * @returns {Promise<object>} Action result.
 */
const readAllNotifications = async () => {
  const response = await api.patch('/notifications/read-all');
  return response.data;
};

/**
 * Upload event photo to gallery (Multipart/Form-Data).
 * @param {string} eventId - Event ID.
 * @param {string} category - Image category.
 * @param {File} imageFile - The file to upload.
 * @returns {Promise<object>} Uploaded gallery item.
 */
const uploadGallery = async (eventId, category, imageFile) => {
  const formData = new FormData();
  formData.append('eventId', eventId);
  formData.append('category', category);
  formData.append('image', imageFile);

  const response = await api.post('/gallery/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get gallery images for a specific event.
 * @param {string} eventId - Event ID.
 * @returns {Promise<object>} List of gallery items.
 */
const getEventGallery = async (eventId) => {
  const response = await api.get(`/gallery/${eventId}`);
  return response.data;
};

const getMyGallery = async () => {
  const response = await api.get('/gallery/my/list');
  return response.data;
};

const deleteGalleryItem = async (id) => {
  const response = await api.delete(`/gallery/${id}`);
  return response.data;
};

/**
 * Submit contact inquiry form.
 * @param {object} contactData - Form values { name, email, subject, message }.
 * @returns {Promise<object>} Submission details.
 */
const submitContact = async (contactData) => {
  const response = await api.post('/contact', contactData);
  return response.data;
};

/**
 * Get current student certificates.
 * @returns {Promise<object>} List of certificates.
 */
const getMyCertificates = async () => {
  const response = await api.get('/certificates/my');
  return response.data;
};

/**
 * Get specific certificate by ID.
 * @param {string} id - Certificate ID.
 * @returns {Promise<object>} Certificate details.
 */
const getCertificateById = async (id) => {
  const response = await api.get(`/certificates/${id}`);
  return response.data;
};

const registrationService = {
  registerForEvent,
  getStudentRegistrations,
  getEventParticipants,
  markAttendance,
  getEventAttendance,
  getMyNotifications,
  readAllNotifications,
  uploadGallery,
  getEventGallery,
  getMyGallery,
  deleteGalleryItem,
  submitContact,
  getMyCertificates,
  getCertificateById,
  markAttendanceBulk,
  
};

export default registrationService;
