import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseTraceSocketArgs {
  userId: string;
  setQueuedUploads: React.Dispatch<React.SetStateAction<Set<string>>>;
  setQueuedAnalyses: React.Dispatch<React.SetStateAction<Set<string>>>;
  fetchTraces: (opts?: { preserveSelection?: boolean }) => void;
  fetchTraceDetails: (id: string) => void;
  setSelectedTraceId: (id: string) => void;
  setError: (err: string | null) => void;
}

export function useTraceSocket({
  userId,
  setQueuedUploads,
  setQueuedAnalyses,
  fetchTraces,
  fetchTraceDetails,
  setSelectedTraceId,
  setError,
}: UseTraceSocketArgs) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (socketRef.current && (socketRef.current as any)._handlerRegistered) return;
    const socket = io('http://localhost:3000', {
      path: '/socket.io',
      query: { userId },
      transports: ['websocket'],
    });
    socketRef.current = socket;
    (socketRef.current as any)._handlerRegistered = true;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('fileProcessed', (data: any) => {
      if (data && data.jobId && data.status === 'done') {
        setQueuedUploads(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(data.jobId));
          return newSet;
        });
        fetchTraces({ preserveSelection: true });
        setSelectedTraceId(data.jobId);
      }
    });

    socket.on('analysisCompleted', (data: any) => {
      if (data && data.jobId && data.status === 'done') {
        setQueuedAnalyses(prev => {
          const newSet = new Set(prev);
          newSet.delete(String(data.jobId));
          return newSet;
        });
        fetchTraces({ preserveSelection: true });
        fetchTraceDetails(data.jobId);
        setSelectedTraceId(data.jobId);
      }
    });

    socket.on('jobError', (data: {
      jobType: string;
      jobId: string;
      userId: string;
      status: 'error',
      error: string;
      jobCategory: string;
    }) => {
      if (data && data.jobId && data.status === 'error') {
        setError(`${data.error}`);
        if (data.jobCategory === 'analysis') {
          setQueuedAnalyses(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(data.jobId));
            return newSet;
          });
        } else {
          setQueuedUploads(prev => {
            const newSet = new Set(prev);
            newSet.delete(String(data.jobId));
            return newSet;
          });
        }
      }
    });

    return () => {
      socket.disconnect();
      (socketRef.current as any)._handlerRegistered = false;
    };
    // eslint-disable-next-line
  }, [userId, setQueuedUploads, setQueuedAnalyses, fetchTraces, fetchTraceDetails, setSelectedTraceId, setError]);
} 