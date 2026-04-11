export type NativeStatus = 'success' | 'unsupported' | 'error';

export interface NativeSuccess<T> {
  status: 'success';
  data: T;
  message: string;
}

export interface NativeUnsupported {
  status: 'unsupported';
  message: string;
}

export interface NativeError {
  status: 'error';
  message: string;
  cause?: unknown;
}

export type NativeResult<T> = NativeSuccess<T> | NativeUnsupported | NativeError;

export const nativeSuccess = <T>(data: T, message: string): NativeSuccess<T> => ({
  status: 'success',
  data,
  message
});

export const nativeUnsupported = (message: string): NativeUnsupported => ({
  status: 'unsupported',
  message
});

export const nativeError = (message: string, cause?: unknown): NativeError => ({
  status: 'error',
  message,
  cause
});
