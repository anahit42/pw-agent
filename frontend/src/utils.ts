export interface TraceFile {
  id: string;
  originalFileName: string;
  originalZipPath: string;
  uploadedAt?: string;
  size?: number;
  _count?: {
    analyses: number;
  };
}

export interface DateGroup {
  date: string;
  label: string;
  traces: TraceFile[];
}

export const groupTracesByDate = (traces: TraceFile[]): DateGroup[] => {
  const groups: { [key: string]: TraceFile[] } = {};

  traces.forEach(trace => {
    const date = trace.uploadedAt ? new Date(trace.uploadedAt) : new Date();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;

    if (date.toDateString() === today.toDateString()) {
      groupKey = 'today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'yesterday';
    } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
      groupKey = 'this-week';
    } else if (date.getTime() > today.getTime() - 30 * 24 * 60 * 60 * 1000) {
      groupKey = 'this-month';
    } else {
      groupKey = 'older';
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(trace);
  });

  // Convert to array and sort by date
  const groupOrder = ['today', 'yesterday', 'this-week', 'this-month', 'older'];
  return groupOrder
    .filter(key => groups[key] && groups[key].length > 0)
    .map(key => ({
      date: key,
      label: key === 'today' ? 'Today' :
             key === 'yesterday' ? 'Yesterday' :
             key === 'this-week' ? 'This week' :
             key === 'this-month' ? 'This month' : 'Older',
      traces: groups[key].sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt) : new Date(0);
        const dateB = b.uploadedAt ? new Date(b.uploadedAt) : new Date(0);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      })
    }));
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}; 