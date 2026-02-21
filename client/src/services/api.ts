import axios from 'axios';
import { getApiBaseUrl } from '../config/environment';

const API = axios.create({
  baseURL: `${getApiBaseUrl()}/api`,
});

// Add token to requests if it exists
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await API.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDocuments = async () => {
  const response = await API.get('/documents');
  return response.data;
};

// Fetch a single document by ID for the Editor
export const getDocumentById = async (id: string) => {
  const response = await API.get(`/documents/${id}`);
  return response.data;
};

// export const saveSignaturePosition = async (data: { documentId: string; x: number; y: number; pageNumber: number }) => {
//   const response = await API.post('/signatures', data);
//   return response.data;
// };

export const getSignaturePosition = async (documentId: string) => {
  const response = await API.get(`/signatures/${documentId}`);
  return response.data;
};

export const signDocument = async (id: string, signatureImage?: string) => {
  // We send the Base64 image string in the body
  const response = await API.post(`/documents/sign/${id}`, { signatureImage });
  return response.data;
};

export const deleteDocument = async (id: string) => {
  const response = await API.delete(`/documents/${id}`);
  return response.data;
};

export const resetDocument = async (id: string) => {
  const response = await API.put(`/documents/${id}/reset`);
  return response.data;
};

export const saveSignaturePosition = async (data: { 
  documentId: string; 
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  signatureImage: string | null; 
  pageNumber: number;
  viewportWidth: number;   // Add this line
  viewportHeight: number;  // Add this line
}) => {
  const response = await API.post('/signatures', data);
  return response.data;
};

export const shareDocument = async (id: string, email: string) => {
  const response = await API.post(`/documents/${id}/share`, { email });
  return response.data;
};

// Add this new function:
export const unlockSharedDocument = async (token: string, accessCode?: string) => {
  const response = await API.post(`/documents/shared/${token}/unlock`, { accessCode });
  return response.data;
};

export const getSharedDocument = async (token: string) => {
  const response = await API.get(`/documents/shared/${token}`);
  return response.data;
};

export const signSharedDocument = async (token: string, signatureImage: string) => {
  const response = await API.post(`/documents/shared/${token}/sign`, { signatureImage });
  return response.data;
};

export const getAuditLogs = async (id: string) => {
  const response = await API.get(`/documents/${id}/audit`);
  return response.data;
};

export const rejectSharedDocument = async (token: string, reason: string) => {
  const response = await API.post(`/documents/shared/${token}/reject`, { reason });
  return response.data;
};

export const requestOTP = async (token: string) => {
  const response = await API.post(`/documents/shared/${token}/request-otp`);
  return response.data;
};

export default API;