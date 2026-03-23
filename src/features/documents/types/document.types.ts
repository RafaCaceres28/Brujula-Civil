import type { DomainError, DomainResult } from '../../../lib/contracts/index';
import type {
  PdfFormat,
  PdfGenerationInput,
  PdfGenerationOutput,
  PdfGenerationStatus,
} from '../schemas/document.schema';

export type DocumentsContractVersion = `${number}.${number}.${number}`;

export type DocumentsDomainInput = PdfGenerationInput;

export type DocumentsDomainOutput = PdfGenerationOutput;

export type DocumentsDomainError = DomainError;

export type DocumentsDomainResult = DomainResult<DocumentsDomainOutput, DocumentsDomainError>;

export type SupportedDocumentFormat = PdfFormat;

export type DocumentGenerationStatus = PdfGenerationStatus;
