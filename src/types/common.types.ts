export type Nullable<T> = T | null;

export type PageParams<T extends Record<string, string> = Record<string, string>> = {
  params: T;
};

export type SearchParams = {
  searchParams?: Record<string, string | string[] | undefined>;
};
