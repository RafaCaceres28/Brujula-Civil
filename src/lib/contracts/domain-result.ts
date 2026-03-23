import type { DomainError } from './domain-error';
import type { DomainMeta } from './domain-meta';

export type DomainSuccess<TData> = {
  ok: true;
  data: TData;
  meta?: DomainMeta;
};

export type DomainFailure<TError extends DomainError = DomainError> = {
  ok: false;
  error: TError;
  meta?: DomainMeta;
};

export type DomainResult<TData, TError extends DomainError = DomainError> =
  | DomainSuccess<TData>
  | DomainFailure<TError>;

export const domainSuccess = <TData>(data: TData, meta?: DomainMeta): DomainSuccess<TData> => ({
  ok: true,
  data,
  ...(meta ? { meta } : {}),
});

export const domainFailure = <TError extends DomainError>(
  error: TError,
  meta?: DomainMeta,
): DomainFailure<TError> => ({
  ok: false,
  error,
  ...(meta ? { meta } : {}),
});

export const isDomainSuccess = <TData, TError extends DomainError>(
  result: DomainResult<TData, TError>,
): result is DomainSuccess<TData> => {
  return result.ok;
};

export const isDomainFailure = <TData, TError extends DomainError>(
  result: DomainResult<TData, TError>,
): result is DomainFailure<TError> => {
  return !result.ok;
};
