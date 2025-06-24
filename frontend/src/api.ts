export const API_BASE = '/api/traces';

export async function fetchTraces() {
  const res = await fetch(`${API_BASE}?page=1&limit=50`);
  if (!res.ok) throw new Error('Failed to fetch trace files');
  return res.json();
}

export async function fetchTraceDetails(id: string) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) throw new Error('Failed to fetch trace details');
  return res.json();
}

export async function fetchAnalysisStatus(id: string) {
  const res = await fetch(`/api/traces/${id}/analysis-status`);
  if (!res.ok) throw new Error('Failed to fetch analysis status');
  return res.json();
}

export async function uploadTrace(file: File) {
  const formData = new FormData();
  formData.append('trace', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  const responseData = await res.json();
  if (!res.ok) throw new Error(responseData.error || 'Upload failed');
  return responseData;
}

export async function analyzeTrace(traceId: string) {
  const response = await fetch(`/api/traces/${traceId}/analyze`, {
    method: 'POST',
  });
  const responseData = await response.json();
  if (!response.ok) throw new Error(responseData.error || 'Failed to analyze trace');
  return responseData;
}

export async function deleteTrace(traceId: string) {
  const response = await fetch(`/api/traces/${traceId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to delete trace');
  }
  return true;
} 