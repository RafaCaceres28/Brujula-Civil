export type DomainMeta = {
  requestId?: string;
  timestamp: string;
  source: string;
  traceability?: {
    selectedRouteId?: string;
    previewVersionId?: string;
    documentId?: string;
  };
};
