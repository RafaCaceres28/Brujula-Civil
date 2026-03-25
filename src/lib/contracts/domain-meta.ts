export type DomainMeta = {
  requestId?: string;
  timestamp: string;
  source: string;
  traceability?: {
    selectedRouteId?: string;
    selectedRouteFitLabel?: 'alto' | 'medio' | 'exploratorio';
    previewVersionId?: string;
    documentId?: string;
  };
};
