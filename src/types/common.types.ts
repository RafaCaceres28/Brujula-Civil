export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export type PageParams<T extends Record<string, string> = Record<string, string>> = {
  params: T;
};

export type SearchParams = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export type Id = string;
export type ISODateString = string;
